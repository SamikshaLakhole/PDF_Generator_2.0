const XlsxPopulate = require("xlsx-populate");
const TemplateModel = require("../Model/TemplateModel");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { exec } = require("child_process");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const constants = require("./Constants");
const EmailTriggerQueries = require("../Model/GenerateDocumentModel");

class GenerateDocumentService {
  static GENERATED_DIR = path.resolve(__dirname, "..", "Generated_Documents");
  static WORD_OUTPUT_DIR = path.join(GenerateDocumentService.GENERATED_DIR, "word");
  static PDF_OUTPUT_DIR = path.join(GenerateDocumentService.GENERATED_DIR, "pdf");

  constructor(userEmail) {
    this.currentUserEmail = userEmail;
  
    console.log("GenerateDocumentService initialized", GenerateDocumentService.GENERATED_DIR);
    if (!fs.existsSync(GenerateDocumentService.GENERATED_DIR)) {
      fs.mkdirSync(GenerateDocumentService.GENERATED_DIR, { recursive: true });
    }
    this.activeChildProcesses = new Map();
    this.tempFiles = new Map();
    this.processingOutputNames = new Map();
  }
  

  // Initialize tracking for a new process
  initializeProcessTracking(processingId) {
    if (!this.tempFiles.has(processingId)) {
      this.tempFiles.set(processingId, []);
    }
    if (!this.activeChildProcesses.has(processingId)) {
      this.activeChildProcesses.set(processingId, []);
    }
    if (!this.processingOutputNames.has(processingId)) {
      this.processingOutputNames.set(processingId, []);
    }
  }

  // Check if a process was cancelled
  isProcessCancelled(processingId) {
    const isCancelled =
      global.cancelledProcesses && global.cancelledProcesses.has(processingId);
    return isCancelled;
  }

  // Email validation function
  validateEmail(email, employeeId) {
    if (!email || email.trim() === "") {
      return null;
    }
    // Basic email format validation
    const emailRegex = /^[a-zA-Z.]+@[a-zA-Z.]+\.[a-zA-Z]+$/;
    if (!emailRegex.test(email)) {
      return `Invalid email format for Employee ${employeeId}: ${email}. Only letters and dots are allowed.`;
    }

    return null;
  }

  // Process Excel file: read data, generate PDFs and email template
  async processExcelAndGenerateDocuments(file, password = null, processingId) {
    this.initializeProcessTracking(processingId);
    const hub = global.app?.get("documentGenerationHub");
    const emailTriggerId = await this.recordUploadInEmailTrigger(
      this.currentUserEmail,
      file.originalname
    );
    

    // Validate Excel file
    let workbook;
    try {
      workbook = await XlsxPopulate.fromDataAsync(file.buffer, { password });
    } catch (error) {
      const errorMsg =
        "Failed to open the Excel file. Incorrect password or unsupported format.";
      if (hub) {
        hub.documentError(processingId, { message: errorMsg });
      }
      throw new Error(errorMsg);
    }

    // Extract data from Excel
    const sheet = workbook.sheet(0);
    const rows = sheet.usedRange().value();
    const headers = rows.shift().map((h) => h.toString().trim());

    // Ensure reason column exists
    if (
      !headers.includes("Reason ( Delete this column while uploading Excel )")
    ) {
      headers.push("Reason ( Delete this column while uploading Excel )");
    }

    // Check if email field exists
    if (!headers.includes(constants.emailField)) {
      const errorMsg = `Missing ${constants.emailField} column in Excel file`;
      if (hub) {
        hub.documentError(processingId, { message: errorMsg });
      }
      throw new Error(errorMsg);
    }

    // Prepare for document generation
    const requiredFields = headers.filter(
      (h) => h !== "Reason ( Delete this column while uploading Excel )"
    );
    const generatedFiles = [];
    const errors = [];
    const failedRows = [];
    const successfulRowIndices = [];
    const processedEmployeeNumbers = new Set();

    // Update progress
    if (hub) {
      hub.updateGenerationProgress(processingId, {
        total: rows.length,
        processed: 0,
        success: 0,
        failed: 0,
        stage: "Starting document generation",
      });
    }

    // Process each row in the Excel file
    for (let i = 0; i < rows.length; i++) {
      if (this.isProcessCancelled(processingId)) {
        throw new Error("Document generation was cancelled by user request");
      }

      const row = rows[i];
      const rowData = {};
      headers.forEach((header, index) => {
        rowData[header] = index < row.length ? row[index] : "";
      });

      const employeeId = rowData[constants.employeeNumberField] || "Unknown";

      // Create system filename for database tracking
      const systemFileName = this.createSafeFileName({
        Employee_Number: rowData[constants.employeeNumberField] || "Unknown",
        First_Name: rowData[constants.firstNameField] || "Unknown",
        Last_Name: rowData[constants.lastNameField] || "Unknown",
      });
      let templateId = null;

      // Update progress
      if (hub) {
        hub.updateGenerationProgress(processingId, {
          currentDocument: `Processing document for Employee ${employeeId}`,
          processedCount: i + 1,
          total: rows.length,
          stage: "Validating data",
        });
      }

      try {
        if (
          rowData[constants.templateNameField] &&
          rowData[constants.templateNameField].toString().trim() !== ""
        ) {
          const template = await TemplateModel.getTemplateByTitle(
            rowData[constants.templateNameField]
          );
          if (template) {
            templateId = template.id;
          }
        }

        // Record entry as pending in database BEFORE validation
        if (templateId) {
          console.log(
            `Recording entry in Email_Trigger_Extension for Employee ${employeeId}`
          );
          await this.addToEmailTriggerExtension({
            email_trigger_id: emailTriggerId,
            template_id: templateId,
            generated_pdfName: `${systemFileName}.pdf`,
            Document_Process_Status_id: 1,
          });
          console.log(
            `Recorded entry in Email_Trigger_Extension for Employee ${employeeId}`
          );
        }

        // Validate row data
        const validationErrors = this.validateRowData(
          rowData,
          employeeId,
          processedEmployeeNumbers,
          requiredFields
        );

        if (validationErrors.length > 0) {
          throw new Error(validationErrors.join(" | "));
        }

        // Check for cancellation before generating document
        if (this.isProcessCancelled(processingId)) {
          throw new Error("Document generation was cancelled by user request");
        }

        // Generate document
        if (hub) {
          hub.updateGenerationProgress(processingId, {
            stage: `Generating document for Employee ${employeeId}`,
          });
        }

        // Get template
        const template = await TemplateModel.getTemplateByTitle(
          rowData[constants.templateNameField]
        );
        if (!template) {
          throw new Error(
            `Template '${rowData[constants.templateNameField]
            }' not found in database`
          );
        }

        // Check if email template path exists in the template object
        if (!template.email_template_path) {
          throw new Error(
            `Email template path is not defined for template '${rowData[constants.templateNameField]
            }'`
          );
        }

        const projectRoot = path.resolve(__dirname, "../..");
        const emailTemplatePath = path.join(
          projectRoot,
          template.email_template_path
        );
        let emailTemplateContent;
        try {
          emailTemplateContent = fs.readFileSync(emailTemplatePath, "utf-8");
        } catch (error) {
          throw new Error(
            `Email template file for '${rowData[templateNameField]}' not found`
          );
        }
        emailTemplateContent = this.replacePlaceholdersInString(
          emailTemplateContent,
          rowData
        );

        // Generate PDF
        const pdfPath = await this.processRowData(
          rowData,
          processingId,
          emailTriggerId
        );

        // Save email template
        const emailTemplateOutputDirectory = path.join(
          GenerateDocumentService.GENERATED_DIR,
          "template"
        );
        const emailName = this.createSafeFileName(rowData);
        const emailFilePath = path.join(
          emailTemplateOutputDirectory,
          `${emailName}.txt`
        );
        fs.writeFileSync(emailFilePath, emailTemplateContent);

        if (this.tempFiles.has(processingId)) {
          this.tempFiles.get(processingId).push(emailFilePath);
        }

        // Store generated file info
        const documentInfo = {
          pdfPath,
          emailTemplate: emailTemplateContent,
          to: rowData[constants.emailField],
          clientFileName: `${rowData[constants.firstNameField]}_${rowData[constants.lastNameField]
            }.pdf`,
        };

        generatedFiles.push(documentInfo);
        successfulRowIndices.push(i);

        // Notify success
        if (hub) {
          hub.documentGenerated(processingId, {
            name: path.basename(pdfPath),
            employee: `${rowData[constants.firstNameField]} ${rowData[constants.lastNameField]
              }`,
            employeeNumber: rowData[constants.employeeNumberField],
          });
        }
      } catch (error) {
        // Handle cancellation
        if (this.isProcessCancelled(processingId)) {
          throw error;
        }

        // Update database to failed status if we have templateId
        if (templateId) {
          try {
            await this.addToEmailTriggerExtension({
              email_trigger_id: emailTriggerId,
              template_id: templateId,
              generated_pdfName: `${systemFileName}.pdf`,
              Document_Process_Status_id: 3, // 3 = failed
            });
          } catch (dbError) {
            console.error(
              `Failed to update database status for failed row: ${dbError.message}`
            );
          }
        }

        // Handle row errors
        const rowWithReason = [...row];
        const reasonIndex = headers.indexOf(
          "Reason ( Delete this column while uploading Excel )"
        );
        rowWithReason[reasonIndex] = error.message;

        failedRows.push(rowWithReason);
        errors.push({ message: error.message, row: rowData });

        // Notify error
        if (hub) {
          hub.documentError(processingId, {
            message: error.message,
            employee: this.formatEmployeeName(rowData),
          });
        }
      }

      // Update progress after each document
      if (hub) {
        hub.updateGenerationProgress(processingId, {
          total: rows.length,
          processed: i + 1,
          success: successfulRowIndices.length,
          failed: errors.length,
          stage: "Processing documents",
        });
      }
    }

    // Check for cancellation before creating error report
    if (this.isProcessCancelled(processingId)) {
      throw new Error("Document generation was cancelled by user request");
    }

    // Create error report
    let errorReport = null;
    if (errors.length > 0) {
      if (hub) {
        hub.updateGenerationProgress(processingId, {
          stage: "Generating error report",
        });
      }

      errorReport = await this.createErrorReport(
        headers,
        failedRows,
        processingId,
        password
      );
    }

    // Generate summary
    const summary = {
      total: rows.length,
      success: successfulRowIndices.length,
      failed: errors.length,
    };
    this.activeChildProcesses.delete(processingId);

    // Notify completion
    if (hub) {
      hub.generationCompleted(processingId, {
        summary,
        errorReport,
      });
    }

    return {
      generatedFiles,
      errors,
      errorReport,
      summary,
    };
  }

  // Clean up Cancelled Process method
  async cleanupCancelledProcess(processingId) {
    try {
      if (this.activeChildProcesses.has(processingId)) {
        const processes = this.activeChildProcesses.get(processingId);
        for (const childProcess of processes) {
          try {
            if (childProcess && childProcess.pid) {
              process.kill(childProcess.pid, "SIGTERM");
            }
          } catch (killError) {
            console.error(`Error killing process: ${killError.message}`);
          }
        }
        this.activeChildProcesses.delete(processingId);
      }

      // Clean up all temporary files
      this.cleanupFilesForProcess(processingId);
      this.tempFiles.delete(processingId);
      this.processingOutputNames.delete(processingId);

      return true;
    } catch (err) {
      console.error(`Error during cleanup for process ${processingId}:`, err);
      throw err;
    }
  }

  cleanupFilesForProcess(processingId) {
    if (this.tempFiles.has(processingId)) {
      const files = this.tempFiles.get(processingId);
      for (const file of files) {
        if (file) {
          if (file.endsWith(".pdf")) {
            const emailPath = file.replace(/\.pdf$/, ".txt");
            this.deleteFileIfExists(emailPath);
          }
          this.deleteFileIfExists(file);
        }
      }
    }

    const generatedDir = GenerateDocumentService.GENERATED_DIR;
    try {
      const files = fs.readdirSync(generatedDir);
      for (const file of files) {
        if (file.includes(processingId)) {
          const fullPath = path.join(generatedDir, file);
          this.deleteFileIfExists(fullPath);
        }
      }
    } catch (err) {
      console.error(
        `Error scanning directory for process files: ${err.message}`
      );
    }

    if (this.processingOutputNames.has(processingId)) {
      for (const outputName of this.processingOutputNames.get(processingId)) {
        if (outputName) {
          const outputPath = path.join(generatedDir, outputName);
          this.deleteFileIfExists(outputPath);
        }
      }
    }
    this.cleanupPartialFiles(processingId);
  }

  cleanupPartialFiles(processingId) {
    const generatedDir = GenerateDocumentService.GENERATED_DIR;
    try {
      const files = fs.readdirSync(generatedDir);

      for (const file of files) {
        if (!(file.endsWith(".pdf") || file.endsWith(".txt"))) {
          continue;
        }
        const filePath = path.join(generatedDir, file);
        try {
          const stats = fs.statSync(filePath);
          const fileAge = Date.now() - stats.ctimeMs;

          if (fileAge < 5 * 60 * 1000) {
            if (file.endsWith(".pdf")) {
              const txtFile = file.replace(/\.pdf$/, ".txt");
              const txtPath = path.join(generatedDir, txtFile);

              if (fs.existsSync(txtPath)) {
                this.deleteFileIfExists(txtPath);
              }
            }

            this.deleteFileIfExists(filePath);
          }
        } catch (statErr) {
          console.error(
            `Error checking file stats for ${file}: ${statErr.message}`
          );
        }
      }
    } catch (err) {
      console.error(`Error scanning for partial files: ${err.message}`);
    }
  }

  formatEmployeeName(rowData) {
    return rowData[constants.employeeNumberField]
      ? `${rowData[constants.firstNameField] || ""} ${rowData[constants.lastNameField] || ""
      } (${rowData[constants.employeeNumberField]})`
      : "Unknown Employee";
  }

  // Create safe filename
  createSafeFileName(rowData) {
    const rawName = `${rowData[constants.employeeNumberField]}}_${rowData[constants.firstNameField]
      }_${rowData[constants.lastNameField]}`;
    return rawName
      .trim()
      .replace(/[^a-zA-Z0-9]/g, "_")
      .replace(/_+$/, "");
  }

  replacePlaceholdersInString(content, data) {
    let result = content;
    const uniquePlaceholders = [
      ...new Set(content.match(/\$\{[^}]+\}/g) || []),
    ];
    uniquePlaceholders.forEach((placeholder) => {
      const key = placeholder.slice(2, -1);
      const value = data.hasOwnProperty(key) ? data[key] : "";
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
    });

    // Ensure we have standard email format
    let hasTo = false;
    let hasCC = false;
    let hasSubject = false;
    let hasBody = false;

    // Check for existing fields
    hasTo = /^\s*To\s*:/im.test(result);
    hasCC = /^\s*CC\s*:/im.test(result);
    hasSubject = /^\s*Subject\s*:/im.test(result);
    hasBody = /^\s*Body\s*:/im.test(result);

    // Split content into lines for easier handling
    let lines = result.split("\n");
    let headers = [];
    let bodyContent = [];
    let inBody = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!inBody) {
        if (line.match(/^\s*(To|CC|Subject)\s*:/i)) {
          headers.push(lines[i]);
          continue;
        }
        if (line.match(/^\s*Body\s*:/i)) {
          inBody = true;
          headers.push(lines[i]);
          continue;
        }
        if (
          line === "" &&
          headers.length > 0 &&
          i + 1 < lines.length &&
          lines[i + 1].match(/^\s*(To|CC|Subject|Body)\s*:/i)
        ) {
          headers.push(lines[i]);
          continue;
        }
        if (line !== "" || bodyContent.length > 0) {
          bodyContent.push(lines[i]);
        }
      } else {
        bodyContent.push(lines[i]);
      }
    }

    // Add To field if not present
    const emailField = data.To || data.Email || "";
    if (emailField && !hasTo) {
      headers.unshift(`To: ${emailField}`);
    }

    let formattedEmail = "";

    formattedEmail = headers.join("\n");
    if (!hasBody && bodyContent.length > 0) {
      if (formattedEmail.length > 0) {
        formattedEmail += "\n\n";
      }
      formattedEmail += bodyContent.join("\n");
    } else if (bodyContent.length > 0 && inBody === false) {
      if (formattedEmail.length > 0) {
        formattedEmail += "\n\n";
      }
      formattedEmail += bodyContent.join("\n");
    }

    if (/\bCC\s*:\s*Hello\s+/i.test(formattedEmail)) {
      const ccMatch = formattedEmail.match(
        /\bCC\s*:\s*(Hello\s+[^,\n]+(?:,|\n|$))/i
      );
      if (ccMatch) {
        formattedEmail = formattedEmail.replace(
          /\bCC\s*:\s*Hello\s+[^,\n]+(?:,|\n|$)/i,
          "CC: "
        );

        if (
          !formattedEmail.includes(ccMatch[1]) ||
          formattedEmail.indexOf(ccMatch[1]) ===
          formattedEmail.indexOf(ccMatch[0])
        ) {
          formattedEmail = formattedEmail.replace(
            /(\bBody\s*:\s*)/i,
            `$1${ccMatch[1]}\n`
          );
        }
      }
    }
    formattedEmail = formattedEmail.replace(/\bCC\s*:\s*(\n|$)/i, "");

    return formattedEmail;
  }

  // Create error report Excel file
  async createErrorReport(headers, failedRows, processingId, password) {
    const errorWorkbook = await XlsxPopulate.fromBlankAsync();
    const errorSheet = errorWorkbook.sheet(0);

    errorSheet.cell("A1").value([headers]);

    if (failedRows.length > 0) {
      errorSheet.cell("A2").value(failedRows);
    }

    const errorFileName = `Error_report_${processingId}.xlsx`;
    const errorFileFolder = path.join(
      GenerateDocumentService.GENERATED_DIR,
      "error"
    );
    const errorFilePath = path.join(errorFileFolder, errorFileName);

    // Save the error report
    if (password) {
      await errorWorkbook.toFileAsync(errorFilePath, { password });
    } else {
      await errorWorkbook.toFileAsync(errorFilePath);
    }

    return {
      name: errorFileName,
      path: errorFilePath,
      downloadUrl: `/api/v1/error-report/${errorFileName}`,
      encrypted: !!password,
    };
  }

  // Validate row data
  validateRowData(
    rowData,
    employeeId,
    processedEmployeeNumbers,
    requiredFields
  ) {
    const errors = [];

    // Check for duplicate employee numbers
    if (processedEmployeeNumbers.has(employeeId)) {
      errors.push(`Duplicate Employee_Number: ${employeeId}`);
    } else {
      processedEmployeeNumbers.add(employeeId);
    }

    console.log("rowData[constants.emailField]", rowData[constants.emailField]);
    // Email validation
    const emailError = this.validateEmail(
      rowData[constants.emailField],
      employeeId
    );
    if (emailError) {
      errors.push(emailError);
    }

    // Check for missing template name
    if (
      !rowData[constants.templateNameField] ||
      rowData[constants.templateNameField].toString().trim() === ""
    ) {
      errors.push(`Missing Template_Name for Employee ${employeeId}`);
    } else {
      console.log(
        `Template_Name '${rowData[constants.templateNameField]
        }' found for Employee ${employeeId}`
      );
    }

    // Check for missing required fields
    const missingFields = requiredFields
      .filter(
        (field) =>
          field !== "Reason ( Delete this column while uploading Excel )"
      )
      .filter(
        (field) => !rowData[field] || rowData[field].toString().trim() === ""
      );

    if (missingFields.length > 0) {
      errors.push(`Missing required fields: ${missingFields.join(", ")}`);
    }

    return errors;
  }

  // Process a single row of data
  async processRowData(rowData, processingId, emailTriggerId) {
    console.log("inside processRowData");
    if (this.isProcessCancelled(processingId)) {
      throw new Error("Document generation was cancelled by user request");
    }
    // Use provided template or fetch it
    const template = await TemplateModel.getTemplateByTitle(rowData[constants.templateNameField]);
    console.log(`after template ${template.word_file_path}`);
    console.log(`after template ${template.email_template_path}`);

    if (!template) {
      throw new Error(
        `Template '${rowData[constants.templateNameField]
        }' not found in the database`
      );
    }

    try {
      const templatePath = path.join('..',path.sep, template.word_file_path);
      console.log(`templatePath`, templatePath);
      if (!fs.existsSync(templatePath)) {
        throw new Error(`Word template file not found`);
      }

      const cleanRowData = Object.fromEntries(
        Object.entries(rowData).filter(
          ([key]) =>
            key !== "Reason ( Delete this column while uploading Excel )"
        )
      );

      console.log("about to replacePlaceholdersInDoc");

      // Generate document
      const docBuffer = this.replacePlaceholdersInDoc(
        templatePath,
        cleanRowData
      );
      console.log("about to convertDocBufferToEncryptedPdf");
      // Convert to PDF
      const generatedPDFPath = await this.convertDocBufferToEncryptedPdf(
        docBuffer,
        rowData,
        processingId
      );

      let emailTemplateContent;
      try {
        emailTemplateContent = fs.readFileSync(templatePath, "utf-8");
      } catch (error) {
        throw new Error(
          `Email template file for '${rowData[constants.templateNameField]
          }' not found`, error
        );
      }

      // This will add "To:" field to the email template
      emailTemplateContent = this.replacePlaceholdersInString(
        emailTemplateContent,
        cleanRowData
      );

      // Save email template
      const emailName = this.createSafeFileName(rowData);

      const emailFilePath = path.join(
        this.getEmailTemplateOutputDirectory(),
        `${emailName}.txt`
      );
      fs.writeFileSync(emailFilePath, emailTemplateContent);

      if (this.tempFiles.has(processingId)) {
        this.tempFiles.get(processingId).push(emailFilePath);
      }

      // Update to success status
      await this.addToEmailTriggerExtension({
        email_trigger_id: emailTriggerId,
        template_id: template.id,
        generated_pdfName: `${this.buildAttachmentFileName(rowData)}.pdf`,
        Document_Process_Status_id: 2,
      });

      return generatedPDFPath;
    } catch (err) {
      // Update to failed status
      try {
        await this.addToEmailTriggerExtension({
          email_trigger_id: emailTriggerId,
          template_id: template.id,
          generated_pdfName: `${this.buildAttachmentFileName(rowData)}.pdf`,
          Document_Process_Status_id: 3,
        });
      } catch (dbError) {
        console.error(`Failed to update database status: ${dbError.message}`);
      }
      throw err;
    }
  }

  replacePlaceholdersInDoc(wordFilePath, rowData) {
    try {
      const content = fs.readFileSync(wordFilePath, "binary");
      const zip = new PizZip(content);
      const doc = new Docxtemplater(zip);
      doc.render(rowData);
      return doc.getZip().generate({ type: "nodebuffer" });
    } catch (error) {
      if (error.properties && error.properties.errors) {
        const errorMessages = error.properties.errors
          .map((err) => `Error in template: ${err.message}`)
          .join("\n");
        console.error(errorMessages);
      }
      throw error;
    }
  }

  toWSLPath(winPath) {
    if (process.platform !== "win32") {
      return winPath; // If not on Windows, return as-is
    }

    // If it's not a typical C:\ path, return as-is
    if (!/^[a-zA-Z]:\\/.test(winPath)) {
      return winPath;
    }

    // Convert to WSL-style Linux path
    return winPath
      .replace(/\\/g, "/")
      .replace(/^([a-zA-Z]):/, (_, drive) => `/mnt/${drive.toLowerCase()}`);
  }

  async convertDocBufferToEncryptedPdf(docBuffer, rowData, processingId) {
    return new Promise((resolve, reject) => {
      this.initializeProcessTracking(processingId);
      if (this.isProcessCancelled(processingId)) {
        return reject(
          new Error("Document generation was cancelled by user request")
        );
      }
      console.log("inside convertDocBufferToEncryptedPdf");
      const wordDocumentPath = this.getGeneratedWordDocumentPath(rowData);
      console.log(`wordDocumentPath`, wordDocumentPath);
      fs.writeFileSync(wordDocumentPath, docBuffer);
      const convertCommand = this.getWordToPdfConversionCommand(rowData);
      console.log(`convertCommand`, convertCommand);
      const convertProcess = exec(convertCommand, (err, stdout, stderr) => {
        if (this.isProcessCancelled(processingId)) {
          this.cleanupFilesForProcess(processingId);
          return reject(
            new Error("Document generation was cancelled by user request")
          );
        }

        if (err) {
          console.error(
            `LibreOffice conversion failed: ${stderr || err.message}`
          );
          this.cleanupFilesForProcess(processingId);
          return reject(err);
        } else {
          resolve(stdout);
        }
      });
      this.activeChildProcesses.get(processingId).push(convertProcess);
    });
  }

  getWordToPdfConversionCommand(rowData) {
    console.log("inside getWordToPdfConversionCommand");
    const wordDocumentLinuxPath = this.convertToLinuxPath(this.getGeneratedWordDocumentPath(rowData));
    console.log(`wordDocumentPath`, wordDocumentLinuxPath);
    const pdfLinuxPath = this.getGeneratedPDFDocumentPath(rowData);
    const pdfOutputDirectoryLinuxPath = this.convertToLinuxPath(GenerateDocumentService.PDF_OUTPUT_DIR);
    console.log(`pdfPath`, pdfLinuxPath);
    if (process.env.wordToPdfCommand.toLowerCase().includes("libreoffice")) {
      const command = `${process.env.wordToPdfCommand} --headless --convert-to pdf --outdir "${pdfOutputDirectoryLinuxPath}" "${wordDocumentLinuxPath}"`
      console.log(`about to execute [${command}]`);
      return command;
    } else {
      const command = `${process.env.wordToPdfCommand} "${wordDocumentLinuxPath}" "${pdfLinuxPath}"`;
      console.log(`about to execute [${command}]`);
      return command;
    }
  }

  getGeneratedPDFDocumentPath(rowData) {
    return path.join(
      GenerateDocumentService.PDF_OUTPUT_DIR,
      `${this.buildAttachmentFileName(rowData)}.pdf`
    );
  }

  getGeneratedWordDocumentPath(rowData) {
    return path.join(
      GenerateDocumentService.WORD_OUTPUT_DIR,
      `${this.buildAttachmentFileName(rowData)}.docx`
    );
  }

  getEmailTemplateOutputDirectory() {
    const emailTemplateOutputDirectory = path.join(
      GenerateDocumentService.GENERATED_DIR,
      "template"
    );
    return emailTemplateOutputDirectory;
  }

  buildAttachmentFileName(rowData) {
    return `${rowData[constants.employeeNumberField]}_${rowData[constants.firstNameField]}_${rowData[constants.lastNameField]}`;
  }

  convertToLinuxPath(winPath) {
    console.log(`Start Converting Windows path to Linux-style: ${winPath}`);
    if (process.platform !== 'win32') {
      console.log(`Not on Windows, returning path as-is: ${winPath}`);
      return winPath; // If not on Windows, return as-is
    } else {
      console.log(`process.platform ${process.platform}`)
    }

    // If it's already a Linux-style path (starts with /), return as-is
    if (winPath.startsWith('/')) {
      console.log(`Path is already Linux-style: ${winPath}`);
      return winPath;
    } else {
      console.log(`winPath does not start with / ${winPath}`)
    }

    // If it's not a typical C:\ path, return as-is
    if (!/^[a-zA-Z]:\\/.test(winPath)) {
      console.log(`Path is not a typical Windows path: ${winPath}`);
      return winPath;
    } else {
      console.log(`winPath does not start with c:\\ ${winPath}`)
    }

    // Convert drive letter (e.g., C:\ -> /mnt/c/)
    const linuxPath = winPath.replace(/^([a-zA-Z]):[\\/]/, (_, drive) => `/mnt/${drive.toLowerCase()}/`);
    // Replace any remaining backslashes with forward slashes
    const finalPath = linuxPath.replace(/\\/g, '/');
    console.log(`Converted Windows path to Linux-style: ${finalPath}`);
    return finalPath;
  }

  // Delete a file if it exists
  deleteFileIfExists(filePath) {
    try {
      console.log(`deleting file: ${filePath}`);
      return;
      if (!filePath) return false;

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (err) {
      console.error(`Failed to delete file ${filePath}: ${err.message}`);
    }
    return false;
  }

  // Verify Excel password
  async verifyExcelPassword(file, password = null) {
    try {
      await XlsxPopulate.fromDataAsync(file.buffer, { password });
      return true;
    } catch (error) {
      throw new Error(
        "Failed to open the Excel file. Incorrect password or unsupported format."
      );
    }
  }

  // List all generated PDFs
  async listGeneratedPDFs() {
    const result = [];
    const walk = async (dir) => {
      const files = await fsp.readdir(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
          await walk(fullPath);
        } else if (file.name.endsWith(".pdf")) {
          result.push({
            name: file.name,
            path: fullPath,
            folder: path.relative(GenerateDocumentService.GENERATED_DIR, dir),
          });
        }
      }
    };

    await walk(GenerateDocumentService.GENERATED_DIR);
    return result;
  }

  static async findEmailTemplateFile(dir, fileName) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = await this.findEmailTemplateFile(fullPath, fileName);
        if (found) return found;
      } else if (entry.isFile() && entry.name === fileName) {
        return fullPath;
      }
    }
    return null;
  }

  // Get email template content for a specific PDF
  async getEmailTemplateForPDF(pdfName) {
    const txtFileName = pdfName.replace(/\.pdf$/, ".txt");

    const txtFilePath = await GenerateDocumentService.findEmailTemplateFile(
      GenerateDocumentService.GENERATED_DIR,
      txtFileName
    );

    if (!txtFilePath) {
      throw new Error(`Email template for '${pdfName}' not found.`);
    }

    return fs.readFileSync(txtFilePath, "utf-8");
  }
  static async findPDFFile(pdfName) {
    const walk = async (dir) => {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const result = await walk(fullPath);
          if (result) return result;
        } else if (entry.isFile() && entry.name === pdfName) {
          return fullPath;
        }
      }
      return null;
    };

    return await walk(GenerateDocumentService.GENERATED_DIR);
  }

  async getGeneratedPDFPath(pdfName) {
    const filePath = await GenerateDocumentService.findPDFFile(pdfName);
    if (!filePath) {
      throw new Error("PDF not found");
    }
    return filePath;
  }

  // Delete all generated PDFs & email templates
  async deleteAllPDFs() {
    const deleteFilesRecursively = async (dir) => {
      const entries = await fsp.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await deleteFilesRecursively(fullPath);
          await fsp.rmdir(fullPath).catch(() => { });
        } else if (
          entry.name.endsWith(".pdf") ||
          entry.name.endsWith(".txt") ||
          entry.name.endsWith(".xlsx")
        ) {
          try {
            await fsp.unlink(fullPath);
          } catch (err) {
            console.warn(`Failed to delete ${fullPath}: ${err.message}`);
          }
        }
      }
    };

    try {
      await deleteFilesRecursively(GenerateDocumentService.GENERATED_DIR);
      return "All PDFs, email templates, and Excel files deleted.";
    } catch (err) {
      throw new Error("Error during recursive deletion: " + err.message);
    }
  }

  // Delete specific PDF & email template

  async deletePDF(folder, name) {
    const baseDir = path.join(GenerateDocumentService.GENERATED_DIR, folder);
    const pdfPath = path.join(baseDir, name);
    const txtPath = pdfPath.replace(/\.pdf$/, ".txt");

    if (!fs.existsSync(pdfPath)) {
      throw new Error("PDF not found");
    }

    try {
      await fsp.unlink(pdfPath);
      if (fs.existsSync(txtPath)) {
        await fsp.unlink(txtPath);
        return "PDF and email template deleted successfully";
      } else {
        return "PDF deleted. Email template not found.";
      }
    } catch (err) {
      throw new Error("Error deleting files: " + err.message);
    }
  }

  // Get error report Excel file
  getErrorReportPath(fileName) {
    const filePath = path.join(GenerateDocumentService.GENERATED_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error("Error report file not found");
    }
    return filePath;
  }

  async recordUploadInEmailTrigger(userEmail, uploadedSheetName) {
    try {
      const userId = await EmailTriggerQueries.getUserIdByEmail(userEmail);
      const emailTriggerId = await EmailTriggerQueries.recordUpload(
        userId,
        uploadedSheetName
      );
      return emailTriggerId;
    } catch (err) {
      console.error("Failed to record upload in Email_Trigger:", err.message);
      throw err;
    }
  }

  async addToEmailTriggerExtension({
    email_trigger_id,
    template_id,
    generated_pdfName,
    Document_Process_Status_id,
  }) {
    try {
      await EmailTriggerQueries.upsertEmailTriggerExtension({
        email_trigger_id,
        template_id,
        generated_pdfName,
        Document_Process_Status_id,
      });
    } catch (err) {
      console.error(
        "Failed to insert/update Email_Trigger_Extension:",
        err.message
      );
      throw err;
    }
  }
}

module.exports = GenerateDocumentService;
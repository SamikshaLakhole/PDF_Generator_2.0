const GenerateDocumentService = require("../Services/GenerateDocumentService");
const path = require("path");
const fs = require("fs");
const EmailTriggerQueries = require("../Model/GenerateDocumentModel");
const EmailService = require("../Services/EmailService");

class GenerateDocumentController {
  constructor(hub) {
    this.generateDocumentService = new GenerateDocumentService();
    this.emailService = new EmailService();

    this.documentProcesses = new Map();
    this.hub = hub;
    this.activeService = null;

    if (!global.cancelledProcesses) {
      global.cancelledProcesses = new Set();
    }
  }

  // Handles Excel file upload, verifies password, and starts document generation
  generateDocument = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No Excel file uploaded" });
    }

    const { password } = req.body;
    console.log("Verifying password...");

    try {
      await this.generateDocumentService.verifyExcelPassword(
        req.file,
        password
      );

      const processingId = Date.now().toString();

      res.status(200).json({
        success: true,
        message: "Password verified, document generation started",
        processingId: processingId,
      });
      console.log("Password verified, document generation started");

      const processPromise = this.generateDocumentService
        .processExcelAndGenerateDocuments(req.file, password, processingId)
        .then((result) => {
          this.documentProcesses.set(processingId, {
            status: "COMPLETED",
            documents: result.generatedFiles,
            errors: result.errors,
            errorReport: result.errorReport,
            summary: result.summary,
            timestamp: Date.now(),
          });

          global.cancelledProcesses.delete(processingId);
        })
        .catch((error) => {
          if (!global.cancelledProcesses.has(processingId)) {
            this.documentProcesses.set(processingId, {
              status: "FAILED",
              error: error.message,
              timestamp: Date.now(),
            });
          }

          global.cancelledProcesses.delete(processingId);
        });

      this.documentProcesses.set(processingId, {
        status: "PROCESSING",
        promise: processPromise,
        timestamp: Date.now(),
      });
    } catch (error) {
      const isPasswordError =
        error.message.includes("Incorrect password") ||
        error.message.includes("Failed to open");
      return res.status(isPasswordError ? 401 : 500).json({
        success: false,
        error: isPasswordError
          ? "Password required or incorrect"
          : error.message,
      });
    }
  };

  checkDocumentStatus = async (req, res) => {
    const { processingId } = req.params;

    if (!this.documentProcesses.has(processingId)) {
      return res.status(404).json({
        status: "NOT_FOUND",
        message: "Process ID not found or has expired",
      });
    }

    const process = this.documentProcesses.get(processingId);
    const formattedErrors = process.errors
      ? process.errors.map((error) => ({
          message: error.message,
          rowData: error.row
            ? Object.fromEntries(
                Object.entries(error.row).filter(
                  ([key, value]) =>
                    [
                      "Employee_Number",
                      "First_Name",
                      "Last_Name",
                      "Template_Name",
                    ].includes(key) && value
                )
              )
            : "Unknown",
        }))
      : [];

    if (process.status === "PROCESSING") {
      return res.json({
        status: "PROCESSING",
        message: "Document generation in progress",
        documents: (process.documents || []).map((doc) => ({
          name: path.basename(doc.pdfPath),
          to: doc.to || "N/A",
        })),
        summary: process.summary || {
          total: 0,
          success: 0,
          failed: 0,
        },
        errors: formattedErrors,
        errorReport: process.errorReport || null,
      });
    } else if (process.status === "COMPLETED") {
      return res.json({
        status: "COMPLETED",
        message: "Document generation completed",
        documents: (process.documents || []).map((doc) => ({
          name: path.basename(doc.pdfPath),
          to: doc.to || "N/A",
        })),
        summary: process.summary || {
          total:
            (process.documents?.length || 0) + (process.errors?.length || 0),
          success: process.documents?.length || 0,
          failed: process.errors?.length || 0,
        },
        errors: formattedErrors,
        errorReport: process.errorReport
          ? {
              name: process.errorReport.name,
              downloadUrl: `/api/v1/error-report/${process.errorReport.name}`,
            }
          : null,
      });
    } else if (process.status === "CANCELLED") {
      return res.json({
        status: "CANCELLED",
        message: "Document generation was cancelled by user request",
      });
    } else {
      return res.json({
        status: "FAILED",
        message:
          process.message || process.error || "Document generation failed",
      });
    }
  };

  cancelDocumentGeneration = async (req, res) => {
    const { processingId } = req.params;

    if (!this.documentProcesses.has(processingId)) {
      return res.status(404).json({
        success: false,
        message: "Process ID not found or has expired.",
      });
    }

    const process = this.documentProcesses.get(processingId);

    if (process.status !== "PROCESSING") {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a process that is ${process.status.toLowerCase()}`,
      });
    }

    try {
      console.log(`Cancelling document generation process: ${processingId}`);
      global.cancelledProcesses.add(processingId);
      this.documentProcesses.set(processingId, {
        ...process,
        status: "CANCELLING",
        timestamp: Date.now(),
      });

      // Notify hub of cancellation status
      const hub = global.app?.get("documentGenerationHub");
      if (hub) {
        hub.updateGenerationProgress(processingId, {
          stage: "Cancelling process...",
        });
      }
      res.json({
        success: true,
        message: "Document generation process is being cancelled...",
      });
      try {
        await this.generateDocumentService.cleanupCancelledProcess(
          processingId
        );
        this.documentProcesses.set(processingId, {
          ...process,
          status: "CANCELLED",
          timestamp: Date.now(),
        });

        // Notify hub of completion
        if (hub) {
          hub.updateGenerationProgress(processingId, {
            stage: "Process cancelled by user request",
          });
        }

        console.log(
          `Process ${processingId} successfully cancelled and cleaned up`
        );
      } catch (cleanupErr) {
        console.error(`Error during cleanup for ${processingId}:`, cleanupErr);

        this.documentProcesses.set(processingId, {
          ...process,
          status: "CANCELLED",
          error: `Cancelled with cleanup errors: ${cleanupErr.message}`,
          timestamp: Date.now(),
        });

        if (hub) {
          hub.updateGenerationProgress(processingId, {
            stage: "Process cancelled but cleanup encountered errors",
          });
        }
      }
    } catch (error) {
      console.error("Error during cancellation:", error.message);

      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          message: `Error cancelling process: ${error.message}`,
        });
      }
    }
  };
  
  listGeneratedPDFs = async (_req, res) => {
    try {
      const pdfs = await this.generateDocumentService.listGeneratedPDFs();

      // Get unique folder IDs
      const folderIds = [...new Set(pdfs.map((f) => f.folder))];

      const folderInfoMap = {};
      for (const id of folderIds) {
        try {
          const entry = await EmailTriggerQueries.getEmailTriggerById(id);
          folderInfoMap[id] = entry?.uploadedSheetName;
        } catch (e) {
          folderInfoMap[id] = "Unknown";
        }
      }

      const pdfsWithOriginalNames = pdfs.map((file) => ({
        ...file,
        originalFileName: folderInfoMap[file.folder] || "Unknown",
      }));

      res.json({ pdfs: pdfsWithOriginalNames });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };

  getGeneratedPDF = (req, res) => {
    try {
      const pdfPath = this.generateDocumentService.getGeneratedPDFPath(
        req.params.name
      );
      res.sendFile(pdfPath);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  };

  deleteAllPDFs = async (_req, res) => {
    for (const processingId of this.documentProcesses.keys()) {
      global.cancelledProcesses.add(processingId);
    }

    try {
      const result = await this.generateDocumentService.deleteAllPDFs();
      return res.json({ message: result });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  };

  deletePDF = async (req, res) => {
    try {
      const message = await this.generateDocumentService.deletePDF(
        req.params.name
      );
      res.status(200).json({ message });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  };

  getEmailTemplateForPDF = async (req, res) => {
    try {
      const emailContent =
        await this.generateDocumentService.getEmailTemplateForPDF(
          req.params.pdfName
        );
      res.status(200).json({ emailContent });
    } catch (error) {
      console.error("Error fetching email template:", error.message);
      res.status(404).json({ error: error.message });
    }
  };

  getErrorReport(req, res) {
    try {
      const fileName = req.params.filename;
      const errorFileFolder = path.join(GenerateDocumentService.GENERATED_DIR, "error");
      const errorFilePath = path.join(errorFileFolder, fileName);
      if (fs.existsSync(errorFilePath)) {
        return res.download(errorFilePath);
      }
      return res.status(404).json({ error: "Error report not found" });
    } catch (err) {
      console.error("Error in getErrorReport:", err.message);
      return res.status(500).json({ error: "Failed to download error report" });
    }
  }
}

module.exports = GenerateDocumentController;

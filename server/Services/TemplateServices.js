const fs = require("fs");
const path = require("path");
const TemplateModel = require("../Model/TemplateModel");

const templatesDir = path.join(__dirname, "../uploads/email_templates");
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true });
}

class TemplateServices {
  // Save template to the database
  async saveTemplate(
    filePath,
    title,
    description,
    cc,
    subject,
    body,
    uploadedBy
  ) {
    try {
      const templatePath = path.join(templatesDir, `${title}.txt`);
      const emailTemplateContent = `CC: ${cc}\nSubject: ${subject}\n\n${body}`;
      fs.writeFileSync(templatePath, emailTemplateContent, "utf8");

      const id = await TemplateModel.insertTemplate({
        title,
        description,
        filePath,
        templatePath,
        uploadedBy,
      });

      return {
        id,
        title,
        description,
        filePath,
        emailTemplatePath: templatePath,
      };
    } catch (error) {
      console.error("Database Insert Error:", error);
      throw new Error(error.message);
    }
  }

  async getAllTemplates() {
    return await TemplateModel.getAllTemplates();
  }

  async getTemplateById(id) {
    return await TemplateModel.getTemplateById(id);
  }

  async updateTemplate(id, updatedData) {
    try {
      const existingTemplate = await TemplateModel.getTemplateById(id);
      if (!existingTemplate) throw new Error("Template not found");

      const updatePayload = {
        title: updatedData.title || existingTemplate.title,
        description: updatedData.description || existingTemplate.description,
      };

      // Convert relative path to absolute path
      const projectRoot = path.resolve(__dirname, '../..');
      const oldEmailTemplatePath = path.join(projectRoot, existingTemplate.email_template_path);
      
      if (!fs.existsSync(oldEmailTemplatePath)) {
        throw new Error(
          `Email template file not found at: ${oldEmailTemplatePath}`
        );
      }

      const existingEmailContent = fs
        .readFileSync(oldEmailTemplatePath, "utf8")
        .split("\n");
      const oldCc = existingEmailContent[0].replace("CC: ", "").trim();
      const oldSubject = existingEmailContent[1]
        .replace("Subject: ", "")
        .trim();
      const oldBody = existingEmailContent.slice(3).join("\n").trim();

      const newCc = updatedData.cc !== undefined ? updatedData.cc : oldCc;
      const newSubject =
        updatedData.subject !== undefined ? updatedData.subject : oldSubject;
      const newBody =
        updatedData.body !== undefined ? updatedData.body : oldBody;

      const updatedEmailContent = `CC: ${newCc}\nSubject: ${newSubject}\n\n${newBody}`;

      const templateDir = path.dirname(oldEmailTemplatePath);
      const newFileName = `${updatePayload.title}.txt`;
      const newEmailTemplatePath = path.join(templateDir, newFileName);

      if (oldEmailTemplatePath !== newEmailTemplatePath) {
        if (fs.existsSync(newEmailTemplatePath)) {
          console.warn(
            `File already exists: ${newEmailTemplatePath}, skipping rename.`
          );
        } else {
          fs.renameSync(oldEmailTemplatePath, newEmailTemplatePath);
          console.log(`Successfully renamed file to: ${newEmailTemplatePath}`);
        }
        updatePayload.email_template_path = path.relative(projectRoot, newEmailTemplatePath);
      }

      fs.writeFileSync(newEmailTemplatePath, updatedEmailContent, "utf8");

      await TemplateModel.updateTemplate(id, updatePayload);
      console.log("Template updated successfully!");

      return {
        message: "Template updated successfully",
        updatedData,
      };
    } catch (error) {
      console.error("Update Error:", error);
      throw new Error(error.message);
    }
  }

  async deleteTemplate(id) {
    return await TemplateModel.softDeleteTemplate(id);
  }

}

module.exports = { TemplateServices };

const { TemplateServices } = require("../Services/TemplateServices");
const path = require("path");
const fs = require("fs");

const templateServices = new TemplateServices();

class TemplateController {
  async uploadTemplate(req, res) {
    try {
      const file = req.file;
      const body = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!body.title) {
        return res.status(400).json({ error: "Title is required" });
      }

      if (!body.description) {
        return res.status(400).json({ error: "Description is required" });
      }

      const template = await templateServices.saveTemplate(
        file.path,
        body.title,
        body.description,
        body.cc,
        body.subject,
        body.body,
        body.uploadedBy
      );

      res.json({ message: "Template uploaded successfully", template });
    } catch (err) {
      console.error("Insert Template Error:", err.message); 
      res.status(409).json({ message: err.message }); 
    }
  }

  async getTemplates(req, res) {
    try {
      const templates = await templateServices.getAllTemplates();
      res.json({ templates });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  
  async getTemplateById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const template = await templateServices.getTemplateById(id);
  
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
  
      // Convert relative path to absolute path
      const projectRoot = path.resolve(__dirname, '../..');
      const filePath = path.join(projectRoot, template.email_template_path);
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Email file not found" });
      }
  
      const content = fs.readFileSync(filePath, "utf8").split("\n");
  
      const cc = content[0].replace("CC: ", "").trim();
      const subject = content[1].replace("Subject: ", "").trim();
      const body = content.slice(3).join("\n").trim();
  
      res.json({
        ...template,
        cc: cc,
        subject: subject,
        body: body,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTemplateFileById(req, res) {
    try {
      const id = parseInt(req.params.id);
      const template = await templateServices.getTemplateById(id);
  
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
  
      // Convert relative path to absolute path
      const projectRoot = path.resolve(__dirname, '../..');
      const filePath = path.join(projectRoot, template.word_file_path);
  
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }
  
      const fileName = path.basename(filePath);
      res.download(filePath, fileName);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }  

  async updateTemplate(req, res) {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const updated = await templateServices.updateTemplate(id, data);

      if (!updated) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ message: "Template updated successfully", updatedData: data });
    } catch (err) {
      console.error("Update Template Error:", err.message); 
      res.status(409).json({ message: err.message }); 
    }
  }

  async deleteTemplate(req, res) {
    try {
      const id = parseInt(req.params.id);
      const deleted = await templateServices.deleteTemplate(id);

      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

}

module.exports = { TemplateController };

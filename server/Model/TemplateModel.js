const db = require("../db");
const path = require("path");
const fs = require("fs").promises;

function getRelativePath(absolutePath) {
  const projectRoot = path.resolve(__dirname, '../..');
  return path.relative(projectRoot, absolutePath);
}

function formatTimestamp(date) {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

class TemplateModel {
  static async insertTemplate({
    title,
    description,
    filePath,
    templatePath,
    uploadedBy,
  }) {
    console.log("Inserting Template:", {
      title,
      description,
      filePath,
      templatePath,
      uploadedBy,
    });

    if (!templatePath) {
      throw new Error("Template path is missing before insertion");
    }

    const existing = await db("templates")
      .where({ title })
      .whereNull("deleted_at")
      .first();

    if (existing) {
      throw new Error(`A template with the title "${title}" already exists.`);
    }

    // Rename the Word file to match the title
    const dir = path.dirname(filePath);
    const newWordFilePath = path.join(dir, `${title}.docx`);

    try {
      await fs.rename(filePath, newWordFilePath);
    } catch (err) {
      console.error("Failed to rename Word template:", err);
      throw err;
    }

    // Store relative paths instead of absolute paths
    const relativeWordPath = getRelativePath(newWordFilePath);
    const relativeTemplatePath = getRelativePath(templatePath);
    
    const formattedTimestamp = formatTimestamp(new Date());

    const [id] = await db("templates").insert({
      title,
      description,
      word_file_path: relativeWordPath,
      email_template_path: relativeTemplatePath,
      uploaded_by: uploadedBy,
      uploaded_at: formattedTimestamp,
      updated_at: formattedTimestamp,
    });

    return id;
  }

  static async getAllTemplates() {
    return db("templates").whereNull("deleted_at");
  }

  static async getTemplateById(id) {
    return db("templates").where({ id }).whereNull("deleted_at").first();
  }

  static async getTemplateByName(name) {
    return db("templates")
      .where({ title: name })
      .whereNull("deleted_at")
      .first();
  }

  static async getTemplateByTitle(title) {
    const template = await db("templates")
      .where({ title })
      .whereNull("deleted_at")
      .first();

    if (!template) {
      console.error(`Template with title '${title}' not found in the database`);
      return null;
    }

    return template;
  }

  static async updateTemplate(id, updatedData) {
    // Format current timestamp
    updatedData.updated_at = formatTimestamp(new Date());

    // Fetch current template data
    const currentTemplate = await db("templates")
      .where({ id })
      .whereNull("deleted_at")
      .first();
    if (!currentTemplate) {
      throw new Error(`Template with ID "${id}" not found.`);
    }

    // Check for title change and uniqueness
    if (updatedData.title && updatedData.title !== currentTemplate.title) {
      const existingTemplate = await db("templates")
        .where({ title: updatedData.title })
        .whereNull("deleted_at")
        .first();

      if (existingTemplate) {
        throw new Error(
          `A template with the title "${updatedData.title}" already exists.`
        );
      }

      // Get absolute path from relative path
      const projectRoot = path.resolve(__dirname, '../..');
      const oldPath = path.join(projectRoot, currentTemplate.word_file_path);
      const dir = path.dirname(oldPath);
      const newPath = path.join(dir, `${updatedData.title}.docx`);

      try {
        await fs.rename(oldPath, newPath);
        // Store the new relative path
        updatedData.word_file_path = getRelativePath(newPath);
      } catch (err) {
        console.error("Error renaming Word file during title update:", err);
        throw new Error("Failed to rename the associated Word file.");
      }
    }

    await db("templates").where({ id }).update(updatedData);
    return this.getTemplateById(id);
  }

  static async softDeleteTemplate(id) {
    return db("templates").where({ id }).update({ 
      deleted_at: formatTimestamp(new Date()) 
    });
  }
}

module.exports = TemplateModel;

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { TemplateController } = require("../Controller/TemplatesController");

const router = express.Router();
const templatesController = new TemplateController();

// Create upload directory
const uploadDir = path.join(__dirname, "../uploads/word_templates");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const wordStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, file.originalname),
});

const uploadWord = multer({ storage: wordStorage });
const upload = multer();

// Upload a new Word template
router.post("/", uploadWord.single("file"), templatesController.uploadTemplate);

// Get all templates
router.get("/", templatesController.getTemplates);

// Get a single template by ID with email content
router.get("/:id", templatesController.getTemplateById);

// Update a template by ID
router.put("/:id", upload.none(), templatesController.updateTemplate);

// Delete a template by ID
router.delete("/:id", templatesController.deleteTemplate);

// Download the original Word file
router.get("/:id/download", templatesController.getTemplateFileById);

module.exports = router;

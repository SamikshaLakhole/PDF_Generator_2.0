const express = require("express");
const multer = require("multer");
const GenerateDocumentController = require("../Controller/GenerateDocumentController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const generateDocumentController = new GenerateDocumentController();

// Generate documents from Excel file
router.post(
  "/documents",
  upload.single("excelFile"),
  generateDocumentController.generateDocument
);

// List all generated PDFs
router.get("/documents", generateDocumentController.listGeneratedPDFs);

// Delete all generated PDFs
router.delete("/documents", generateDocumentController.deleteAllPDFs);

// Get a specific PDF by name
router.get("/pdf/:name", generateDocumentController.getGeneratedPDF);

// Delete a specific PDF by name
router.delete("/pdf/:folder/:name", generateDocumentController.deletePDF);

// Get email template related to a specific PDF
router.get(
  "/email-template/:pdfName",
  generateDocumentController.getEmailTemplateForPDF
);

// Get status of document generation process
router.get(
  "/document-status/:processId",
  generateDocumentController.checkDocumentStatus
);

// Downloading error reports
router.get(
  "/error-report/:filename",
  generateDocumentController.getErrorReport
);

// Cancel document generation process
router.post(
  "/cancel-generation/:processingId",
  generateDocumentController.cancelDocumentGeneration
);

module.exports = router;

const express = require("express");
const EmailController = require("../Controller/EmailController");
const router = express.Router();

const emailController = new EmailController();

// Get email template related to a specific PDF
router.get("/template/:pdfName", emailController.getEmailTemplateForPDF);

// Send email with attachment
router.post("/email", emailController.sendEmailWithAttachment);

module.exports = router;

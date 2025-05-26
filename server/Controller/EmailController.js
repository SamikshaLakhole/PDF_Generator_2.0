const EmailService = require("../Services/EmailService");
const GenerateDocumentService = require("../Services/GenerateDocumentService");
const EmailTriggerQueries = require("../Model/GenerateDocumentModel");

class EmailController {
  constructor() {
    this.emailService = new EmailService();
    this.generateDocumentService = new GenerateDocumentService();
  }

  // Get email template for a specific PDF
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

  // Send email with PDF attachment
  sendEmailWithAttachment = async (req, res) => {
    try {
      const { cc, subject, body, htmlContent, pdfFileName } = req.body;

      const emailContent =
        await this.generateDocumentService.getEmailTemplateForPDF(pdfFileName);

      const toMatch = emailContent.match(/^To:\s*(.*)$/m);
      const to = toMatch ? [toMatch[1].trim()] : [];

      if (to.length === 0) {
        return res
          .status(400)
          .json({ error: "Missing 'To' field in email template." });
      }

      const result = await this.emailService.sendEmailWithPDFStatusUpdate({
        to,
        cc,
        subject,
        body,
        htmlContent,
        pdfFileName,
      });

      res
        .status(200)
        .json({ success: true, result, message: "Email sent successfully" });
    } catch (error) {
      console.error("Error in sendEmailWithAttachment:", error.message);
      res
        .status(500)
        .json({ error: "Failed to send email.", details: error.message });
    }
  };

  // Get documents based on status
  getDocumentsByStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.query;

    try {
      const document = await EmailTriggerQueries.getDocumentById(id, status);
      res.json(document);
    } catch (error) {
      console.error("Error fetching documents:", error.message);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

module.exports = EmailController;

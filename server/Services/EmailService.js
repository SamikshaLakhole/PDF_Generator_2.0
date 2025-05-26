require("dotenv").config();
const { EmailClient } = require("@azure/communication-email");
const fs = require("fs");
const GenerateDocumentService = require("./GenerateDocumentService");
const EmailTriggerQueries = require("../Model/GenerateDocumentModel");

const connectionString = process.env.connectionString;

class EmailService {
  constructor() {
    this.emailClient = new EmailClient(connectionString);
    this.generateDocumentService = new GenerateDocumentService();
  }

  // Send email & update DB status
  async sendEmailWithPDFStatusUpdate({
    to,
    cc = [],
    subject,
    body,
    htmlContent,
    pdfFileName,
  }) {
    let emailTriggerId;
    try {
      // Get the email trigger ID from PDF file name
      emailTriggerId = await this.getEmailTriggerIdByPDF(pdfFileName);

      // Update status: Email Sending (4)
      await EmailTriggerQueries.updateEmailTriggerExtensionStatusByPDF(
        emailTriggerId,
        pdfFileName,
        4
      );

      // Send email with attachment
      const result = await this.sendEmailWithAttachment({
        to,
        cc,
        subject,
        body,
        htmlContent,
        pdfFileName,
      });

      // Update status: Email Sent (5)
      await EmailTriggerQueries.updateEmailTriggerExtensionStatusByPDF(
        emailTriggerId,
        pdfFileName,
        5
      );

      return result;
    } catch (error) {
      try {
        if (emailTriggerId) {
          // Update status: Email Failed (6)
          await EmailTriggerQueries.updateEmailTriggerExtensionStatusByPDF(
            emailTriggerId,
            pdfFileName,
            6
          );
        }
      } catch (dbError) {
        console.error(
          "Failed to update DB status to 'Email Failed':",
          dbError.message
        );
      }

      console.error(`Error sending email for PDF ${pdfFileName}:`, error);
      throw error;
    }
  }

  // Helper to send email with PDF attachment
  async sendEmailWithAttachment({
    to,
    cc = [],
    subject,
    body,
    htmlContent,
    pdfFileName,
  }) {
    // Get full path to generated PDF
    const pdfPath = await this.generateDocumentService.getGeneratedPDFPath(
      pdfFileName
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF file not found: ${pdfFileName}`);
    }

    const fileBuffer = fs.readFileSync(pdfPath);
    const base64File = fileBuffer.toString("base64");

    // Prepare email message object for Azure
    const emailMessage = {
      senderAddress: process.env.senderAddress,
      content: {
        subject: subject || "Document Attachment",
        plainText: body || "Please find the attached document.",
        html:
          htmlContent ||
          `<p>${body || "Please find the attached document."}</p>`,
      },
      recipients: {
        to: to.map((address) => ({ address: address.trim() })),
        cc: cc.length
          ? cc.map((address) => ({ address: address.trim() }))
          : undefined,
      },
      attachments: [
        {
          name: pdfFileName,
          contentType: "application/pdf",
          contentInBase64: base64File,
        },
      ],
    };

    // Send email via Azure Communication Email
    const poller = await this.emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();

    if (result.status !== "Succeeded") {
      const errorMessage =
        result.error?.message || `Email send failed. Status: ${result.status}`;
      throw new Error(errorMessage);
    }

    const failedRecipients = result.recipients?.failed || [];
    const succeededRecipients = result.recipients?.succeeded || [];

    if (failedRecipients.length > 0 && succeededRecipients.length === 0) {
      const errorDetails = failedRecipients
        .map(
          (r) =>
            `${r.address}: ${r.status} - ${r.error?.message || "Unknown error"}`
        )
        .join(", ");
      throw new Error(`All recipients failed: ${errorDetails}`);
    }

    return {
      ...result,
      summary: {
        totalRecipients: to.length + (cc?.length || 0),
        succeededCount: succeededRecipients.length,
        failedCount: failedRecipients.length,
        pdfFileName,
        sentAt: new Date().toISOString(),
      },
    };
  }

  // Helper to get email trigger ID by PDF file name
  async getEmailTriggerIdByPDF(pdfFileName) {
    const record = await EmailTriggerQueries.getEmailTriggerExtensionByPDF(
      pdfFileName
    );
    if (!record)
      throw new Error(`No email trigger found for PDF ${pdfFileName}`);
    return record.email_trigger_id;
  }
}

module.exports = EmailService;

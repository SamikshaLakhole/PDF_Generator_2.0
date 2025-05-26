const db = require("../db");

class EmailTriggerQueries {
  static extractInsertedId(result) {
    if (Array.isArray(result)) {
      let inserted = result[0];
      return typeof inserted === "object" && inserted !== null
        ? inserted.id
        : inserted;
    }
    return result;
  }

  static formatDateTime(date = new Date()) {
    const pad = (n) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }

  // Get user ID by email
  static async getUserIdByEmail(email) {
    const user = await db("Users").select("id").where({ email }).first();
    if (!user) throw new Error("User not found in database");
    return user.id;
  }

  // Insert or find Email_Trigger record
  static async recordUpload(userId, uploadedSheetName) {
    try {
      const result = await db("Email_Trigger")
        .insert({
          userId,
          uploadedSheetName,
          whenCreated: this.formatDateTime(),
        })
        .returning("id");

      return this.extractInsertedId(result);
    } catch (insertError) {
      if (
        insertError.code === "SQLITE_CONSTRAINT" &&
        insertError.message.includes("UNIQUE constraint failed")
      ) {
        const existingRecord = await db("Email_Trigger")
          .select("id")
          .where({ userId, uploadedSheetName })
          .orderBy("whenCreated", "desc")
          .first();

        if (existingRecord) return existingRecord.id;

        const retryResult = await db("Email_Trigger")
          .insert({
            userId,
            uploadedSheetName,
            whenCreated: this.formatDateTime(
              new Date(Date.now() + Math.random() * 1000)
            ),
          })
          .returning("id");

        return this.extractInsertedId(retryResult);
      } else {
        throw insertError;
      }
    }
  }

  // Insert or update Email_Trigger_Extension
  static async upsertEmailTriggerExtension({
    email_trigger_id,
    template_id,
    generated_pdfName,
    Document_Process_Status_id,
  }) {
    return await db("Email_Trigger_Extension")
      .insert({
        email_trigger_id,
        template_id,
        generated_pdfName,
        Document_Process_Status_id,
        whenCreated: this.formatDateTime(),
      })
      .onConflict(["email_trigger_id", "generated_pdfName"])
      .merge();
  }

  // Update Email_Trigger_Extension status by PDF name
  static async updateEmailTriggerExtensionStatusByPDF(
    emailTriggerId,
    pdfName,
    statusId
  ) {
    try {
      const updatedRows = await db("Email_Trigger_Extension")
        .where({
          email_trigger_id: emailTriggerId,
          generated_pdfName: pdfName,
        })
        .update({
          Document_Process_Status_id: statusId,
          whenCreated: this.formatDateTime(),
        });

      if (updatedRows === 0) {
        console.warn(
          `No Email_Trigger_Extension record found for PDF: ${pdfName} with email_trigger_id: ${emailTriggerId}`
        );
        return false;
      }

      console.log(
        `Updated status to ${statusId} for PDF: ${pdfName}, email_trigger_id: ${emailTriggerId}`
      );
      return true;
    } catch (error) {
      console.error(
        `Failed to update status for PDF ${pdfName}, email_trigger_id: ${emailTriggerId}:`,
        error.message
      );
      throw error;
    }
  }

  // Get Email_Trigger_Extension record by PDF name
  static async getEmailTriggerExtensionByPDF(pdfName) {
    try {
      const record = await db("Email_Trigger_Extension")
        .where("generated_pdfName", pdfName)
        .first();

      return record;
    } catch (error) {
      console.error(
        `Failed to get Email_Trigger_Extension record for PDF ${pdfName}:`,
        error.message
      );
      throw error;
    }
  }

  // Method for /documents/:id?status=pending|completed
  static async getDocumentById(id, status) {
    const emailTrigger = await db("Email_Trigger")
      .select("id", "uploadedSheetName", "whenCreated")
      .where({ id })
      .first();

    if (!emailTrigger) {
      throw new Error(`Document with id ${id} not found`);
    }

    const PDF_EMAIL_GENERATED_STATUS_ID = 2;

    let query = db("Email_Trigger_Extension as b")
      .join(
        "Document_Process_Status as s",
        "b.Document_Process_Status_id",
        "s.id"
      )
      .select(
        "b.id",
        "b.email_trigger_id as emailTriggerId",
        "b.generated_pdfName as pdfName",
        "b.whenCreated",
        "s.id as statusId",
        "s.name as statusName",
        "s.description as statusDescription"
      )
      .where("b.email_trigger_id", id);

    // Apply status filtering
    if (status === "pending") {
      query = query.whereNot(
        "b.Document_Process_Status_id",
        PDF_EMAIL_GENERATED_STATUS_ID
      );
    } else if (status === "completed") {
      query = query.where(
        "b.Document_Process_Status_id",
        PDF_EMAIL_GENERATED_STATUS_ID
      );
    }

    const extensions = await query.orderBy("b.whenCreated", "desc");

    // Transform result into expected structure
    const processedExtensions = extensions.map((ext) => ({
      id: ext.id,
      emailTriggerId: ext.emailTriggerId,
      pdfName: ext.pdfName,
      whenCreated: ext.whenCreated,
      status: {
        id: ext.statusId,
        name: ext.statusName,
        description: ext.statusDescription,
      },
    }));

    return {
      ...emailTrigger,
      extensions: processedExtensions,
    };
  }

  static async getDocumentsByEmailStatus(id, emailStatus) {
    const emailTrigger = await db("Email_Trigger")
      .select("id", "uploadedSheetName", "whenCreated")
      .where({ id })
      .first();

    if (!emailTrigger) {
      throw new Error(`Document with id ${id} not found`);
    }

    const EMAIL_STATUS_IDS = {
      pending: [1, 2, 3], // Pending, Generated, Failed (not yet email-related)
      sending: [4], // Email Sending
      sent: [5], // Email Sent Successfully
      failed: [6], // Email Send Failed
    };

    let query = db("Email_Trigger_Extension as b")
      .join(
        "Document_Process_Status as s",
        "b.Document_Process_Status_id",
        "s.id"
      )
      .select(
        "b.id",
        "b.email_trigger_id as emailTriggerId",
        "b.generated_pdfName as pdfName",
        "b.whenCreated",
        "s.id as statusId",
        "s.name as statusName",
        "s.description as statusDescription"
      )
      .where("b.email_trigger_id", id);

    // Apply email status filtering
    if (emailStatus && EMAIL_STATUS_IDS[emailStatus]) {
      query = query.whereIn(
        "b.Document_Process_Status_id",
        EMAIL_STATUS_IDS[emailStatus]
      );
    }

    const extensions = await query.orderBy("b.whenCreated", "desc");

    const processedExtensions = extensions.map((ext) => ({
      id: ext.id,
      emailTriggerId: ext.emailTriggerId,
      pdfName: ext.pdfName,
      whenCreated: ext.whenCreated,
      status: {
        id: ext.statusId,
        name: ext.statusName,
        description: ext.statusDescription,
      },
    }));

    return {
      ...emailTrigger,
      extensions: processedExtensions,
    };
  }

  static async getEmailTriggerById(id) {
    return db("Email_Trigger").where({ id }).first();
  }
}

module.exports = EmailTriggerQueries;

// const db = require("../db");

// class EmailTriggerQueries {
//   static formatDateTime(date = new Date()) {
//     const pad = (n) => n.toString().padStart(2, "0");
//     const year = date.getFullYear();
//     const month = pad(date.getMonth() + 1);
//     const day = pad(date.getDate());
//     const hours = pad(date.getHours());
//     const minutes = pad(date.getMinutes());
//     const seconds = pad(date.getSeconds());
//     return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
//   }

//   static async updateEmailTriggerExtensionStatusByPDF(
//     emailTriggerId,
//     pdfName,
//     statusId
//   ) {
//     try {
//       const updatedRows = await db("Email_Trigger_Extension")
//         .where({
//           email_trigger_id: emailTriggerId,
//           generated_pdfName: pdfName,
//         })
//         .update({
//           Document_Process_Status_id: statusId,
//           whenCreated: this.formatDateTime(),
//         });

//       if (updatedRows === 0) {
//         console.warn(
//           `No Email_Trigger_Extension record found for PDF: ${pdfName} with email_trigger_id: ${emailTriggerId}`
//         );
//         return false;
//       }

//       console.log(
//         `Updated status to ${statusId} for PDF: ${pdfName}, email_trigger_id: ${emailTriggerId}`
//       );
//       return true;
//     } catch (error) {
//       console.error(
//         `Failed to update status for PDF ${pdfName}, email_trigger_id: ${emailTriggerId}:`,
//         error.message
//       );
//       throw error;
//     }
//   }

//   // Get Email_Trigger_Extension record by PDF name
//   static async getEmailTriggerExtensionByPDF(pdfName) {
//     try {
//       const record = await db("Email_Trigger_Extension")
//         .where("generated_pdfName", pdfName)
//         .first();

//       return record;
//     } catch (error) {
//       console.error(
//         `Failed to get Email_Trigger_Extension record for PDF ${pdfName}:`,
//         error.message
//       );
//       throw error;
//     }
//   }
// }

// module.exports = EmailTriggerQueries;

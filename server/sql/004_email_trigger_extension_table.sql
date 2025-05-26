CREATE TABLE Email_Trigger_Extension (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_trigger_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    generated_pdfName TEXT CHECK (LENGTH(generated_pdfName) <= 1024),
    Document_Process_Status_id INTEGER NOT NULL,
    whenCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (email_trigger_id, generated_pdfName),
    FOREIGN KEY (email_trigger_id) REFERENCES Email_Trigger(id),
    FOREIGN KEY (template_id) REFERENCES Templates(id),
    FOREIGN KEY (Document_Process_Status_id) REFERENCES Document_Process_Status(id)
);
CREATE TABLE Email_Trigger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    uploadedSheetName TEXT CHECK (LENGTH(uploadedSheetName) <= 1024),
    whenCreated DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (userId, whenCreated),
    FOREIGN KEY (userId) REFERENCES Users(id)
);
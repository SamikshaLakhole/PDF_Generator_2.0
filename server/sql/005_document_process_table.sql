CREATE TABLE Document_Process_Status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT CHECK (status IN (
        'pdf-generation-inProgress',
        'pdf-generated',
        'pdf-generation-failed',
        'pdf-email-inProgress',
        'pdf-email-sent',
        'pdf-email-failed'
    )) NOT NULL,
    description TEXT CHECK (LENGTH(description) <= 1024)
);
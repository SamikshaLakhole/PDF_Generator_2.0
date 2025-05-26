# Document-Generator

An application that reads Excel data, populates Word templates with dynamic content, generates personalized PDF documents, encrypts them with passwords, and optionally sends them via email. All document processing is automated and can be run through WSL using LibreOffice and QPDF.

## Packages Used

### 1. Reading Excel Data
- [`read-excel-file`](https://www.npmjs.com/package/read-excel-file)

### 2. Word Template Processing
- [`pizzip`](https://www.npmjs.com/package/pizzip)
- [`docxtemplater`](https://www.npmjs.com/package/docxtemplater)

### 3. Converting Word to PDF

#### A. To install WSL (Windows Subsystem for Linux)
##### 1. Open PowerShell as Administrator

##### 2. Run the WSL Install Command
```sh
wsl --install
```
##### 3. Restart Your Computer


##### 4. Set Up Linux
 
- After the restart: The Ubuntu terminal will launch automatically.
- Set your Linux username and password when prompted.

#### B. Using LibreOffice Suite on WSL
Follow these steps to install and use LibreOffice on WSL:
```sh
sudo apt update
sudo apt install libreoffice
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
Restart Your Computer Again
```sh
nvm install v22
```
### 4. Encrypting PDF
Follow these steps to install and use `qpdf` on WSL:
```sh
sudo apt update 
sudo apt install qpdf -y
```

### 5. Database Setup (SQLite + Knex)

#### A. Install Dependencies
```sh
npm install knex sqlite3
```

#### B. Create knexfile.js
```sh
const path = require("path");
module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.join(__dirname, "database.sqlite"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
  },
};
```

#### C. Create Migration
```sh
npx knex migrate:make create_templates_table
```

 #### D. Define Migration/Schema
 Example :
 ```sh
exports.up = function (knex) {
  return knex.schema.createTable("templates", (table) => {
    table.increments("id").primary();
    table.string("title").notNullable();
    table.text("description").notNullable();
    table.string("word_file_path").notNullable();
    table.string("email_template_path").notNullable();
    table.string("uploaded_by").notNullable();
    table.timestamp("uploaded_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
    table.timestamp("deleted_at").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("templates");
};
```

#### E. Run Migration
 ```sh
npx knex migrate:latest
```

#### F. Create Database Connection
Create a new file db.js:
 ```sh
const knex = require("knex");
const config = require("./knexfile");

const db = knex(config.development);
module.exports = db;
```


#### G. Connect SQLite in DBeaver

1. [`DBeaver`](https://dbeaver.io/download/)

2. Open DBeaver.

3. Create a new connection:
- Click the "New Database Connection" button (plug icon on the top left), or go to Database > New Connection.

4. Choose SQLite:
- In the database list, type "SQLite" in the search bar and select SQLite.
- Click Next.

5. Specify SQLite database file:
- Click the "Browse..." button next to the Database file field.
- Select your .sqlite or .db file (or type a new name to create a new one).

6. Driver Configuration (if prompted):
- If DBeaver asks to download the SQLite driver, click Download.
- Let it finish the download and setup.

7. Test Connection:
- Click Test Connection to make sure everything is working.

8. Finish:
- Click Finish to connect and open the database.


## Navigate Backend folder
```sh
cd server
```

## Install Dependencies
```sh
npm install
```

## Running the Program
To run the program, use one of the following commands:
```sh
npm start
```
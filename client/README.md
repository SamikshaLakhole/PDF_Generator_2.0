
# 📄 Document Generator

A full-stack web application for generating and emailing PDF/Word documents, built with **React.js** for the frontend and **Express.js** for the backend. Includes features like document templating, file uploads, email notifications, and real-time updates via Socket.io.

---

## 🚀 Features

- 🧾 Generate documents from templates (`docx`, `pdf`)
- 📥 Upload and process Word/Excel files
- ✉️ Send generated documents via email (Azure Communication)
- 🔌 Real-time updates with SignalR & Socket.io
- 📁 Save files temporarily using `tmp` and `multer`
- 🖼 Responsive UI with MUI & Bootstrap

---

## 🏗 Project Structure

```
/public/              → Static assets
/src/                 → React frontend
/server.js            → Express backend entry point
/Routes/              → API routes
/build/               → Production React build (after `npm run build`)
package.json          → Merged frontend & backend configuration
```

---

## ⚙️ Installation

```bash
# Clone the repo
git clone https://github.com/Exaze/document_generator.git
cd document_generator

# Install dependencies
npm install
```

---

## 👨‍💻 Development Mode

Start both frontend and backend with one command:

```bash
npm run dev
```

This uses `concurrently` to run:
- React on http://localhost:3000
- Express on http://localhost:8000

---

## 🔨 Build for Production

```bash
npm run build
npm start
```

This will:
- Build React frontend into `/build`
- Serve it via Express from `server.js`

---

## 🧪 Testing

```bash
npm test
```

Runs tests using Jest.

---

## 🔐 Environment Variables

Create a `.env` file in the root with your config:

```env
PORT=8000
EMAIL_CONNECTION_STRING=<your_azure_email_connection_string>
```

You can extend this file as needed for other secrets or config values.

---

## 📦 Dependencies

### Backend:
- express, cors, multer, nodemailer, docx, puppeteer, socket.io, sqlite3

### Frontend:
- react, @mui/material, react-bootstrap, react-hook-form, axios, socket.io-client

---

## 📄 License

MIT License © 2025 Exaze Technologies Pvt. Ltd.

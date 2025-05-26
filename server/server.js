require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require('http');
const templatesRouter = require("./Routes/TemplatesRoute");
const generateDocumentsRouter = require("./Routes/GenerateDocumentRoute");
const emailRouter = require("./Routes/EmailRoute");
const knex = require("knex")(require("./knexfile").development);
const DocumentGenerationHub = require("./DocumentGenerationHub");
const verifyToken = require("./Middleware/verifyToken");

const app = express();
const PORT = 8000;
const server = http.createServer(app);

global.app = app;
const documentGenerationHub = new DocumentGenerationHub(server);
app.set("documentGenerationHub", documentGenerationHub);

app.use(
  cors({
    origin: "http://localhost:3000",
    exposedHeaders: ["Content-Disposition"],
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.db = knex;
  next();
});

app.use("/api/v1/templates", verifyToken, templatesRouter);
app.use("/api/v1", verifyToken, generateDocumentsRouter);
app.use("/api/v1", verifyToken, emailRouter);


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
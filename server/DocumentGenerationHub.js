const socketIO = require("socket.io");

class DocumentGenerationHub {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });
    this.documentGenerationNamespace = this.io.of("/document-generation");
    this.setupConnection();
  }

  setupConnection() {
    this.documentGenerationNamespace.on("connection", (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on("join-process", (processingId) => {
        socket.join(processingId);
        console.log(`Client ${socket.id} joined room: ${processingId}`);
      });

      socket.on("disconnect", () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Method to update clients about document generation status
  updateGenerationProgress(processingId, data) {
    this.documentGenerationNamespace
      .to(processingId)
      .emit("generation-progress", data);
  }

  // Method to notify about completed document
  documentGenerated(processingId, documentInfo) {
    this.documentGenerationNamespace
      .to(processingId)
      .emit("document-generated", documentInfo);
  }

  // Method to notify about document generation error
  documentError(processingId, errorInfo) {
    this.documentGenerationNamespace
      .to(processingId)
      .emit("document-error", errorInfo);
  }

  // Method to send final summary when all processing is complete
  generationCompleted(processingId, summary) {
    this.documentGenerationNamespace
      .to(processingId)
      .emit("generation-completed", summary);
  }
}

module.exports = DocumentGenerationHub;

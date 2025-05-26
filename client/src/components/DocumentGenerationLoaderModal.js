import React, { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import axios from "./axiosConfig";

import OperationModal from "./OperationModal";
import { getAuthHeaders } from "./getAccessTokenSecret";

const DocumentGenerationLoaderModal = ({ isOpen, processingId, onClose }) => {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const socketConnectedRef = useRef(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
  });
  const [generationSummary, setGenerationSummary] = useState(null);
  const [errorReportUrl, setErrorReportUrl] = useState(null);

  const connectSocket = () => {
    const socket = io(
      `${process.env.REACT_APP_API_BASE_URL}/document-generation`,
      {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      socketConnectedRef.current = true;
      socket.emit("join-process", processingId);
    });

    socket.on("generation-progress", (data) =>
      setGenerationProgress((prev) => ({ ...prev, ...data }))
    );

    socket.on("document-generated", () =>
      setGenerationProgress((prev) => ({
        ...prev,
        success: prev.success + 1,
        processed: prev.processed + 1,
      }))
    );

    socket.on("document-error", () =>
      setGenerationProgress((prev) => ({
        ...prev,
        failed: prev.failed + 1,
        processed: prev.processed + 1,
      }))
    );

    socket.on("generation-completed", (data) => {
      setGenerationSummary(data.summary);
      setErrorReportUrl(data.errorReport?.downloadUrl || null);
      setIsCompleted(true);
      setTimeout(() => socket.disconnect(), 500);
    });

    socket.on("disconnect", () => (socketConnectedRef.current = false));
  };

  const startPolling = () => {
    const intervalId = setInterval(async () => {
      try {
        const { data } = await axios.get(
          `/api/v1/document-status/${processingId}`,
          { headers: getAuthHeaders() }
        );

        if (data.status === "COMPLETED") {
          setGenerationSummary(data.summary);
          setErrorReportUrl(data.errorReport?.downloadUrl || null);
          setIsCompleted(true);
          clearInterval(intervalId);
        } else if (data.status === "PROCESSING") {
          setGenerationProgress((prev) => ({ ...prev, ...data.progress }));
        }
      } catch (error) {
        console.error("Error polling status:", error);
      }
    }, 2000);

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    if (processingId && !socketConnectedRef.current) {
      connectSocket();
    }
    return () => socketRef.current?.disconnect();
  }, [processingId]);

  useEffect(() => {
    if (processingId && generationProgress.total === 0) {
      const timeoutId = setTimeout(startPolling, 5000);
      return () => clearTimeout(timeoutId);
    }
  }, [processingId, generationProgress.total]);

  const handleCancelGeneration = async () => {
    setShowCancelConfirm(false);
    onClose();
    try {
      await axios.post(
        `/api/v1/cancel-generation/${processingId}`,
        {},
        { headers: getAuthHeaders() }
      );
    } catch (err) {
      console.error("Error while cancelling document generation:", err);
    } finally {
      socketRef.current?.disconnect();
      setGenerationSummary(null);
      setIsCompleted(false);
      setGenerationProgress({
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
      });
    }
  };

  const handleDownload = async () => {
    if (!errorReportUrl) return;
    try {
      const { data, headers } = await axios.get(errorReportUrl, {
        responseType: "blob",
        headers: getAuthHeaders(),
      });

      const blob = new Blob([data], {
        type:
          headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download =
        headers["content-disposition"]
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || "error_report.xlsx";
      link.click();
    } catch (err) {
      console.error("Download error:", err.message);
    }
  };

  const progressPercentage =
    generationProgress.total > 0
      ? Math.round(
          (generationProgress.processed / generationProgress.total) * 100
        )
      : 0;

  if (!isOpen) return null;

  return (
    <div className="modal">
      <div className="relative bg-white p-6 rounded-xl shadow-xl text-center w-full max-w-md m-2">
        {!isCompleted ? (
          <>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
              aria-label="Close"
            >
              ✕
            </button>
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-4 text-green-600" />
            <p className="text-lg font-semibold text-gray-800">
              Generating Documents
            </p>
          </>
        ) : (
          <p className="text-lg font-semibold text-gray-800 mb-2">
            Generation Complete
          </p>
        )}

        <div className="w-full bg-gray-200 rounded-full h-2.5 my-4">
          <div
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${isCompleted ? 100 : progressPercentage}%` }}
          ></div>
        </div>

        {generationProgress.total === 0 ? (
          "Preparing..."
        ) : (
          <p className="text-sm text-gray-700 mb-1">
            {isCompleted ? "Processed" : "Processing"}:{" "}
            <span className="font-medium">{generationProgress.processed}</span>{" "}
            of <span className="font-medium">{generationProgress.total}</span>
          </p>
        )}

        <div className="flex justify-center gap-6 mt-3">
          <div className="text-green-600">
            <span className="font-bold">{generationProgress.success}</span>{" "}
            <span className="text-xs">success</span>
          </div>
          <div className="text-red-600">
            <span className="font-bold">{generationProgress.failed}</span>{" "}
            <span className="text-xs">failed</span>
          </div>
        </div>

        {isCompleted && generationSummary && (
          <div className="flex flex-col items-center mt-4 border-t pt-4 space-y-4">
            <div className="flex flex-row space-x-4 items-center justify-center">
              {generationSummary.failed > 0 && errorReportUrl && (
                <button
                  onClick={handleDownload}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Download Error File
                </button>
              )}
              {generationSummary.success > 0 ? (
                <button
                  onClick={() => navigate("/send-email")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
                >
                  Proceed to Send Emails
                </button>
              ) : (
                <button onClick={onClose} className="cancel-btn">
                  Cancel
                </button>
              )}
            </div>
            {generationSummary.failed > 0 && (
              <span className="text-sm text-red-600 text-center">
                *The error report uses the same password as the Excel file.
              </span>
            )}
          </div>
        )}
      </div>

      <OperationModal
        isOpen={showCancelConfirm}
        type="delete"
        title="Cancel Generation?"
        message="Are you sure you want to cancel the document generation process? All progress will be lost and the uploaded Excel file will be deleted."
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelGeneration}
        confirmText="Yes, Cancel"
        cancelText="Go Back"
      />
    </div>
  );
};

export default DocumentGenerationLoaderModal;

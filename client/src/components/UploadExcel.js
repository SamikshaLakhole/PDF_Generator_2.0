import React, { useState, useRef } from "react";
import { Upload, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "./axiosConfig";

import DocumentGenerationLoaderModal from "./DocumentGenerationLoaderModal";
import { getIdToken } from "./getAccessTokenSecret";

function UploadExcel() {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [password, setPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [errors, setErrors] = useState({ file: "", password: "" });
  const [currentState, setCurrentState] = useState("starting");
  const [processingId, setProcessingId] = useState(null);
  const [showGenerationModal, setShowGenerationModal] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFileName(selectedFile.name);
      setFile(selectedFile);
      setErrors((prev) => ({ ...prev, file: "" }));
    }
  };

  const uploadFile = async (passwordToUse = "") => {
    const formData = new FormData();
    formData.append("excelFile", file);
    formData.append("password", passwordToUse);

    const secretValue = getIdToken();

    try {
      const res = await axios.post("/api/v1/documents", formData, {
        validateStatus: () => true,
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${secretValue}`,
        },
      });

      if (res.status === 401) {
        return { status: "PASSWORD_REQUIRED" };
      }

      if (res.status >= 200 && res.status < 300) {
        const data = res.data;
        if (data.processingId) {
          setProcessingId(data.processingId);
        }
        return { status: "SUCCESS", processingId: data.processingId };
      }

      return { status: "FAILED", error: res.data?.error || "Unknown error" };
    } catch (err) {
      return { status: "FAILED", error: err.message };
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      return setErrors((prev) => ({
        ...prev,
        file: "Please select an Excel file before generating documents",
      }));
    }

    setCurrentState("uploading");

    const result = await uploadFile();

    if (result.status === "PASSWORD_REQUIRED") {
      setCurrentState("starting");
      setShowPasswordModal(true);
    } else if (result.status === "SUCCESS") {
      setCurrentState("generating");
      setShowGenerationModal(true);
    } else {
      setCurrentState("starting");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (!password.trim()) {
      setErrors((prev) => ({ ...prev, password: "Password is required" }));
      return;
    }

    setCurrentState("verifying");

    const result = await uploadFile(password);

    if (result.status === "SUCCESS") {
      setShowPasswordModal(false);
      setPassword("");
      setCurrentState("generating");
      setShowGenerationModal(true);
    } else if (result.status === "PASSWORD_REQUIRED") {
      setCurrentState("starting");
      setErrors((prev) => ({
        ...prev,
        password: "Incorrect password. Please try again.",
      }));
    } else {
      setShowPasswordModal(false);
      setCurrentState("starting");
    }
  };

  const resetFileSelection = () => {
    setShowPasswordModal(false);
    setPassword("");
    setFile(null);
    setFileName("No file selected");
    setErrors((prev) => ({ ...prev, file: "", password: "" }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGenerationModalClose = () => {
    setCurrentState("starting");
    setShowGenerationModal(false);

    setProcessingId(null);

    resetFileSelection();
  };

  const isLoading = currentState !== "starting";
  const isVerifying = currentState === "verifying";

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-semibold">Upload Excel</h2>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Excel File
          </label>
          <div className={`flex items-center`}>
            <label
              className={`flex items-center gap-2 cursor-pointer bg-white-100 hover:bg-green-100 px-4 py-2 border ${
                errors.file ? "border-red-300" : "border-gray-300"
              } rounded-l-md text-green-600`}
            >
              <Upload size={24} />
              <span className="font-medium max-[425px]:hidden">Upload</span>
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                ref={fileInputRef}
              />
            </label>
            <span
              className={`flex-1 px-4 py-2 border border-l-0 ${
                errors.file
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300 bg-gray-50"
              } rounded-r-md truncate`}
            >
              {fileName}
            </span>
          </div>
          {errors.file && (
            <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
              <AlertCircle size={16} />
              <span>{errors.file}</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-4 sm:space-y-0">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate("/")}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center justify-center gap-2 text-sm"
            disabled={isLoading}
          >
            Generate Documents
          </button>
        </div>
      </form>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl m-2">
            <h3 className="text-lg font-semibold mb-4">
              Excel File is Password Protected
            </h3>
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Please enter the password
                  </label>
                  <div
                    className={`flex items-center border ${
                      errors.file ? "border-red-300" : "border-gray-300"
                    } rounded-md px-3 py-2 bg-gray-50`}
                  >
                    <Lock
                      size={18}
                      className={
                        errors.password ? "text-red-600" : "text-gray-500"
                      }
                    />
                    <input
                      type="password"
                      className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none px-2"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  {errors.password && (
                    <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                      <AlertCircle size={16} />
                      <span>{errors.password}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      resetFileSelection();
                    }}
                    hidden={isVerifying}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md flex items-center justify-center gap-2"
                    disabled={isVerifying}
                  >
                    {isVerifying && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    {isVerifying ? "Verifying..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DocumentGenerationLoaderModal
        isOpen={showGenerationModal}
        processingId={processingId}
        onClose={handleGenerationModalClose}
      />
    </div>
  );
}

export default UploadExcel;

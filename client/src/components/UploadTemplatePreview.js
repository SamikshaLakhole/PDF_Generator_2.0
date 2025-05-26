import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FileText, Mail, Eye, Edit, Send, X } from "lucide-react";
import axios from "./axiosConfig";

import OperationModal from "./OperationModal";
import { getIdToken } from "./getAccessTokenSecret";

function UploadTemplatePreview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [formData, setFormData] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    setFormData(location.state.formData);
  }, [location.state]);

  const handleMakeChanges = () => {
    navigate("/upload-template", { state: { formData } });
  };

  const handleConfirm = async () => {
    if (!formData) return;

    const form = new FormData();
    form.append("file", formData.file);
    form.append("title", formData.fileName);
    form.append("description", formData.description);
    form.append("subject", formData.subject);
    form.append("cc", formData.cc);
    form.append("body", formData.emailBody);
    form.append("uploadedBy", formData.uploadedBy);

    const secretValue = getIdToken();

    try {
      await axios.post("/api/v1/templates", form, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${secretValue}`,
        },
      });
      setShowSuccessModal(true);
      setUploadError(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Something went wrong while uploading the template.";
      setUploadError(errorMessage);
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    navigate("/");
  };

  const formatEmailBody = (text) => {
    if (!text) return "";

    return text.split("\n").map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split("\n").length - 1 && <br />}
      </React.Fragment>
    ));
  };

  if (!formData) return null;

  const ccEmails = formData.cc.split(", ").filter((email) => email.trim());

  return (
    <div className="outer-div max-w-3xl">
      <div className="flex flex-col space-y-6">
        {/* Template Preview Section */}
        <div className="flex items-center border-b pb-4">
          <FileText size={24} className="text-green-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">
            Template Preview
          </h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-300">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium">{formData.fileName}</span>
          </div>
          <p className="text-sm mb-2">{formData.description}</p>
          <button className="w-full bg-green-100 hover:bg-green-200 text-green-600 py-2 rounded-md">
            <a
              href={formData.file ? URL.createObjectURL(formData.file) : "#"}
              download={formData.fileName}
              className="w-full text-green-600 text-center flex items-center justify-center"
            >
              <Eye size={16} className="mr-2" />
              View
            </a>
          </button>
        </div>

        {/* Email Details Section */}
        <div className="flex items-center border-b pb-4">
          <Mail size={24} className="text-green-600 mr-2" />
          <h3 className="text-xl font-semibold text-gray-800">Email Details</h3>
        </div>

        <div className="bg-gray-50 p-4 rounded-md border border-gray-300 space-y-4">
          <div className="text-sm text-gray-800">
            <span className="font-bold">Subject: </span>
            <span>{formData.subject}</span>
          </div>

          {formData.cc && (
            <div className="text-sm text-gray-800 flex items-center gap-2 flex-wrap">
              <span className="font-bold">CC: </span>
              {ccEmails.map((email, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full border border-blue-200"
                >
                  {email.trim()}
                </span>
              ))}
            </div>
          )}

          <div>
            <div className="text-sm text-gray-800 mb-2">
              <span className="font-bold">Body: </span>
              <div className="bg-white p-3 border border-gray-200 rounded-md mt-1">
                {formatEmailBody(formData.emailBody)}
              </div>
            </div>
          </div>
        </div>
      </div>
      {uploadError && (
        <div className="mt-4 bg-red-100 p-3 rounded-md border text-red-600">
          <p>{uploadError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-6">
        <button
          onClick={handleMakeChanges}
          className="sm:px-6 p-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center"
        >
          <Edit size={16} className="sm:mr-2 sm:ml-2" />
          <span className="hidden sm:inline">Make Changes</span>
        </button>
        {uploadError ? (
          <button
            onClick={() => navigate("/home")}
            className="cancel-btn sm:px-6 p-2 flex items-center"
          >
            <X size={16} className="sm:mr-2 sm:ml-2 sm:inline" />
            <span className="hidden sm:inline">Cancel</span>
          </button>
        ) : (
          <button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700 text-white sm:px-6 p-2 rounded-md flex items-center"
          >
            <Send size={16} className="sm:mr-2 sm:ml-2" />
            <span className="hidden sm:inline">Confirm Upload</span>
          </button>
        )}
      </div>

      <OperationModal
        isOpen={showSuccessModal}
        type="upload"
        title="Template Successfully Uploaded"
        message="Your template is now ready to use."
        onConfirm={handleSuccessModalClose}
      />
    </div>
  );
}

export default UploadTemplatePreview;

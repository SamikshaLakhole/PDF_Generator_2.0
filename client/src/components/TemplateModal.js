import React from "react";

const TemplateModal = ({ isOpen, onClose, emailInfo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-md md:max-w-lg shadow-xl m-2 relative my-auto">
        <h3 className="text-lg font-semibold mb-4 pr-6">Email Template</h3>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="space-y-4">
          <div className="mb-4">
            <label className="block font-medium text-gray-700">
              Subject : {emailInfo.subject}
            </label>
          </div>

          <div className="mb-4">
            <label className="block font-medium text-gray-700">
              CC : {emailInfo.cc || "-"}
            </label>
          </div>

          <div className="mb-4">
            <label className="block font-medium text-gray-700">Body:</label>
            <pre className="bg-gray-100 p-4 rounded text-sm max-h-40 sm:max-h-64 md:max-h-80 overflow-auto whitespace-pre-wrap">
              {emailInfo.body
                ? emailInfo.body.replace(/^Body:/i, "").trim()
                : "No email body available"}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;

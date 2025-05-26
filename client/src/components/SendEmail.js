import React, { useState, useEffect, useCallback } from "react";
import { Folder } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "./axiosConfig";

import OperationModal from "./OperationModal";
import { getAuthHeaders } from "./getAccessTokenSecret";

function SendEmail() {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const navigate = useNavigate();

  const fetchGeneratedPDFs = useCallback(async () => {
    try {
      const response = await axios.get("/api/v1/documents", {
        headers: getAuthHeaders(),
      });
      const data = response.data;
      setPdfFiles(data.pdfs || []);
    } catch (err) {
      console.error("Failed to fetch PDFs:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchGeneratedPDFs();
  }, [fetchGeneratedPDFs]);

  const groupedByFolder = pdfFiles.reduce((acc, file) => {
    const folder = file.folder || "Uncategorized";
    const lowerSearch = searchTerm.toLowerCase();

    const matchesFolder = folder.toLowerCase().includes(lowerSearch);

    if (!matchesFolder) return acc;

    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(file);

    return acc;
  }, {});

  const handleToggleFolder = (folderName) => {
    navigate(`/documents/${encodeURIComponent(folderName)}?status=pending`);
  };

  const handleDeleteAllPDFs = async () => {
    try {
      await axios.delete("/api/v1/documents", {
        headers: getAuthHeaders(),
      });
      setShowDeleteAllModal(false);
      fetchGeneratedPDFs();
    } catch (err) {
      console.error("Error deleting all PDFs:", err.message);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <>
        <div className="mb-6 border-b pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Generated Documents</h2>
          <input
            type="text"
            placeholder="Search"
            className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm w-full md:w-1/4"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {Object.keys(groupedByFolder).length ? (
          <div>
            {Object.entries(groupedByFolder).map(([folder, files]) => (
              <div key={folder} className="mb-4">
                <div
                  className="cursor-pointer flex items-center justify-between p-3 border rounded-md bg-gray-100 hover:bg-gray-200 transition"
                  onClick={() => handleToggleFolder(folder)}
                >
                  <div className="flex items-center gap-2">
                    <Folder size={18} className="text-gray-500" />

                    <span className="font-medium text-blue-600">
                      {`${folder}-${files[0]?.originalFileName}`}
                      <span className="text-xs ml-2 text-gray-500">
                        ({files.length})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-base">
            No documents found.
          </div>
        )}

        {Object.values(groupedByFolder).flat().length > 0 && (
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="cancel-btn"
            >
              Delete All
            </button>
          </div>
        )}
      </>

      <OperationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        type="delete"
        message="This will delete all generated PDFs permanently. Do you want to proceed?"
        confirmText="Proceed"
        cancelText="Cancel"
        onConfirm={handleDeleteAllPDFs}
      />
    </div>
  );
}

export default SendEmail;

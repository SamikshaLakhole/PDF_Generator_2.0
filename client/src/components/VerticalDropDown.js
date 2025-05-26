import React, { useState, useRef, useEffect } from "react";
import { MoreVertical, Eye, Edit, Trash2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import OperationModal from "./OperationModal";
import { getAuthHeaders } from "./getAccessTokenSecret";

function VerticalDropDown({ file, onUpdate }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleDownload = async (url) => {
    try {
      const response = await axios.get(url, {
        responseType: "blob",
        headers: getAuthHeaders(),
      });

      const contentDisposition = response.headers["content-disposition"];
      const filename =
        contentDisposition?.match(/filename="?(.+?)"?$/)?.[1] ||
        "downloaded_file";

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error.message);
    } finally {
      setIsOpen(false);
    }
  };

  const handleApiCall = async (url, method, config = {}) => {
    try {
      await axios({ method, url, ...config });
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("API Call error:", error.response?.data || error.message);
    } finally {
      setIsOpen(false);
    }
  };

  const handleAction = {
    view: () => handleDownload(`/api/v1/templates/${file.id}/download`),
    edit: () => {
      navigate(`/editTemplate/${file.id}`, { state: { formData: file } });
      setIsOpen(false);
    },
    info: () => {
      setShowInfo(true);
      setIsOpen(false);
    },
    delete: () => {
      setShowDeleteModal(true);
      setIsOpen(false);
    },
    confirmDelete: async () => {
      setShowDeleteModal(false);
      await handleApiCall(`/api/v1/templates/${file.id}`, "DELETE", {
        headers: getAuthHeaders(),
      });
    },
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    return new Date(timestamp).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="p-1 rounded-full hover:bg-gray-100"
        aria-label="Options"
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-2 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200">
          <button
            onClick={handleAction.view}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
          >
            <Eye size={16} className="mr-2" /> View
          </button>
          <button
            onClick={handleAction.edit}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
          >
            <Edit size={16} className="mr-2" /> Edit
          </button>
          <button
            onClick={handleAction.info}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left lg:hidden"
          >
            <Info size={16} className="mr-2" /> Info
          </button>
          <button
            onClick={handleAction.delete}
            className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
          >
            <Trash2 size={16} className="mr-2" /> Delete
          </button>
        </div>
      )}

      {showInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 lg:hidden">
          <div className="bg-white p-4 rounded-lg w-full max-w-md mx-4">
            <h3 className="font-bold text-lg mb-2">{file.title}</h3>
            <div className="space-y-2">
              <p>
                <span className="font-semibold">
                  Description: {file.description}
                </span>
              </p>
              <p>
                <span className="font-semibold">
                  Uploaded by: {file.uploaded_by}
                </span>
              </p>
              <p>
                <span className="font-semibold">
                  Uploaded on: {formatDate(file.uploaded_at)}
                </span>
              </p>
              <p>
                <span className="font-semibold">
                  Last updated: {formatDate(file.updated_at)}
                </span>
              </p>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <OperationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        type="delete"
        title="Delete Template"
        message={`Do you want to delete "${file.title}"?`}
        onConfirm={handleAction.confirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

export default VerticalDropDown;

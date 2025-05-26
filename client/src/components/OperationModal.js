import React from "react";
import { CheckCircle, Trash2, Edit, Upload, AlertTriangle } from "lucide-react";

function OperationModal({
  isOpen,
  onClose,
  type = "success",
  title,
  message,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
}) {
  if (!isOpen) return null;

  // Modal configuration based on type
  const modalConfig = {
    success: {
      icon: <CheckCircle size={48} className="text-green-600" />,
      buttonColor: "bg-green-600 hover:bg-green-700",
      showCancel: false,
    },
    delete: {
      icon: <Trash2 size={48} className="text-red-600" />,
      buttonColor: "bg-red-600 hover:bg-red-700",
      showCancel: true,
    },
    edit: {
      icon: <Edit size={48} className="text-blue-600" />,
      buttonColor: "bg-blue-600 hover:bg-blue-700",
      showCancel: true,
    },
    upload: {
      icon: <Upload size={48} className="text-green-600" />,
      buttonColor: "bg-green-600 hover:bg-green-700",
      showCancel: false,
    },
    // failure: {
    //   icon: <AlertTriangle size={48} className="text-amber-500" />,
    //   buttonColor: "bg-amber-500 hover:bg-amber-600",
    //   showCancel: true,
    // },
    // confirm: {
    //   icon: <AlertCircle size={48} className="text-amber-500" />,
    //   buttonColor: "bg-blue-600 hover:bg-blue-700",
    //   showCancel: true,
    // },
  };

  // Use the confirm config as default if type doesn't match
  const config = modalConfig[type];

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
      {/* <div
        className="absolute inset-0 "
        onClick={onClose}
      ></div> */}
      <div className="bg-white p-8 rounded-lg shadow-lg text-center relative z-10 w-full max-w-md mx-4">
        <div className="flex items-center justify-center mb-4">
          {config.icon}
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
        {message && <p className="text-gray-600 mb-6">{message}</p>}

        <div className="flex justify-center space-x-4">
          {config.showCancel && (
            <button onClick={onClose} className="cancel-btn">
              {cancelText}
            </button>
          )}
          <button
            onClick={type === "success" ? onConfirm || onClose : onConfirm}
            className={`px-4 py-2 rounded-md ${config.buttonColor} text-white`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OperationModal;

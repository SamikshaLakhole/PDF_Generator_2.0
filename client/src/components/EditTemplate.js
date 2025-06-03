import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Plus, X, AlertCircle } from "lucide-react";
import axios from "./axiosConfig";

import OperationModal from "./OperationModal";
import { getAuthHeaders } from "./getAccessTokenSecret";

function EditTemplate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState({ type: null, isOpen: false });
  const [uploadError, setUploadError] = useState(null);

  const [ccInput, setCcInput] = useState("");
  const [ccList, setCcList] = useState([]);
  const [ccError, setCcError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { isDirty, errors },
  } = useForm({
    defaultValues: {
      title: "",
      description: "",
      subject: "",
      cc: "",
      body: "",
    },
  });

  const handleAddCC = () => {
    const trimmed = ccInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed) {
      setCcError("Please type an email address before adding.");
      return;
    }
    if (!emailRegex.test(trimmed)) {
      setCcError(`Invalid email format: ${trimmed}`);
      return;
    }
    if (ccList.includes(trimmed)) {
      setCcError(`Email already added: ${trimmed}`);
      return;
    }
    setCcList((prev) => [...prev, trimmed]);
    setCcInput("");
    setCcError("");
  };

  const handleRemoveCC = (email) => {
    setCcList((prev) => prev.filter((e) => e !== email));
  };

  useEffect(() => {
    setValue("cc", ccList.join(", "), { shouldDirty: true });
  }, [ccList, setValue]);

  useEffect(() => {
    const fetchTemplate = async () => {
      try {
        const { data } = await axios.get(`/api/v1/templates/${id}`, {
          headers: getAuthHeaders(),
        });

        const ccEmails = data.cc
          ? data.cc.split(", ").filter((email) => email.trim())
          : [];
        setCcList(ccEmails);

        reset({
          title: data.title || "",
          description: data.description || "",
          subject: data.subject || "",
          cc: data.cc || "",
          body: data.body || "",
        });
      } catch (error) {
        console.error("Failed to load template:", error);
      }
    };
    fetchTemplate();
  }, [id, reset]);

  const submitChanges = async (formData) => {
    const trimmedData = {
      ...formData,
      title: formData.title.trim(),
      description: formData.description.trim(),
      subject: formData.subject.trim(),
      cc: formData.cc?.trim(),
      body: formData.body.trim(),
    };
    try {
      await axios.put(`/api/v1/templates/${id}`, trimmedData, {
        headers: getAuthHeaders(),
      });
      setShowModal({ type: "success", isOpen: true });
      setUploadError(null);
    } catch (error) {
      setUploadError(
        error.response?.data?.message ||
          error.message ||
          "Something went wrong while updating the template."
      );
    }
  };

  const handleConfirm = async () => {
    const formData = await handleSubmit((data) => {
      submitChanges(data);
    })();
  };

  const handleModalClose = () => {
    setShowModal({ type: null, isOpen: false });
    if (showModal.type === "success") navigate("/home");
  };

  const handleCancel = () => navigate("/");

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-2xl font-semibold">Edit Template</h2>
      </div>

      <form
        onSubmit={handleSubmit(() => {
          setShowModal({ type: "confirm", isOpen: true });
        })}
        className="space-y-6"
      >
        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title<span className="text-red-600">*</span>
          </label>
          <input
            id="title"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
            {...register("title", {
              required: "Title is required",
              setValueAs: (v) => v.trim(),
            })}
          />
          {errors.title && (
            <p className="text-red-600 text-xs">{errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description<span className="text-red-600">*</span>
          </label>
          <textarea
            id="description"
            rows="3"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
            {...register("description", {
              required: "Description is required",
            })}
          />
          {errors.description && (
            <p className="text-red-600 text-xs">{errors.description.message}</p>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-6">
          <h2 className="text-xl font-semibold mb-4">Email Configuration</h2>

          <div className="space-y-2">
            <label
              htmlFor="subject"
              className="block text-sm font-medium text-gray-700"
            >
              Email Subject<span className="text-red-600">*</span>
            </label>
            <input
              id="subject"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
              {...register("subject", { required: "Subject is required" })}
            />
            {errors.subject && (
              <p className="text-red-600 text-xs">{errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2 mt-4">
            <label
              htmlFor="cc"
              className="block text-sm font-medium text-gray-700"
            >
              CC
            </label>
            <div className="flex gap-2">
              <input
                id="cc"
                placeholder="email@example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                value={ccInput}
                onChange={(e) => setCcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCC();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCC}
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Add Email"
              >
                <Plus size={16} />
              </button>
            </div>

            {ccError && (
              <p className="flex items-center gap-1 text-red-600 text-xs">
                <AlertCircle size={16} />
                <span>{ccError}</span>
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-2">
              {ccList.map((email) => (
                <span
                  key={email}
                  className="flex items-center bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full border border-blue-200"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => handleRemoveCC(email)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Remove email"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Click "+" to add emails individually or press Enter after typing
              an email
            </p>
          </div>

          <div className="space-y-2 mt-4">
            <label
              htmlFor="body"
              className="block text-sm font-medium text-gray-700"
            >
              Email Body<span className="text-red-600">*</span>
            </label>
            <textarea
              id="body"
              rows="6"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
              {...register("body", { required: "Email body is required" })}
            />
            {errors.body && (
              <p className="text-red-600 text-xs">{errors.body.message}</p>
            )}
          </div>
        </div>
        {uploadError && (
          <div className="mt-4 bg-red-100 p-3 rounded-md border text-red-600">
            <p>{uploadError}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-4 sm:space-y-0">
          <button type="button" onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            type="submit"
            disabled={!isDirty}
            className={`${
              isDirty
                ? "bg-green-600 hover:bg-green-700"
                : "bg-green-400 cursor-not-allowed"
            } text-white px-6 py-2 rounded-md`}
          >
            Save Changes
          </button>
        </div>
      </form>

      <OperationModal
        isOpen={showModal.type === "success" && showModal.isOpen}
        onClose={handleModalClose}
        type="success"
        title="Template Updated"
        message="Your changes have been saved successfully."
      />
    </div>
  );
}

export default EditTemplate;

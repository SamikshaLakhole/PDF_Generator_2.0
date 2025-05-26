import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Upload, AlertCircle, Plus, X } from "lucide-react";
import { useForm } from "react-hook-form";

import useUserProfile from "../hooks/useUserProfile";

function UploadTemplate() {
  const { account } = useUserProfile();
  const userName = account?.name ?? "User";
  const navigate = useNavigate();
  const location = useLocation();
  const [fileError, setFileError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [ccInput, setCcInput] = useState("");
  const [ccList, setCcList] = useState([]);

  const handleAddCC = () => {
    const trimmed = ccInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmed) return;
    if (!emailRegex.test(trimmed)) {
      setFileError(`Invalid email format: ${trimmed}`);
      return;
    }
    if (ccList.includes(trimmed)) {
      setFileError(`Email already added: ${trimmed}`);
      return;
    }

    setCcList((prev) => [...prev, trimmed]);
    setCcInput("");
    setFileError("");
  };

  const handleRemoveCC = (email) => {
    setCcList((prev) => prev.filter((e) => e !== email));
  };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fileName: "",
      description: "",
      subject: "",
      cc: "",
      emailBody: "",
      uploadedBy: userName,
    },
  });

  useEffect(() => {
    setValue("cc", ccList.join(", "));
  }, [ccList, setValue]);

  useEffect(() => {
    if (location.state?.formData) {
      const { file, ...restFormData } = location.state.formData;

      Object.entries(restFormData).forEach(([key, value]) => {
        setValue(key, value);
      });

      if (restFormData.cc) {
        const ccEmails = restFormData.cc
          .split(", ")
          .filter((email) => email.trim());
        setCcList(ccEmails);
      }

      if (file) {
        setSelectedFile(file);
      }
    }
  }, [location.state, setValue]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setSelectedFile(file);
      const fullName = file.name;
      const nameWithoutExtension = (
        fullName.substring(0, fullName.lastIndexOf(".")) || fullName
      ).trim();
      setValue("fileName", nameWithoutExtension);

      setFileError("");
    }
  };

  const onSubmit = (data) => {
    if (!selectedFile) {
      setFileError("Please upload a Word template file");
      return;
    }

    const formData = {
      ...data,
      fileName: data.fileName.trim(),
      description: data.description.trim(),
      subject: data.subject.trim(),
      cc: data.cc?.trim(),
      emailBody: data.emailBody.trim(),
      file: selectedFile,
      ccList: ccList,
    };

    navigate("/upload-template/preview", { state: { formData } });
  };

  const handleCancel = () => {
    navigate("/");
  };

  return (
    <div className="outer-div max-w-3xl">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-semibold">Upload Word Template</h2>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Template File <span className="text-red-600">*</span>
          </label>
          <div className="flex items-center">
            <label
              className={
                "flex items-center gap-2 cursor-pointer bg-white-100 hover:bg-green-100 px-4 py-2 border border-gray-300 rounded-l-md text-green-600"
              }
            >
              <Upload size={24} />
              <span className="font-medium max-[425px]:hidden">Upload</span>
              <input
                type="file"
                className="hidden"
                accept=".doc,.docx"
                onChange={handleFileChange}
              />
            </label>
            <span
              className={
                "flex-1 px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 truncate"
              }
            >
              {selectedFile ? selectedFile.name : "No file selected"}
            </span>
          </div>
          {fileError && (
            <p className="flex items-center gap-1 text-red-600 text-xs">
              <AlertCircle size={16} />
              <span>{fileError}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="fileName"
            className="block text-sm font-medium text-gray-700"
          >
            File Name <span className="text-red-600">*</span>
          </label>
          <input
            id="fileName"
            className="template-labels"
            {...register("fileName", { required: "File name is required" })}
          />
          {errors.fileName && (
            <p className="text-red-600 text-xs">{errors.fileName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description <span className="text-red-600">*</span>
          </label>
          <textarea
            id="description"
            rows="3"
            className="template-labels"
            {...register("description", {
              required: "Description is required",
            })}
          ></textarea>
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
              Email Subject <span className="text-red-600">*</span>
            </label>
            <input
              id="subject"
              className="template-labels"
              {...register("subject", {
                required: "Email subject is required",
              })}
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
                className="template-labels flex-1"
                placeholder="email@example.com"
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
                className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                title="Add Email"
              >
                <Plus size={16} />
              </button>
            </div>
            {fileError && (
              <p className="flex items-center gap-1 text-red-600 text-xs">
                <AlertCircle size={16} />
                <span>{fileError}</span>
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
                    className="ml-2 text-red-500 hover:text-red-700"
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
              htmlFor="emailBody"
              className="block text-sm font-medium text-gray-700"
            >
              Email Body <span className="text-red-600">*</span>
            </label>
            <textarea
              id="emailBody"
              rows="6"
              className="template-labels"
              {...register("emailBody", { required: "Email body is required" })}
            ></textarea>
            {errors.emailBody && (
              <p className="text-red-600 text-xs">{errors.emailBody.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="uploadedBy"
            className="block text-sm font-medium text-gray-700"
          >
            Uploaded By
          </label>
          <input
            id="uploadedBy"
            className="template-labels"
            readOnly
            {...register("uploadedBy")}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-4 space-y-4 sm:space-y-0">
          <button type="button" onClick={handleCancel} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" className="success-btn">
            Preview
          </button>
        </div>
      </form>
    </div>
  );
}

export default UploadTemplate;

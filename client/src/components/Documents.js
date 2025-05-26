import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "./axiosConfig";
import { Eye, Trash2 } from "lucide-react";
import { getAuthHeaders } from "./getAccessTokenSecret";
import OperationModal from "./OperationModal";
import TemplateModal from "./TemplateModal";
import EmailSendingProgress from "./EmailSendingProgress";

function Documents() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdfFiles, setPdfFiles] = useState([]);
  const folderName = decodeURIComponent(id);
  const [pdfToDelete, setPdfToDelete] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [emailTemplates, setEmailTemplates] = useState({});
  const [selectedEmailInfo, setSelectedEmailInfo] = useState({});
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [complete, setComplete] = useState(false);

  const fetchGeneratedPDFs = useCallback(async () => {
    try {
      const response = await axios.get("/api/v1/documents", {
        headers: getAuthHeaders(),
      });

      const filtered = (response.data.pdfs || []).filter(
        (pdf) => pdf.folder === folderName
      );
      setPdfFiles(filtered);
      filtered.forEach((pdf) => {
        console.log("Fetching template for:", pdf.name, "To:", pdf.to);
        fetchEmailTemplate(pdf.name, pdf.to);
      });
    } catch (err) {
      console.error("Failed to fetch PDFs:", err.message);
    }
  }, [folderName]);

  useEffect(() => {
    fetchGeneratedPDFs();
  }, [fetchGeneratedPDFs]);

  const fetchEmailTemplate = async (pdfName, toValue = "") => {
    try {
      const response = await axios.get(`/api/v1/email-template/${pdfName}`, {
        headers: getAuthHeaders(),
      });

      console.log(`Template for ${pdfName}:`, response.data);

      const content = response.data.emailContent || "";
      const ccMatch = content.match(/^CC:\s*(.*)$/m);
      const subjectMatch = content.match(/^Subject:\s*(.*)$/m);
      const bodyStartIndex = content.search(/\n\n/);
      const body =
        bodyStartIndex !== -1 ? content.slice(bodyStartIndex + 2) : content;

      setEmailTemplates((prev) => ({
        ...prev,
        [pdfName]: {
          content,
          to: toValue,
          cc: ccMatch?.[1]?.trim() || "",
          subject: subjectMatch?.[1]?.trim() || "",
          body: body.trim(),
        },
      }));
    } catch (err) {
      console.error(`Error fetching template for ${pdfName}:`, err.message);
    }
  };

  const handleViewTemplate = (pdfName) => {
    const template = emailTemplates[pdfName];
    if (!template) return alert("No content found for template.");

    setSelectedEmailInfo({
      To: template.to,
      cc: template.cc,
      subject: template.subject,
      body: template.body,
    });
    setShowTemplateModal(true);
  };

  // const handleSendEmail = async () => {
  //   setSending(true);
  //   let sentCount = 0;

  //   for (const file of pdfFiles) {
  //     const template = emailTemplates[file.name];
  //     if (!template) continue;

  //     try {
  //       await axios.post(
  //         "/api/v1/email",
  //         {
  //           to: [],
  //           cc: template.cc ? template.cc.split(",").map((e) => e.trim()) : [],
  //           subject: template.subject,
  //           body: template.body,
  //           htmlContent: `<p>${template.body.replace(/\n/g, "<br/>")}</p>`,
  //           pdfFileName: file.name,
  //         },
  //         { headers: getAuthHeaders() }
  //       );
  //     } catch (err) {
  //       console.error(`Email failed for ${file.name}:`, err.message);
  //     }

  //     sentCount++;
  //     setProgress(sentCount);
  //   }

  //   setComplete(true);
  // };

  const handleSendEmail = async () => {
    setSending(true);
    let sentCount = 0;

    for (const file of pdfFiles) {
      const template = emailTemplates[file.name];
      if (!template) continue;

      try {
        await axios.post(
          "/api/v1/email",
          {
            to: [],
            cc: template.cc ? template.cc.split(",").map((e) => e.trim()) : [],
            subject: template.subject,
            body: template.body,
            htmlContent: `<p>${template.body.replace(/\n/g, "<br/>")}</p>`,
            pdfFileName: file.name,
          },
          { headers: getAuthHeaders() }
        );
      } catch (err) {
        console.error(`Email failed for ${file.name}:`, err.message);
      }

      sentCount++;
      setProgress(sentCount);
    }

    setComplete(true);
  };

  const initDeletePDF = (pdfName) => {
    setPdfToDelete(pdfName);
    setShowDeleteModal(true);
  };

  const handleDeletePDF = async () => {
    try {
      await axios.delete(
        `/api/v1/pdf/${encodeURIComponent(folderName)}/${encodeURIComponent(
          pdfToDelete
        )}`,
        {
          headers: getAuthHeaders(),
        }
      );

      setShowDeleteModal(false);
      fetchGeneratedPDFs();
    } catch (err) {
      console.error("Error deleting PDF:", err.message);
    }
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

  const filteredPdfFiles = pdfFiles.filter((file) =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const progressPercentage = pdfFiles.length
    ? (progress / pdfFiles.length) * 100
    : 0;

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          <span className="text-blue-600">
            {pdfFiles.length > 0
              ? `${folderName}-${pdfFiles[0].originalFileName}`
              : folderName}
          </span>
        </h2>

        <input
          type="text"
          placeholder="Search"
          className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm w-full md:w-1/4"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredPdfFiles.length > 0 ? (
        <ul className="space-y-3">
          {filteredPdfFiles.map((file, index) => (
            <li
              key={index}
              className="flex justify-between items-center p-3 border rounded-md bg-gray-50"
            >
              <span className="font-medium text-sm">{file.name}</span>
              {emailTemplates[file.name] ? (
                <div className="text-gray-700 mt-1 flex flex-wrap items-center gap-1 text-xs sm:text-sm">
                  <span className="font-medium">Email Template:</span>
                  <button
                    onClick={() => handleViewTemplate(file.name)}
                    className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                  >
                    View Template
                  </button>
                </div>
              ) : (
                <span className="text-red-600 text-xs sm:text-sm mt-1 block">
                  No email template found
                </span>
              )}

              <div className="flex items-center gap-3">
                <button
                  className="text-blue-600 hover:text-blue-700"
                  onClick={() => {
                    window.open(`/api/v1/pdf/${file.name}`, "_blank");
                  }}
                >
                  <Eye size={20} />
                </button>
                <button
                  className="text-red-600 hover:text-red-700"
                  onClick={() => initDeletePDF(file.name)}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-gray-500 text-center py-8">
          No documents in this folder.
        </div>
      )}

      <div className="flex justify-between items-center gap-3 mt-6">
        <button onClick={() => navigate("/send-email")} className="cancel-btn">
          Back
        </button>

        <div className="flex gap-3">
          {filteredPdfFiles.length > 0 && (
            <>
              <button
                onClick={handleSendEmail}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md"
              >
                Send Email
              </button>
              <button
                onClick={() => setShowDeleteAllModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white cancel-btn"
              >
                Delete All
              </button>
            </>
          )}
        </div>
      </div>

      <OperationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        type="delete"
        message={`Do you want to delete ${pdfToDelete}?`}
        confirmText="Delete"
        onConfirm={handleDeletePDF}
      />

      <OperationModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        type="delete"
        message="This will delete all generated PDFs permanently. Do you want to proceed?"
        confirmText="Proceed"
        cancelText="Cancel"
        onConfirm={handleDeleteAllPDFs}
      />

      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        emailInfo={selectedEmailInfo}
      />

      <EmailSendingProgress
        sending={sending}
        complete={complete}
        progress={progress}
        progressPercentage={progressPercentage}
        pdfFiles={pdfFiles}
        redirectToHome={() => navigate("/home")}
      />
    </div>
  );
}

export default Documents;

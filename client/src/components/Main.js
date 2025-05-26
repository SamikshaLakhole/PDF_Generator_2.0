import React, { useState, useEffect } from "react";
import axios from "./axiosConfig";

import RecentlyModified from "./RecentlyModified";
import VerticalDropDown from "./VerticalDropDown";
import PaginationWrapper from "./PaginationWrapper";
import { getAuthHeaders } from "./getAccessTokenSecret";

const FileListTable = () => {
  const [files, setFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const filesPerPage = 5;

  const fetchFiles = async () => {
    try {
      const response = await axios.get("/api/v1/templates", {
        headers: getAuthHeaders(),
      });
      const data = response.data;
      console.log("Fetched Data:", data);

      if (data.templates && Array.isArray(data.templates)) {
        setFiles(data.templates);
      } else {
        console.error("Unexpected API response format:", data);
        setFiles([]);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpdate = () => {
    fetchFiles();
  };

  useEffect(() => {
    if (currentPage > pageCount && pageCount > 0) {
      setCurrentPage(pageCount);
    } else if (pageCount === 0) {
      setCurrentPage(1);
    }
  }, [files, searchTerm]);

  // const formatDate = (timestamp) => {
  //   if (!timestamp) return "-";
  //   return new Date(timestamp).toLocaleString("en-US", {
  //     year: "numeric",
  //     month: "short",
  //     day: "numeric",
  //     hour: "2-digit",
  //     minute: "2-digit",
  //   });
  // };

  const filteredFiles = files.filter(
    (file) =>
      file.title && file.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastFile = currentPage * filesPerPage;
  const indexOfFirstFile = indexOfLastFile - filesPerPage;
  const currentFiles = filteredFiles.slice(indexOfFirstFile, indexOfLastFile);
  const pageCount = Math.ceil(filteredFiles.length / filesPerPage);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  const truncateDescription = (text) => {
    if (!text || text.length <= 12) return text;
    return text.substring(0, 12) + "...";
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm">
      {/* Recently Modified Section */}
      {files.length > 0 && (
        <RecentlyModified files={files} onUpdate={handleUpdate} />
      )}

      {/* Uploaded Word Templates Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:space-x-2 px-4 md:p-6 bg-white">
        <h2 className="sm:text-xl font-semibold">
          Uploaded Word Templates ({filteredFiles.length})
        </h2>
        <div className="w-full sm:w-auto sm:ml-auto">
          <input
            type="text"
            placeholder="Search"
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Conditional Content Based on Files */}
      {files.length > 0 ? (
        filteredFiles.length > 0 ? (
          <>
            <div className="py-4">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="py-3 px-4 font-medium text-gray-500">
                      Sr. No
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500">
                      File name
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500 hidden md:table-cell">
                      Description
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500 hidden md:table-cell">
                      Uploaded by
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">
                      Uploaded on
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">
                      Last updated
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-500 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {currentFiles.map((file, index) => (
                    <tr
                      key={file.id || index}
                      className="border-t border-gray-200 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        {indexOfFirstFile + index + 1}
                      </td>
                      <td className="py-3 px-4">{file.title}</td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="relative group">
                          <span>{truncateDescription(file.description)}</span>
                          {file.description && file.description.length > 12 && (
                            <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 z-10 w-64 top-0 left-1/2 transform -translate-x-1/2 mt-6">
                              {file.description}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {file.uploaded_by}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {/* {formatDate(file.uploaded_at)} */}
                        {file.uploaded_at}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        {/* {formatDate(file.updated_at)} */}
                        {file.updated_at}
                      </td>
                      <td className="py-3 px-4 relative">
                        <VerticalDropDown file={file} onUpdate={handleUpdate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <PaginationWrapper
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <div className="text-center py-12 text-gray-500 text-base">
            No matching templates found.
          </div>
        )
      ) : (
        <div className="text-center py-12 text-gray-500 text-base">
          No templates uploaded.
        </div>
      )}
    </div>
  );
};

export default FileListTable;

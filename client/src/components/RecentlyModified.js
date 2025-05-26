import React from "react";
import VerticalDropDown from "./VerticalDropDown";

function RecentlyModified({ files, onUpdate }) {
  const recentlyModified = [...files]
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.lastUpdated) -
        new Date(a.updated_at || a.lastUpdated)
    )
    .slice(0, 3);

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-xl font-semibold mb-4">Recently Modified</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recentlyModified.map((file) => (
          <div
            key={`recent-${file.id}`}
            className="flex border border-gray-200 rounded-lg p-3 bg-gray-50 hover:bg-gray-100"
          >
            <div className="flex-1">
              <div className="font-medium text-blue-600">{file.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                {file.description}
              </div>
            </div>
            <VerticalDropDown file={file} onUpdate={onUpdate} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default RecentlyModified;

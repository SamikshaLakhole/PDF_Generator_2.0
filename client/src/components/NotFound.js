import React from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center w-full h-screen">
      <div className="max-w-md px-6 text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-300">404</h1>
        <h2 className="mb-3 text-2xl font-semibold text-gray-800">
          Page Not Found
        </h2>
        <p className="mb-8 text-gray-600">
          Sorry, the page you are looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate("/home")}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;

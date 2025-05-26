import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export const SignInButton = () => {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch((e) => {
      console.log(e);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="sm:w-full max-w-md p-8 bg-white rounded-lg shadow-md flex flex-col items-center">
        <div className="mb-8">
          <img src="/Logo.jpg" alt="Exaze Logo" className="h-20" />
        </div>
        <button
          onClick={handleLogin}
          className="w-full py-3 px-4 bg-green-600 text-white rounded-full flex items-center justify-center text-lg font-medium cursor-pointer hover:bg-green-700 transition"
        >
          Log in with Microsoft
        </button>
      </div>
    </div>
  );
};

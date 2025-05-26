import React from "react";
import { Loader2 } from "lucide-react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useMsal } from "@azure/msal-react";

import { SignInButton } from "./components/SignInButton";
import AppLayout from "./layouts/AppLayout";
import ProtectedRoute from "./routes/ProtectedRoute";
import Documents from "./components/Documents";

import Main from "./components/Main";
import UploadTemplate from "./components/UploadTemplate";
import UploadTemplatePreview from "./components/UploadTemplatePreview";
import EditTemplate from "./components/EditTemplate";
import UploadExcel from "./components/UploadExcel";
import SendEmail from "./components/SendEmail";
import NotFound from "./components/NotFound";

export default function App() {
  const { accounts, inProgress } = useMsal();
  const isAuthenticated = accounts.length > 0;

  if (inProgress !== "none") {
    return (
      <div className="flex gap-2 items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-lg font-semibold">Loading...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/home" replace /> : <SignInButton />
          }
        />

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Main />} />
          <Route path="/upload-template" element={<UploadTemplate />} />
          <Route
            path="/upload-template/preview"
            element={<UploadTemplatePreview />}
          />
          <Route path="/upload-excel" element={<UploadExcel />} />
          <Route path="/send-email" element={<SendEmail />} />
          <Route path="/documents/:id" element={<Documents />} />
          <Route path="/editTemplate/:id" element={<EditTemplate />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

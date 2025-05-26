import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useMsal, useAccount } from "@azure/msal-react";
import { InteractionRequiredAuthError } from "@azure/msal-browser";

const ProtectedRoute = ({ children }) => {
  const { instance, accounts, inProgress } = useMsal();
  const account = useAccount(accounts[0] || {});
  const [checkingToken, setCheckingToken] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!account) {
        setCheckingToken(false);
        return;
      }

      try {
        const response = await instance.acquireTokenSilent({
          scopes: ["User.Read"], // replace with your app scopes
          account,
        });

        // Token is valid and not expired
        if (response.accessToken) {
          setIsAuthenticated(true);
        }
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          try {
            // Try interactive fallback if silent token fails
            await instance.acquireTokenPopup({
              scopes: ["User.Read"],
              account,
            });
            setIsAuthenticated(true);
          } catch (popupError) {
            console.error("Interactive token acquisition failed:", popupError);
            await instance.logoutRedirect();
          }
        } else {
          console.error("Token acquisition failed:", error);
          await instance.logoutRedirect();
        }
      } finally {
        setCheckingToken(false);
      }
    };

    verifyToken();
  }, [account, instance]);

  if (inProgress !== "none" || checkingToken) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <p className="text-lg font-semibold">Checking authentication...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
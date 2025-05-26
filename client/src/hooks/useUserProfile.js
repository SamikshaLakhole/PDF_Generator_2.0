import { useState, useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { callMsGraph } from "../graph";

const useUserProfile = () => {
  const { instance, accounts } = useMsal();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (accounts.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const response = await instance.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        const data = await callMsGraph(response.accessToken);
        setProfile(data);
      } catch (err) {
        setError(err);
        console.error("Error fetching user profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [instance, accounts]);

  return { profile, loading, error, account: accounts[0] ?? null };
};

export default useUserProfile;

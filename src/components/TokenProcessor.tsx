import React from "react";
import { useNavigate } from "react-router-dom";
import { setToken } from "@/lib/auth";
import { popTokenFromLocation } from "@/lib/oauth";

export default function TokenProcessor() {
  const navigate = useNavigate();

  React.useEffect(() => {
    try {
      const { token, cleanedUrl } = popTokenFromLocation();
      if (token) {
        console.log("TokenProcessor: extracted token", token);
        setToken(token);
        console.log("TokenProcessor: token saved, cleaning URL to", cleanedUrl);
        // replace the URL to the cleaned one (removes token fragments)
        window.history.replaceState(null, "", cleanedUrl);
        // navigate into the app root (replace history)
        navigate("/", { replace: true });
      }
    } catch (e) {
      console.error("TokenProcessor error", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

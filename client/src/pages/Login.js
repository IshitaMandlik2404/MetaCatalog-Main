
// client/src/pages/Login.js
import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { useNavigate, useLocation } from "react-router-dom";

export default function Login() {
  const { instance, accounts } = useMsal();
  const navigate = useNavigate();
  const location = useLocation();

  // If user was sent to /login from a protected route, go back there after login.
  const from = location.state?.from?.pathname || "/"; // default landing page

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      navigate(from, { replace: true }); // go to intended page
    } catch (e) {
      console.error("Login failed:", e);
    }
  };

  const handleLogout = () => instance.logoutPopup();

  const signedIn = accounts && accounts.length > 0;

  return (
    <div style={{ padding: 30 }}>
      {!signedIn ? (
        <>
          <h1>MetaCatalog Login</h1>
          <p>Please sign in with your organization account</p>
          <button onClick={handleLogin}>Sign In</button>
        </>
      ) : (
        <>
          <h2>Welcome, {accounts[0].username}</h2>
          <button onClick={() => navigate("/")}>Go to Home</button>
          <button onClick={handleLogout} style={{ marginLeft: 10 }}>
            Logout
          </button>
        </>
      )}
    </div>
  );
}


export const msalConfig = {
  auth: {
    clientId: "7de4e894-b17b-4a2e-ae6b-844d8fb85855", // Your App Registration Client ID
    authority: "https://login.microsoftonline.com/5501edf8-56e7-47c5-8cde-a3f87fe1ec0d", // <-- Changed for multi-tenant
    redirectUri: "http://localhost:3000/", // Must match Azure App Registration
  }
};

export const loginRequest = {
  scopes: ["User.Read"] // You can add API scopes later
};

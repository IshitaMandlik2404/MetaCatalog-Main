
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// MSAL imports
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './authConfig';

// Create MSAL instance
const msalInstance = new PublicClientApplication(msalConfig);

// Handle redirects (important for popup/redirect login flows)
msalInstance.handleRedirectPromise().catch((error) => {
  console.error("MSAL Redirect Error:", error);
});

// Mount React App
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);

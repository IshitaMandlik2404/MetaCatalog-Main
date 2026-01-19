
// client/src/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

export default function ProtectedRoute({ children, allowed = [] }) {
  const { accounts } = useMsal();
  const signedIn = accounts && accounts.length > 0;
  const location = useLocation();

  if (!signedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const role = (localStorage.getItem('userRole') || '').toLowerCase();

  if (!role) {
    return <div style={{ padding: 24 }}>Loading access…</div>;
  }

  if (allowed.length && !allowed.includes(role)) {
    return (
      <div style={{ padding: 24, color: '#b91c1c' }}>
        You don't have access to this page (role: {role}).
      </div>
    );
  }

  return children;
}


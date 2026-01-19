
// client/src/App.js
import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';

import Login from './pages/Login';
import Home from './pages/Home';
import BusinessMetadataConfig from './pages/BusinessMetadataConfig';
import InputBusinessMetadata from './pages/InputBusinessMetadata';
import SearchAndView from './pages/SearchAndView';
import ProtectedRoute from './ProtectedRoute';
import { loginRequest } from './authConfig';

function Header() {
  const { instance, accounts } = useMsal();
  const signedIn = accounts && accounts.length > 0;

  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || '');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState('');

  // Gather BOTH identifiers so the backend can match user_object_id/aad_object_id or acc_user
  const { oid, upn } = useMemo(() => {
    if (!signedIn) return { oid: '', upn: '' };
    const acc = accounts[0];
    return {
      oid: acc?.idTokenClaims?.oid || acc?.idTokenClaims?.sub || '',
      upn: acc?.username || acc?.idTokenClaims?.preferred_username || ''
    };
  }, [signedIn, accounts]);

  // Clear cached role if the account changes (prevents stale role when switching users)
  useEffect(() => {
    if (!signedIn) {
      localStorage.removeItem('userRole');
      localStorage.removeItem('lastUpn');
      setUserRole('');
      setRoleError('');
      setRoleLoading(false);
    } else {
      const lastUpn = localStorage.getItem('lastUpn') || '';
      if (upn && lastUpn && lastUpn.toLowerCase() !== upn.toLowerCase()) {
        localStorage.removeItem('userRole');
        setUserRole('');
      }
      if (upn) localStorage.setItem('lastUpn', upn);
    }
  }, [signedIn, upn]);

  // Fetch role after login (or when account changes)
  useEffect(() => {
    if (!signedIn || (!oid && !upn)) return;

    const controller = new AbortController();
    let mounted = true;

    async function fetchRole() {
      setRoleLoading(true);
      setRoleError('');

      try {
        // If you secure the API later with AAD, acquire a token and pass Authorization header.
        // const tokenResp = await instance.acquireTokenSilent(loginRequest);
        // const headers = { Authorization: `Bearer ${tokenResp.accessToken}` };

        const qs = new URLSearchParams();
        if (oid) qs.append('oid', oid);
        if (upn) qs.append('upn', upn);

        const res = await fetch(`/api/user-role?${qs.toString()}`, {
          method: 'GET',
          // headers,
          signal: controller.signal
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const role = (data?.role || 'viewer').toLowerCase();
        if (!mounted) return;

        setUserRole(role);
        localStorage.setItem('userRole', role);
        if (upn) localStorage.setItem('lastUpn', upn);

        console.log('[AUTO ROLE]', { oid, upn, role, apiResponse: data });
      } catch (e) {
        console.error('Role fetch failed:', e);
        if (!mounted) return;
        setRoleError('Could not load role. Limited access applied.');
        setUserRole('viewer'); // safe fallback
        localStorage.setItem('userRole', 'viewer');
      } finally {
        if (mounted) setRoleLoading(false);
      }
    }

    fetchRole();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [signedIn, oid, upn /*, instance*/]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup(loginRequest);
      // Optionally redirect after sign-in:
      // window.location.replace('/');
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('lastUpn');
    setUserRole('');
    setRoleError('');
    setRoleLoading(false);
    instance.logoutPopup();
  };

  // Tabs by role
  const tabs = [
    { path: '/', label: 'Home', roles: ['admin', 'editor', 'viewer'] },
    { path: '/business-metadata-config', label: 'Business Metadata Config', roles: ['admin'] },
    { path: '/input-business-metadata', label: 'Input Business Metadata', roles: ['admin', 'editor'] },
    // Viewer sees "Search & View" (this acts as the viewer tab)
    { path: '/search-and-view', label: 'Search & View', roles: ['admin', 'editor', 'viewer'] },
  ];

  const visibleTabs = signedIn && userRole
    ? tabs.filter(t => t.roles.includes(userRole))
    : [];

  return (
    <header style={{ padding: '10px 16px', backgroundColor: '#f4f4f4', borderBottom: '1px solid #ddd' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: App brand / navigation */}
        <nav style={{ display: 'flex', gap: 12 }}>
          {!signedIn && <Link to="/" style={{ textDecoration: 'none' }}>Home</Link>}

          {signedIn && roleLoading && (
            <span style={{ color: '#666' }}>Loading role…</span>
          )}

          {signedIn && !roleLoading && userRole && visibleTabs.map(tab => (
            <Link key={tab.path} to={tab.path} style={{ textDecoration: 'none' }}>
              {tab.label}
            </Link>
          ))}
        </nav>

        {/* Right: Auth state */}
        <div>
          {signedIn && !roleLoading && userRole && (
            <span style={{
              marginRight: 12,
              padding: '2px 8px',
              background: '#10b981',
              color: 'white',
              borderRadius: 14,
              fontSize: 12,
              fontWeight: 700
            }}>
              {userRole.toUpperCase()}
            </span>
          )}
          {roleError && <span style={{ color: '#b91c1c', fontSize: 12, marginRight: 8 }}>{roleError}</span>}

          <AuthenticatedTemplate>
            <span style={{ marginRight: 12 }}>
              Signed in as <strong>{signedIn ? accounts[0]?.username : ''}</strong>
            </span>
            <button onClick={handleLogout}>Logout</button>
          </AuthenticatedTemplate>

          <UnauthenticatedTemplate>
            <span style={{ marginRight: 12 }}>Not signed in</span>
            <button onClick={handleLogin}>Sign In</button>
          </UnauthenticatedTemplate>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected (role aware) */}
        <Route
          path="/"
          element={
            <ProtectedRoute allowed={['admin', 'editor', 'viewer']}>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/business-metadata-config"
          element={
            <ProtectedRoute allowed={['admin']}>
              <BusinessMetadataConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/input-business-metadata"
          element={
            <ProtectedRoute allowed={['admin', 'editor']}>
              <InputBusinessMetadata />
            </ProtectedRoute>
          }
        />
        <Route
          path="/search-and-view"
          element={
            <ProtectedRoute allowed={['admin', 'editor', 'viewer']}>
              <SearchAndView />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

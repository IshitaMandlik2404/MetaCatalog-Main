
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
// import Main from './pages/Main';
import Home from './pages/Home';
import BusinessMetadataConfig from './pages/BusinessMetadataConfig';
import InputBusinessMetadata from './pages/InputBusinessMetadata';
import SearchAndView from './pages/SearchAndView';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/"  element={<Home />} />
        <Route path="/business-metadata-config" element={<BusinessMetadataConfig />} />
        <Route path="/input-business-metadata" element={<InputBusinessMetadata />} />
        <Route path="/search-and-view" element={<SearchAndView />} />
      </Routes>
    </BrowserRouter>
  );
}

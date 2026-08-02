import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Login/Login';
import MyDocuments from './pages/MyDocuments/MyDocuments';
import ApplicationFlow from './pages/ApplicationFlow/ApplicationFlow';
import History from './pages/History/History';
import Profile from './pages/Profile/Profile';
import MergeFiles from './pages/MergeFiles/MergeFiles';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<MyDocuments />} />
            <Route path="create" element={<ApplicationFlow />} />
            <Route path="history" element={<History />} />
            <Route path="profile" element={<Profile />} />
            <Route path="merge" element={<MergeFiles />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

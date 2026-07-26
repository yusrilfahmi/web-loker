import React, { useState } from 'react';
import { Outlet, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BriefcaseBusiness, FileText, User, LogOut } from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const { session, user, signOut } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar (logout)?')) {
      await signOut();
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout-container">
      <nav className="navbar">
        <div className="nav-brand">
          <div className="logo-icon-small">
            <BriefcaseBusiness size={20} color="white" />
          </div>
          <div className="brand-text">
            <span className="brand-title">JobApply AI</span>
            <span className="brand-subtitle">AI Job Application Assistant</span>
          </div>
        </div>

        <div className="nav-links">
          <NavLink to="/create" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <BriefcaseBusiness size={18} />
            Buat Lamaran
          </NavLink>
          <NavLink to="/history" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <FileText size={18} />
            Riwayat Lamaran
          </NavLink>
          <NavLink to="/" className={({isActive}) => isActive ? "nav-item active" : "nav-item"} end>
            <FileText size={18} />
            Dokumen Saya
          </NavLink>
          <NavLink to="/profile" className={({isActive}) => isActive ? "nav-item active" : "nav-item"}>
            <User size={18} />
            Profil
          </NavLink>
        </div>

        <div className="nav-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="user-profile">
            <img src={user?.user_metadata?.avatar_url || "https://ui-avatars.com/api/?name=User"} alt="Avatar" className="avatar" />
            <span className="user-name">{user?.user_metadata?.full_name || user?.email}</span>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', border: '1px solid #fecaca', background: '#fef2f2',
              color: '#ef4444', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              fontWeight: 500
            }}
            title="Keluar"
          >
            <LogOut size={15} /> Keluar
          </button>
        </div>
      </nav>
      
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

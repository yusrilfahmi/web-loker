import React from 'react';
import { Outlet, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BriefcaseBusiness, FileText, User, LogOut, History, GitMerge, Loader2 } from 'lucide-react';
import './Layout.css';

const Layout = () => {
  const { session, user, signOut, isProfileComplete, profileLoaded } = useAuth();
  const location = useLocation();

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar (logout)?')) {
      await signOut();
    }
  };

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Tampilkan loading spinner sementara profile sedang dimuat
  if (!profileLoaded) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', flexDirection: 'column', gap: '16px',
        background: 'var(--bg-main, #f5f6fa)'
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: '#4F46E5' }} />
        <span style={{ color: '#6B7280', fontSize: '14px' }}>Memuat data profil...</span>
      </div>
    );
  }

  // Redirect ke profil jika belum lengkap dan bukan sedang di /profile
  if (profileLoaded && !isProfileComplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace />;
  }

  const navItems = [
    { to: '/create', icon: BriefcaseBusiness, label: 'Buat Lamaran', end: false },
    { to: '/history', icon: History, label: 'Riwayat', end: false },
    { to: '/', icon: FileText, label: 'Dokumen', end: true },
    { to: '/merge', icon: GitMerge, label: 'Gabungkan File', end: false },
    { to: '/profile', icon: User, label: 'Profil', end: false },
  ];

  return (
    <div className="layout-container">
      {/* ── Top Navbar ── */}
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

        {/* Desktop Nav Links */}
        <div className="nav-links">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </div>

        {/* Desktop Nav Actions */}
        <div className="nav-actions">
          <div className="user-profile">
            <img
              src={user?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || user?.email || 'U')}&background=4F46E5&color=fff`}
              alt="Avatar"
              className="avatar"
            />
            <span className="user-name">
              {user?.user_metadata?.full_name || user?.email}
            </span>
          </div>
          <button onClick={handleLogout} className="btn-logout" title="Keluar">
            <LogOut size={15} /> Keluar
          </button>
        </div>
      </nav>

      {/* Profile incomplete banner */}
      {profileLoaded && !isProfileComplete && location.pathname === '/profile' && (
        <div className="profile-incomplete-banner">
          ⚠️ <strong>Lengkapi profil Anda</strong> terlebih dahulu agar bisa menggunakan semua fitur.
          Isi minimal: Nama, Telepon, Pendidikan, dan Jurusan.
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="mobile-bottom-nav">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'mobile-nav-item active' : 'mobile-nav-item'
            }
          >
            <span className="mobile-nav-icon">
              <Icon size={22} />
            </span>
            <span className="mobile-nav-label">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;

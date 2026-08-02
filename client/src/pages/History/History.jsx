import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Briefcase, MapPin, Clock, Building, Plus, ChevronRight, FileText, AlertCircle, User, Mail, GraduationCap, AlignLeft, X, Trash2, Search } from 'lucide-react';
import GmailModal from '../../components/GmailModal/GmailModal';
import '../ApplicationFlow/Step2Analysis.css';
import './History.css';

const History = () => {
  const { user, profile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gmailApp, setGmailApp] = useState(null); // app selected for gmail modal
  const navigate = useNavigate();

  useEffect(() => {
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    const currentUser = user || (await supabase.auth.getUser()).data?.user;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setApplications(data);
    }
    setLoading(false);
  };

  const handleGmailDraft = (app) => {
    setGmailApp(app);
    setSelectedApp(null); // close detail modal
  };

  const statusConfig = {
    draft:    { label: 'Draft',     color: '#6b7280', bg: '#f3f4f6' },
    sent:     { label: 'Terkirim',  color: '#2563eb', bg: '#eff6ff' },
    review:   { label: 'Ditinjau', color: '#d97706', bg: '#fffbeb' },
    accepted: { label: 'Diterima', color: '#16a34a', bg: '#f0fdf4' },
    rejected: { label: 'Ditolak',  color: '#dc2626', bg: '#fef2f2' },
  };

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Apakah Anda yakin ingin menghapus riwayat lamaran ini?")) return;
    
    // Hapus langsung dari Supabase
    setApplications(prev => prev.filter(app => app.id !== id));
    try {
      await supabase.from('applications').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  };

  const handleImageError = async (e, url) => {
    // Jika gambar public gagal dimuat (mungkin bucket private), coba pakai signed URL
    if (url && url.includes('/object/public/user_documents/')) {
      const path = url.split('/object/public/user_documents/')[1];
      if (path) {
        const { data } = await supabase.storage.from('user_documents').createSignedUrl(path, 3600);
        if (data && data.signedUrl) {
          e.target.src = data.signedUrl;
          return;
        }
      }
    }
    // Sembunyikan gambar jika tetap gagal
    e.target.style.display = 'none';
  };

  const userProfileStored = profile || {};

  return (
    <div className="history-page">
      {/* Gmail Template Modal */}
      <GmailModal
        isOpen={!!gmailApp}
        onClose={() => setGmailApp(null)}
        aiData={gmailApp}
        userProfile={{ ...userProfileStored, full_name: userProfileStored.full_name || user?.user_metadata?.full_name || user?.email }}
      />
      <div className="history-header">
        <div className="history-header-title">
          <h1>Riwayat Lamaran</h1>
          <p>Pantau status semua lamaran pekerjaan yang pernah Anda buat.</p>
        </div>
        <div className="history-header-actions">
          <div className="history-search-box">
            <Search size={16} color="#6b7280" className="search-icon" />
            <input 
              type="text" 
              placeholder="Cari nama perusahaan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="history-search-input"
            />
          </div>
          <button className="btn-new-app" onClick={() => navigate('/create')}>
            <Plus size={16} /> Buat Lamaran Baru
          </button>
        </div>
      </div>

      {loading ? (
        <div className="history-loading">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="history-skeleton" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="history-empty">
          <div className="empty-icon"><FileText size={48} color="#c4b5fd" /></div>
          <h3>Belum Ada Riwayat Lamaran</h3>
          <p>Mulai buat lamaran pertama Anda dan lacak prosesnya di sini.</p>
          <button className="btn-new-app" onClick={() => navigate('/create')}>
            <Plus size={16} /> Buat Lamaran Sekarang
          </button>
        </div>
      ) : (
        <div className="history-list">
          {applications.filter(app => !searchQuery || (app.company || '').toLowerCase().includes(searchQuery.toLowerCase())).map(app => {
            const st = statusConfig[app.status] || statusConfig.draft;
            return (
              <div key={app.id} className="history-card">
                <div className="hc-left">
                  <div className="hc-company-logo">
                    <Building size={24} color="var(--primary)" />
                  </div>
                  <div className="hc-info">
                    <div className="hc-top">
                      <h3 className="hc-position">{app.position || 'Posisi tidak diketahui'}</h3>
                      <span className="hc-status" style={{ color: st.color, background: st.bg }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="hc-company">{app.company || '-'}</p>
                    <div className="hc-meta">
                      {app.location && <span><MapPin size={13} /> {app.location}</span>}
                      {app.type    && <span><Briefcase size={13} /> {app.type}</span>}
                      <span><Clock size={13} /> {formatDate(app.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="hc-actions">
                  <button className="hc-detail-btn" onClick={() => setSelectedApp(app)}>
                    Detail <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(e, app.id)}
                    className="hc-delete-btn"
                    title="Hapus Riwayat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail Modal ─── */}
      {selectedApp && (
        <div className="history-modal-overlay" onClick={() => setSelectedApp(null)}>
          <div className="history-modal-content" onClick={e => e.stopPropagation()}>
            <div className="history-modal-header">
              <h2>Detail Lamaran - {selectedApp.position || 'Posisi'}</h2>
              <button className="history-modal-close" onClick={() => setSelectedApp(null)}>
                <X size={24} />
              </button>
            </div>
            
            <div className="step2-layout" style={{ marginTop: '20px', padding: '0 24px 24px' }}>
              {/* Left Column - Image */}
              <div className="preview-panel">
                <h3>Preview Gambar Lowongan</h3>
                <div className="image-viewer" style={{ minHeight: '300px' }}>
                  {selectedApp.job_image_url ? (
                    <img 
                      src={selectedApp.job_image_url} 
                      alt="Job Vacancy" 
                      onError={(e) => handleImageError(e, selectedApp.job_image_url)}
                    />
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Gambar lowongan tidak tersedia.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Data */}
              <div className="data-panel">
                <h3>Informasi Hasil Analisis AI</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <div className="info-icon"><Building size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Perusahaan</span>
                      <span className="info-value">{selectedApp.company || '-'}</span>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <div className="info-icon"><User size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Pengalaman</span>
                      <span className="info-value">{selectedApp.experience || '-'}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><Briefcase size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Posisi</span>
                      <span className="info-value">{selectedApp.position || '-'}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><Clock size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Jenis Pekerjaan</span>
                      <span className="info-value">{selectedApp.type || '-'}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><MapPin size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Lokasi</span>
                      <span className="info-value">{selectedApp.location || '-'}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><Mail size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Email Perusahaan</span>
                      <span className="info-value" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {selectedApp.email || '-'}
                        {selectedApp.email && selectedApp.email !== 'Tidak disebutkan' && (
                          <button 
                            onClick={() => handleGmailDraft(selectedApp)} 
                            style={{ 
                              background: '#ea4335', color: 'white', border: 'none', 
                              padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', 
                              fontSize: '12px', fontWeight: 600, display: 'inline-flex', 
                              alignItems: 'center', gap: '4px' 
                            }}
                          >
                            <Mail size={13} /> Pilih Template & Kirim Gmail
                          </button>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><GraduationCap size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Pendidikan</span>
                      <span className="info-value">{selectedApp.education || '-'}</span>
                    </div>
                  </div>

                  <div className="info-item">
                    <div className="info-icon"><AlignLeft size={20} /></div>
                    <div className="info-text">
                      <span className="info-label">Dokumen & Tujuan Kirim</span>
                      <span className="info-value">{selectedApp.description || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default History;

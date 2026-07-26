import React, { useState, useRef, useEffect } from 'react';
import { 
  Building, User, MapPin, Briefcase, Mail, GraduationCap, 
  AlignLeft, Edit3, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Maximize, X,
  Save, Plus, Trash2, Clock
} from 'lucide-react';
import './Step2Analysis.css';

const Step2Analysis = ({ jobImage, aiData, onNext, onBack, onUpdateData }) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [newSkill, setNewSkill] = useState('');
  const imageViewerRef = useRef(null);

  // Touch panning state for image viewer
  const panRef = useRef({ isDown: false, startX: 0, startY: 0, scrollLeft: 0, scrollTop: 0 });

  const handleZoomIn  = () => setZoom(prev => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  // ── Image viewer touch/mouse panning ──
  const handlePanStart = (e) => {
    const el = imageViewerRef.current;
    if (!el) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    panRef.current = {
      isDown: true,
      startX: clientX - el.offsetLeft,
      startY: clientY - el.offsetTop,
      scrollLeft: el.scrollLeft,
      scrollTop: el.scrollTop,
    };
    el.style.cursor = 'grabbing';
  };

  const handlePanMove = (e) => {
    if (!panRef.current.isDown) return;
    const el = imageViewerRef.current;
    if (!el) return;
    e.preventDefault();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = clientX - el.offsetLeft;
    const y = clientY - el.offsetTop;
    const walkX = (x - panRef.current.startX) * 1.5;
    const walkY = (y - panRef.current.startY) * 1.5;
    el.scrollLeft = panRef.current.scrollLeft - walkX;
    el.scrollTop  = panRef.current.scrollTop  - walkY;
  };

  const handlePanEnd = () => {
    panRef.current.isDown = false;
    if (imageViewerRef.current) imageViewerRef.current.style.cursor = 'grab';
  };

  useEffect(() => {
    const el = imageViewerRef.current;
    if (!el) return;
    el.addEventListener('touchmove', handlePanMove, { passive: false });
    return () => el.removeEventListener('touchmove', handlePanMove);
  }, []);

  // ── Edit Modal ──
  const openEdit = () => {
    setEditData({ ...aiData, skills: [...(aiData?.skills || [])] });
    setIsEditing(true);
  };

  const handleEditChange = (field, value) => {
    setEditData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkillRemove = (i) => {
    setEditData(prev => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }));
  };

  const handleSkillAdd = () => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    setEditData(prev => ({ ...prev, skills: [...(prev.skills || []), trimmed] }));
    setNewSkill('');
  };

  const handleSave = () => {
    if (onUpdateData) onUpdateData(editData);
    setIsEditing(false);
  };

  const fields = [
    { key: 'company',     label: 'Nama Perusahaan',       icon: <Building size={18} />,      type: 'text' },
    { key: 'position',    label: 'Posisi / Jabatan',       icon: <Briefcase size={18} />,     type: 'text' },
    { key: 'location',    label: 'Lokasi',                 icon: <MapPin size={18} />,        type: 'text' },
    { key: 'type',        label: 'Jenis Pekerjaan',        icon: <Clock size={18} />,         type: 'text' },
    { key: 'education',   label: 'Pendidikan',             icon: <GraduationCap size={18} />, type: 'text' },
    { key: 'experience',  label: 'Pengalaman',             icon: <User size={18} />,          type: 'text' },
    { key: 'email',       label: 'Email HRD',              icon: <Mail size={18} />,          type: 'email' },
    { key: 'description', label: 'Dokumen & Tujuan Kirim', icon: <AlignLeft size={18} />,     type: 'textarea' },
  ];

  return (
    <div className="step2-container">
      <div className="step2-header">
        <div className="step2-title">
          <h2>2. Analisis Lowongan oleh AI</h2>
          <p>AI telah membaca gambar lowongan kerja dan mengekstrak informasi berikut. Silakan periksa kembali dan edit jika ada yang kurang tepat.</p>
        </div>
        <button className="btn-outline-primary" onClick={openEdit}>
          <Edit3 size={16} /> Edit Semua Informasi
        </button>
      </div>

      <div className="step2-layout">
        {/* Left Column - Image */}
        <div className="preview-panel">
          <h3>Preview Gambar Lowongan</h3>
          <div
            className="image-viewer"
            ref={imageViewerRef}
            onMouseDown={handlePanStart}
            onMouseMove={handlePanMove}
            onMouseUp={handlePanEnd}
            onMouseLeave={handlePanEnd}
            onTouchStart={handlePanStart}
            onTouchEnd={handlePanEnd}
            style={{ cursor: 'grab', overflow: 'auto', position: 'relative', WebkitOverflowScrolling: 'touch' }}
          >
            <img
              src={jobImage}
              alt="Job Vacancy"
              draggable={false}
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top left',
                transition: 'transform 0.15s ease-out',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
          <div className="viewer-controls">
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={18} /></button>
            <div className="divider" />
            <span className="zoom-text" onClick={handleResetZoom} style={{ cursor: 'pointer' }} title="Reset 100%">{zoom}%</span>
            <div className="divider" />
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={18} /></button>
            <button className="ctrl-btn max-btn" onClick={() => setIsFullscreen(true)} title="Fullscreen"><Maximize size={18} /></button>
          </div>
        </div>

        {/* Fullscreen Overlay */}
        {isFullscreen && (
          <div
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px', overflowY: 'auto',
            }}
            onClick={() => setIsFullscreen(false)}
          >
            <button
              onClick={() => setIsFullscreen(false)}
              style={{
                position: 'fixed', top: 20, right: 20,
                background: 'white', border: 'none', borderRadius: '50%',
                width: 44, height: 44, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10000,
              }}
            >
              <X size={24} color="#000" />
            </button>
            <img
              src={jobImage}
              alt="Full Preview"
              style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain', borderRadius: '8px' }}
              onClick={e => e.stopPropagation()}
            />
          </div>
        )}

        {/* Right Column - Data */}
        <div className="data-panel">
          <h3>Informasi Hasil Analisis AI</h3>
          <div className="info-grid">
            {[
              { icon: <Building size={20} />, label: 'Perusahaan',          value: aiData?.company },
              { icon: <User size={20} />,     label: 'Pengalaman',          value: aiData?.experience },
              { icon: <Briefcase size={20} />,label: 'Posisi',              value: aiData?.position },
              { icon: <Briefcase size={20} />,label: 'Jenis Pekerjaan',     value: aiData?.type },
              { icon: <MapPin size={20} />,   label: 'Lokasi',              value: aiData?.location },
              { icon: <Mail size={20} />,     label: 'Email Perusahaan',    value: aiData?.email },
              { icon: <GraduationCap size={20}/>, label: 'Pendidikan',      value: aiData?.education },
              { icon: <AlignLeft size={20} />,label: 'Dokumen & Tujuan Kirim', value: aiData?.description },
            ].map((item, i) => (
              <div className="info-item" key={i}>
                <div className="info-icon">{item.icon}</div>
                <div className="info-text">
                  <span className="info-label">{item.label}</span>
                  <span className="info-value">{item.value || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="skills-section">
            <span className="skills-label">Kualifikasi Utama yang Ditemukan</span>
            <div className="skills-chips">
              {aiData?.skills?.map((skill, i) => (
                <span key={i} className="skill-chip">{skill}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="step2-footer">
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Kembali
        </button>
        <button className="btn-primary" onClick={onNext}>
          Buat Surat Lamaran <ArrowRight size={16} />
        </button>
      </div>

      {/* ═══ EDIT MODAL ═══ */}
      {isEditing && editData && (
        <div className="s2-modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="s2-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="s2-modal-header">
              <div>
                <h2 className="s2-modal-title">Edit Informasi Lowongan</h2>
                <p className="s2-modal-subtitle">Perbaiki data yang kurang tepat dari hasil AI</p>
              </div>
              <button className="s2-modal-close" onClick={() => setIsEditing(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="s2-modal-body">
              <div className="s2-edit-grid">
                {fields.map(({ key, label, icon, type }) => (
                  <div className="s2-edit-field" key={key} data-full={type === 'textarea' ? 'true' : undefined}>
                    <label className="s2-edit-label">
                      <span className="s2-edit-label-icon">{icon}</span>
                      {label}
                    </label>
                    {type === 'textarea' ? (
                      <textarea
                        className="s2-edit-input s2-edit-textarea"
                        value={editData[key] || ''}
                        onChange={e => handleEditChange(key, e.target.value)}
                        rows={3}
                        placeholder={`Masukkan ${label.toLowerCase()}...`}
                      />
                    ) : (
                      <input
                        className="s2-edit-input"
                        type={type}
                        value={editData[key] || ''}
                        onChange={e => handleEditChange(key, e.target.value)}
                        placeholder={`Masukkan ${label.toLowerCase()}...`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Skills Editor */}
              <div className="s2-skills-editor">
                <label className="s2-edit-label" style={{ marginBottom: '12px', display: 'block' }}>
                  <span className="s2-edit-label-icon"><GraduationCap size={18} /></span>
                  Kualifikasi / Skills
                </label>
                <div className="s2-skills-chips-edit">
                  {editData.skills?.map((skill, i) => (
                    <span key={i} className="s2-skill-chip-edit">
                      {skill}
                      <button className="s2-skill-remove" onClick={() => handleSkillRemove(i)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="s2-skill-add-row">
                  <input
                    className="s2-edit-input"
                    type="text"
                    placeholder="Tambah skill baru..."
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSkillAdd()}
                  />
                  <button className="s2-skill-add-btn" onClick={handleSkillAdd}>
                    <Plus size={16} /> Tambah
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="s2-modal-footer">
              <button className="s2-modal-cancel" onClick={() => setIsEditing(false)}>Batal</button>
              <button className="s2-modal-save" onClick={handleSave}>
                <Save size={16} /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Step2Analysis;

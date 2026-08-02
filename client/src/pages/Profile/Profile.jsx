import React, { useEffect, useState, useCallback, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  User, Mail, Phone, MapPin, Edit3, Save, X,
  Upload, Trash2, CheckCircle, AlertCircle, PenTool, ZoomIn, ZoomOut, RefreshCw, Crop, Image
} from 'lucide-react';
import './Profile.css';

// Helper: create cropped image blob from canvas
async function getCroppedImg(imageSrc, pixelCrop) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext('2d');
      // White background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(
        img,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );
      canvas.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

// Helper: convert full image to blob (no crop)
async function getFullImageBlob(imageSrc) {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', address: '',
    birthplace: '', birthdate: '', education: '', major: '', gpa: '',
    marital_status: 'Belum menikah',
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Signature states
  const [sigUrl, setSigUrl] = useState(null);
  const [sigUploading, setSigUploading] = useState(false);
  // Modal step: null | 'preview' | 'crop'
  const [sigModalStep, setSigModalStep] = useState(null);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  const loadProfile = async () => {
    setLoading(true);
    const local = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const merged = {
      full_name: '', email: user?.email || '', phone: '', address: '',
      birthplace: '', birthdate: '', education: '', major: '', gpa: '',
      marital_status: 'Belum menikah',
      ...local,
      ...data,
      email: user?.email || local.email || '',
    };

    setProfile(merged);
    localStorage.setItem('userProfile', JSON.stringify(merged));

    const sigPath = data?.signature_path || local?.signature_path;
    if (sigPath) {
      try {
        const { data: urlData } = await supabase.storage
          .from('signatures')
          .createSignedUrl(sigPath, 3600);
        if (urlData?.signedUrl) setSigUrl(urlData.signedUrl);
      } catch (e) {}
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    // 1. Simpan selalu ke localStorage secara lengkap
    const fullProfileData = { ...profile, id: user.id };
    localStorage.setItem('userProfile', JSON.stringify(fullProfileData));

    // 2. Persiapkan payload untuk Supabase DB (tanpa email)
    let payload = { ...profile };
    delete payload.email;

    let error = null;
    let attempts = 0;

    // Retry loop: jika ada kolom yang belum dibuat di DB Supabase, otomatis strip kolom tersebut & retry
    while (attempts < 10) {
      const res = await supabase.from('profiles').upsert({
        id: user.id,
        ...payload,
        updated_at: new Date().toISOString(),
      });
      error = res.error;
      if (!error) break;

      // Tangkap nama kolom missing dari pesan error PostgREST
      const match = error.message?.match(/Could not find the '([^']+)' column/i);
      if (match && match[1] && match[1] in payload) {
        delete payload[match[1]];
        attempts++;
      } else {
        break;
      }
    }

    setSaving(false);
    setEditing(false);
    setMsg({ text: 'Profil berhasil disimpan!', type: 'success' });
    refreshProfile();
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
  };

  // ─── Signature Upload Flow ────────────────────────────────────────────────
  const handleSigFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      setMsg({ text: '⚠️ Wajib upload file PNG! File lain tidak diterima.', type: 'error' });
      setTimeout(() => setMsg({ text: '', type: '' }), 4000);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setSigModalStep('preview'); // Step 1: tampilkan preview dulu
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const closeSigModal = () => {
    setSigModalStep(null);
    setRawImageSrc(null);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // Upload langsung tanpa crop
  const handleSaveDirect = async () => {
    if (!rawImageSrc) return;
    setSigUploading(true);
    try {
      const blob = await getFullImageBlob(rawImageSrc);
      await uploadSigBlob(blob);
    } catch (err) {
      setMsg({ text: 'Gagal upload: ' + err.message, type: 'error' });
    } finally {
      setSigUploading(false);
    }
  };

  // Helper upload blob ke Supabase
  const uploadSigBlob = async (blob) => {
    const path = `${user.id}/signature.png`;
    const { error: upErr } = await supabase.storage
      .from('signatures')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    if (upErr) throw upErr;

    await supabase.from('profiles').upsert({
      id: user.id, signature_path: path, updated_at: new Date().toISOString()
    });
    setProfile(p => ({ ...p, signature_path: path }));
    localStorage.setItem('userProfile', JSON.stringify({ ...profile, id: user.id, signature_path: path }));

    const { data: urlData } = await supabase.storage
      .from('signatures').createSignedUrl(path, 3600);
    if (urlData?.signedUrl) setSigUrl(urlData.signedUrl);

    closeSigModal();
    setMsg({ text: 'Tanda tangan berhasil disimpan!', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3500);
    refreshProfile();
  };

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !rawImageSrc) return;
    setSigUploading(true);
    try {
      const blob = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      await uploadSigBlob(blob);
    } catch (err) {
      setMsg({ text: 'Gagal upload tanda tangan: ' + err.message, type: 'error' });
    } finally {
      setSigUploading(false);
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm('Hapus tanda tangan?')) return;
    const path = `${user.id}/signature.png`;
    await supabase.storage.from('signatures').remove([path]);
    await supabase.from('profiles').upsert({ id: user.id, signature_path: null, updated_at: new Date().toISOString() });
    setSigUrl(null);
    setProfile(p => ({ ...p, signature_path: null }));
    const stored = JSON.parse(localStorage.getItem('userProfile') || '{}');
    delete stored.signature_path;
    localStorage.setItem('userProfile', JSON.stringify(stored));
    setMsg({ text: 'Tanda tangan dihapus.', type: 'success' });
    setTimeout(() => setMsg({ text: '', type: '' }), 3000);
  };

  // ─── Fields ───────────────────────────────────────────────────────────────
  const fields = [
    { key: 'full_name',      label: 'Nama Lengkap',        icon: User,   type: 'text' },
    { key: 'email',          label: 'Email',                icon: Mail,   type: 'email', disabled: true },
    { key: 'phone',          label: 'No. Telepon',          icon: Phone,  type: 'tel', placeholder: '08xxxxxxxxxx' },
    { key: 'birthplace',     label: 'Tempat Lahir',         icon: null,   type: 'text', placeholder: 'Contoh: Gresik' },
    { key: 'birthdate',      label: 'Tanggal Lahir',        icon: null,   type: 'date' },
    { key: 'education',      label: 'Pendidikan Terakhir',  icon: null,   type: 'text', placeholder: 'Strata 1 / D3 / SMA' },
    { key: 'major',          label: 'Jurusan',              icon: null,   type: 'text', placeholder: 'Teknik Informatika' },
    { key: 'gpa',            label: 'IPK',                  icon: null,   type: 'text', placeholder: '0.00' },
    { key: 'address',        label: 'Alamat Lengkap',       icon: MapPin, type: 'textarea', placeholder: 'Jl. ... No. ..., Kota' },
    { key: 'marital_status', label: 'Status Pernikahan',    icon: null,   type: 'select',
      options: ['Belum menikah', 'Sudah menikah', 'Duda/Janda'] },
  ];

  const initials = profile.full_name
    ? profile.full_name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-skeleton-circle" />
      <div className="profile-skeleton-lines">
        {[...Array(6)].map((_, i) => <div key={i} className="profile-skeleton-line" />)}
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      {/* Avatar Card */}
      <div className="profile-avatar-card">
        <div className="profile-avatar">
          <span className="avatar-initials">{initials}</span>
        </div>
        <div className="profile-avatar-info">
          <h2>{profile.full_name || 'Nama Belum Diisi'}</h2>
          <p>{profile.email}</p>
          {profile.major && <span className="profile-badge">{profile.education} – {profile.major}</span>}
        </div>
        <div className="profile-avatar-actions">
          {editing ? (
            <>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button className="btn-cancel" onClick={() => { setEditing(false); loadProfile(); }}>
                <X size={15} /> Batal
              </button>
            </>
          ) : (
            <button className="btn-edit" onClick={() => setEditing(true)}>
              <Edit3 size={15} /> Edit Profil
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {msg.text && (
        <div className={`profile-msg ${msg.type}`}>
          {msg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {msg.text}
        </div>
      )}

      {/* Form */}
      <div className="profile-form-card">
        <div className="profile-form-header">
          <div>
            <h3>Data Diri</h3>
            <p>Informasi ini otomatis digunakan saat membuat surat lamaran.</p>
          </div>
        </div>
        <div className="profile-form-grid">
          {fields.map(f => (
            <div key={f.key} className={`profile-field ${f.key === 'address' ? 'profile-field-full' : ''}`}>
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={profile[f.key] || ''}
                  disabled={!editing}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="profile-input"
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea
                  value={profile[f.key] || ''}
                  disabled={!editing}
                  placeholder={f.placeholder || ''}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="profile-input profile-textarea"
                  rows={2}
                />
              ) : (
                <input
                  type={f.type}
                  value={profile[f.key] || ''}
                  disabled={!editing || f.disabled}
                  placeholder={f.placeholder || ''}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="profile-input"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Signature Section */}
      <div className="profile-form-card profile-sig-card">
        <div className="profile-form-header">
          <div>
            <h3><PenTool size={16} style={{ display:'inline', marginRight:'6px', verticalAlign:'middle' }} />Tanda Tangan Digital</h3>
            <p>Upload tanda tangan Anda dalam format <strong>PNG</strong> (wajib). Akan digunakan di surat lamaran.</p>
          </div>
        </div>

        <div className="sig-section">
          {sigUrl ? (
            <div className="sig-preview-wrap">
              <div className="sig-preview-box">
                <img src={sigUrl} alt="Tanda Tangan" className="sig-preview-img" />
              </div>
              <div className="sig-preview-actions">
                <button className="sig-btn-change" onClick={() => fileInputRef.current?.click()}>
                  <RefreshCw size={14} /> Ganti Tanda Tangan
                </button>
                <button className="sig-btn-delete" onClick={handleDeleteSignature}>
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          ) : (
            <div className="sig-upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="sig-upload-icon"><Upload size={28} /></div>
              <p className="sig-upload-title">Klik untuk Upload Tanda Tangan</p>
              <p className="sig-upload-hint">⚠️ <strong>Wajib PNG</strong> — File JPG/JPEG tidak diterima</p>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            style={{ display: 'none' }}
            onChange={handleSigFileSelect}
          />
        </div>
      </div>

      {/* ── Signature Modal (2 step: preview → crop) ── */}
      {sigModalStep && rawImageSrc && (
        <div className="crop-modal-overlay" onClick={closeSigModal}>
          <div className="crop-modal" onClick={e => e.stopPropagation()}>

            {/* ── STEP 1: PREVIEW ── */}
            {sigModalStep === 'preview' && (
              <>
                <div className="crop-modal-header">
                  <div>
                    <h3><Image size={18} style={{marginRight:8,verticalAlign:'middle'}}/>Preview Tanda Tangan</h3>
                    <p className="crop-modal-subtitle">Periksa gambar sebelum disimpan. Perlu dirapikan? Gunakan fitur crop.</p>
                  </div>
                  <button className="crop-modal-close" onClick={closeSigModal}><X size={20} /></button>
                </div>

                {/* Preview dengan background putih */}
                <div className="sig-preview-stage">
                  <img src={rawImageSrc} alt="Preview Tanda Tangan" className="sig-preview-stage-img" />
                </div>

                <div className="crop-modal-footer">
                  <button className="btn-cancel" onClick={closeSigModal}>
                    <X size={15} /> Batal
                  </button>
                  <button className="sig-btn-crop" onClick={() => { setSigModalStep('crop'); }}>
                    <Crop size={15} /> Crop / Sesuaikan
                  </button>
                  <button className="btn-save" onClick={handleSaveDirect} disabled={sigUploading}>
                    <Save size={15} /> {sigUploading ? 'Menyimpan...' : 'Simpan Langsung'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: CROP ── */}
            {sigModalStep === 'crop' && (
              <>
                <div className="crop-modal-header">
                  <div>
                    <h3><Crop size={18} style={{marginRight:8,verticalAlign:'middle'}}/>Crop Tanda Tangan</h3>
                    <p className="crop-modal-subtitle">Seret kotak putih untuk mengatur area yang disimpan. Scroll/pinch untuk zoom.</p>
                  </div>
                  <button className="crop-modal-close" onClick={() => setSigModalStep('preview')}><X size={20} /></button>
                </div>

                <div className="crop-container">
                  <Cropper
                    image={rawImageSrc}
                    crop={crop}
                    zoom={zoom}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                    style={{
                      containerStyle: {
                        borderRadius: '12px',
                        background: '#f8f9fa',
                      },
                      mediaStyle: { background: '#ffffff' },
                    }}
                    objectFit="contain"
                    showGrid
                  />
                </div>

                <div className="crop-zoom-bar">
                  <ZoomOut size={16} />
                  <input
                    type="range"
                    min={1} max={4} step={0.05}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="crop-zoom-slider"
                  />
                  <ZoomIn size={16} />
                  <span className="crop-zoom-val">{Math.round(zoom * 100)}%</span>
                </div>

                <div className="crop-modal-footer">
                  <button className="btn-cancel" onClick={() => setSigModalStep('preview')}>
                    ← Kembali
                  </button>
                  <button className="btn-save" onClick={handleCropConfirm} disabled={sigUploading}>
                    <Save size={15} /> {sigUploading ? 'Menyimpan...' : 'Simpan Hasil Crop'}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Mail, Phone, MapPin, Edit3, Save, X, Camera } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', address: '',
    birthdate: '', education: '', major: '', gpa: '',
    marital_status: 'Belum menikah',
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { loadProfile(); }, []);

  const loadProfile = async () => {
    setLoading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;
    setUser(u);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (data) setProfile({ ...profile, ...data, email: u.email });
    else setProfile(p => ({ ...p, email: u.email }));
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    const { error } = await supabase.from('profiles').upsert({
      id: u.id,
      ...profile,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) { setMsg('Gagal menyimpan: ' + error.message); }
    else { setMsg('Profil berhasil disimpan!'); setEditing(false); }
    setTimeout(() => setMsg(''), 3000);
  };

  const fields = [
    { key: 'full_name',      label: 'Nama Lengkap',     icon: User,    type: 'text' },
    { key: 'email',          label: 'Email',             icon: Mail,    type: 'email', disabled: true },
    { key: 'phone',          label: 'No. Telepon',       icon: Phone,   type: 'tel' },
    { key: 'address',        label: 'Alamat',            icon: MapPin,  type: 'text' },
    { key: 'birthdate',      label: 'Tanggal Lahir',     icon: null,    type: 'date' },
    { key: 'education',      label: 'Pendidikan Terakhir', icon: null,  type: 'text', placeholder: 'Contoh: Strata 1' },
    { key: 'major',          label: 'Jurusan',           icon: null,    type: 'text' },
    { key: 'gpa',            label: 'IPK',               icon: null,    type: 'text', placeholder: '0.00' },
    { key: 'marital_status', label: 'Status Nikah',      icon: null,    type: 'select',
      options: ['Belum menikah', 'Sudah menikah', 'Duda/Janda'] },
  ];

  const initials = profile.full_name
    ? profile.full_name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
    : (user?.email?.[0] || '?').toUpperCase();

  if (loading) return (
    <div className="profile-loading">
      <div className="profile-skeleton-circle" />
      <div className="profile-skeleton-lines">
        {[...Array(5)].map((_, i) => <div key={i} className="profile-skeleton-line" />)}
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      {/* Avatar Card */}
      <div className="profile-avatar-card">
        <div className="profile-avatar">
          <span className="avatar-initials">{initials}</span>
          <button className="avatar-camera-btn"><Camera size={14} /></button>
        </div>
        <div className="profile-avatar-info">
          <h2>{profile.full_name || 'Nama Belum Diisi'}</h2>
          <p>{profile.email}</p>
        </div>
        <div className="profile-avatar-actions">
          {editing ? (
            <>
              <button className="btn-save" onClick={handleSave} disabled={saving}>
                <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button className="btn-cancel" onClick={() => setEditing(false)}>
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

      {/* Success/Error message */}
      {msg && <div className={`profile-msg ${msg.startsWith('Gagal') ? 'error' : 'success'}`}>{msg}</div>}

      {/* Form */}
      <div className="profile-form-card">
        <h3>Data Diri</h3>
        <p>Informasi ini akan otomatis digunakan saat membuat surat lamaran.</p>
        <div className="profile-form-grid">
          {fields.map(f => (
            <div key={f.key} className="profile-field">
              <label>{f.label}</label>
              {f.type === 'select' ? (
                <select
                  value={profile[f.key]}
                  disabled={!editing}
                  onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                  className="profile-input"
                >
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
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
    </div>
  );
};

export default Profile;

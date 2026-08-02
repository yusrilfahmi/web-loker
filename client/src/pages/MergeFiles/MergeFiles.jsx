import React, { useState, useEffect } from 'react';
import { GitMerge, FileText, Check, Loader2, Download, Trash2, ChevronUp, ChevronDown, AlertCircle, RefreshCw, FileArchive } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './MergeFiles.css';

const cleanFileName = (n) => n ? n.replace(/\.[^/.]+$/, '') : '';
const formatSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const MergeFiles = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]); // array of doc ids in merge order
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [compress, setCompress] = useState(true);

  useEffect(() => {
    if (user) fetchDocs();
  }, [user]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('user_documents')
      .select('id, file_name, file_size, storage_path, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) setDocuments(data);
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const arr = [...selected];
    [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
    setSelected(arr);
  };

  const moveDown = (idx) => {
    if (idx === selected.length - 1) return;
    const arr = [...selected];
    [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]];
    setSelected(arr);
  };

  const getDocById = (id) => documents.find(d => d.id === id);

  const handleMerge = async () => {
    if (selected.length < 2) {
      setError('Pilih minimal 2 file untuk digabungkan.');
      setTimeout(() => setError(''), 4000);
      return;
    }
    setMerging(true);
    setError('');
    setSuccess('');

    try {
      // Get signed URLs for selected docs in order
      const attachmentUrls = [];
      for (const id of selected) {
        const doc = getDocById(id);
        if (!doc?.storage_path) continue;
        const { data, error: urlErr } = await supabase.storage
          .from('user_documents')
          .createSignedUrl(doc.storage_path, 120);
        if (!urlErr && data?.signedUrl) {
          attachmentUrls.push({ name: doc.file_name, url: data.signedUrl });
        }
      }

      if (attachmentUrls.length < 2) throw new Error('Tidak cukup file yang bisa diakses.');

      const formData = new FormData();
      formData.append('attachmentUrls', JSON.stringify(attachmentUrls));
      formData.append('letterHtml', ''); // no letter, just merge docs
      formData.append('compress', compress ? 'true' : 'false');

      const res = await fetch('https://web-loker-5vpr.vercel.app/api/merge-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || 'Gagal menggabungkan file');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const names = selected.map(id => cleanFileName(getDocById(id)?.file_name || '')).join('_');
      a.download = `Gabungan_${names.slice(0, 40)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess('File berhasil digabungkan dan diunduh!');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError('Gagal: ' + err.message);
      setTimeout(() => setError(''), 6000);
    } finally {
      setMerging(false);
    }
  };

  const selectedDocs = selected.map(id => getDocById(id)).filter(Boolean);
  const totalSize = selectedDocs.reduce((acc, d) => acc + (d.file_size || 0), 0);

  return (
    <div className="merge-page">
      {/* Header */}
      <div className="merge-header">
        <div>
          <h1><GitMerge size={24} style={{ display: 'inline', marginRight: 10, verticalAlign: 'middle', color: 'var(--primary)' }} />Gabungkan File</h1>
          <p>Pilih file PDF dari dokumen Anda, atur urutannya, lalu gabungkan menjadi satu file PDF.</p>
        </div>
        <button className="merge-refresh-btn" onClick={fetchDocs} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="merge-alert merge-alert-error">
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {success && (
        <div className="merge-alert merge-alert-success">
          <Check size={16} /> {success}
        </div>
      )}

      <div className="merge-layout">
        {/* ── Left: document list ── */}
        <div className="merge-left">
          <div className="merge-card">
            <div className="merge-card-header">
              <h3>Pilih File</h3>
              <span className="merge-badge">{documents.length} file</span>
            </div>

            {loading ? (
              <div className="merge-loading">
                <Loader2 size={22} className="spin" />
                <span>Memuat dokumen...</span>
              </div>
            ) : documents.length === 0 ? (
              <div className="merge-empty">
                <FileText size={40} color="#9ca3af" />
                <p>Belum ada dokumen. Upload dulu di menu <strong>Dokumen</strong>.</p>
              </div>
            ) : (
              <div className="merge-doc-list">
                {documents.map(doc => {
                  const isSelected = selected.includes(doc.id);
                  const order = selected.indexOf(doc.id) + 1;
                  return (
                    <div
                      key={doc.id}
                      className={`merge-doc-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleSelect(doc.id)}
                    >
                      <div className={`merge-doc-check ${isSelected ? 'checked' : ''}`}>
                        {isSelected ? <Check size={14} color="white" /> : null}
                      </div>
                      <div className="merge-doc-icon">
                        <FileText size={18} color={isSelected ? 'var(--primary)' : '#9ca3af'} />
                      </div>
                      <div className="merge-doc-info">
                        <span className="merge-doc-name">{cleanFileName(doc.file_name)}</span>
                        <span className="merge-doc-size">{formatSize(doc.file_size)}</span>
                      </div>
                      {isSelected && (
                        <div className="merge-order-badge">{order}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: merge queue + actions ── */}
        <div className="merge-right">
          <div className="merge-card">
            <div className="merge-card-header">
              <h3>Urutan Gabungan</h3>
              <span className="merge-badge">{selected.length} dipilih</span>
            </div>

            {selected.length === 0 ? (
              <div className="merge-empty merge-empty-sm">
                <p>Klik file di sebelah kiri untuk menambahkan ke antrian gabungan.</p>
              </div>
            ) : (
              <div className="merge-queue">
                {selectedDocs.map((doc, idx) => (
                  <div key={doc.id} className="merge-queue-item">
                    <span className="merge-queue-num">{idx + 1}</span>
                    <div className="merge-queue-name">
                      <FileText size={15} color="var(--primary)" />
                      <span>{cleanFileName(doc.file_name)}</span>
                    </div>
                    <div className="merge-queue-controls">
                      <button onClick={() => moveUp(idx)} disabled={idx === 0}>
                        <ChevronUp size={14} />
                      </button>
                      <button onClick={() => moveDown(idx)} disabled={idx === selected.length - 1}>
                        <ChevronDown size={14} />
                      </button>
                      <button onClick={() => toggleSelect(doc.id)} style={{ color: '#ef4444' }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Options */}
            <div className="merge-options">
              <label className="merge-option-row">
                <input
                  type="checkbox"
                  checked={compress}
                  onChange={e => setCompress(e.target.checked)}
                  className="merge-checkbox"
                />
                <div>
                  <span className="merge-option-label">
                    <FileArchive size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                    Kompres hasil PDF
                  </span>
                  <span className="merge-option-desc">Ukuran file lebih kecil, kualitas tetap baik</span>
                </div>
              </label>
            </div>

            {/* Summary */}
            {selected.length > 0 && (
              <div className="merge-summary">
                <div className="merge-summary-row">
                  <span>Jumlah file</span>
                  <strong>{selected.length} file</strong>
                </div>
                <div className="merge-summary-row">
                  <span>Total ukuran</span>
                  <strong>{formatSize(totalSize)}</strong>
                </div>
              </div>
            )}

            {/* Action button */}
            <button
              className="merge-btn-primary"
              onClick={handleMerge}
              disabled={merging || selected.length < 2}
            >
              {merging ? (
                <><Loader2 size={16} className="spin" /> Menggabungkan...</>
              ) : (
                <><Download size={16} /> Gabung & Unduh PDF</>
              )}
            </button>

            {selected.length < 2 && (
              <p className="merge-hint">Pilih minimal 2 file untuk menggabungkan.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MergeFiles;

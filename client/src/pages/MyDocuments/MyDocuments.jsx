import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  HardDrive,
  Search,
  ChevronDown,
  ArrowUpDown,
  Eye,
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Loader
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './MyDocuments.css';

const categoryColors = {
  'CV': 'badge-purple',
  'Pendidikan': 'badge-green',
  'Sertifikat': 'badge-orange',
  'Foto': 'badge-blue',
  'Portofolio': 'badge-pink',
  'Lainnya': 'badge-gray'
};

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getCategoryFromFileName = (fileName) => {
  const lowerName = fileName.toLowerCase();
  if (lowerName.includes('cv') || lowerName.includes('resume')) return 'CV';
  if (lowerName.includes('ijazah') || lowerName.includes('transkrip')) return 'Pendidikan';
  if (lowerName.includes('sertifikat')) return 'Sertifikat';
  if (lowerName.includes('foto')) return 'Foto';
  if (lowerName.includes('portofolio')) return 'Portofolio';
  return 'Lainnya';
};

const MyDocuments = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editNameValue, setEditNameValue] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      fetchDocuments();
    }
  }, [user]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const savedRenames = JSON.parse(localStorage.getItem('renamed_doc_names') || '{}');
      const docsWithSavedNames = (data || []).map(doc => ({
        ...doc,
        file_name: savedRenames[doc.id] || doc.file_name
      }));
      setDocuments(docsWithSavedNames);
    } catch (error) {
      console.error('Error fetching documents:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const startRename = (doc) => {
    setEditingId(doc.id);
    setEditNameValue(doc.file_name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditNameValue('');
  };

  const saveRename = async (doc) => {
    if (!editNameValue || editNameValue.trim() === '') return;
    const newName = editNameValue.trim();
    if (newName === doc.file_name) {
      setEditingId(null);
      return;
    }

    // Save to localStorage map immediately
    const savedRenames = JSON.parse(localStorage.getItem('renamed_doc_names') || '{}');
    savedRenames[doc.id] = newName;
    localStorage.setItem('renamed_doc_names', JSON.stringify(savedRenames));

    setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, file_name: newName } : d));
    setEditingId(null);

    try {
      await supabase
        .from('user_documents')
        .update({ file_name: newName })
        .eq('id', doc.id);
    } catch (err) {
      console.warn('Supabase DB rename warning:', err);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File terlalu besar. Maksimal 5MB.");
      return;
    }

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('user_documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('user_documents')
        .insert([
          {
            user_id: user.id,
            file_name: file.name,
            file_category: getCategoryFromFileName(file.name),
            file_type: file.type,
            file_size: file.size,
            storage_path: filePath
          }
        ]);

      if (dbError) throw dbError;

      fetchDocuments();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Gagal mengunggah: ${error.message || JSON.stringify(error)}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id, storagePath) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus dokumen ini?")) return;

    const prev = documents;
    setDocuments(documents.filter(doc => doc.id !== id));

    try {
      const { error: storageError } = await supabase.storage
        .from('user_documents')
        .remove([storagePath]);
      
      if (storageError) {
        console.warn('Storage delete warning:', storageError.message);
      }

      const { error: dbError, count } = await supabase
        .from('user_documents')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (dbError) throw new Error('DB Error: ' + dbError.message);
    } catch (error) {
      console.error('Error deleting document:', error.message);
      setDocuments(prev);
      alert(`Gagal menghapus: ${error.message}`);
    }
  };

  const handleDownload = async (storagePath, fileName) => {
    try {
      const { data, error } = await supabase.storage
        .from('user_documents')
        .download(storagePath);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error.message);
    }
  };

  // Stats Calculations
  const totalFiles = documents.length;
  const totalPdf = documents.filter(d => d.file_type === 'application/pdf').length;
  const totalImg = documents.filter(d => d.file_type.includes('image')).length;
  const totalBytes = documents.reduce((acc, doc) => acc + (doc.file_size || 0), 0);
  const totalSizeFormatted = formatBytes(totalBytes);

  // Filtering
  const filteredDocs = documents.filter(doc => 
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="docs-page">
      <div className="docs-header">
        <h1>Dokumen Saya</h1>
        <p>Kelola semua dokumen yang Anda miliki untuk mempermudah proses lamaran kerja.</p>
      </div>

      <div className="docs-stats-grid">
        <div className="upload-card" onClick={() => fileInputRef.current?.click()}>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf,.jpg,.jpeg,.png"
            hidden 
          />
          {uploading ? (
            <Loader size={32} className="upload-icon spinning" />
          ) : (
            <UploadCloud size={32} className="upload-icon" />
          )}
          <span className="upload-title">{uploading ? 'Mengunggah...' : 'Upload Dokumen Baru'}</span>
          <span className="upload-subtitle">Klik di sini untuk memilih file</span>
          <span className="upload-hint">JPG, PNG, PDF (Max 5MB)</span>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper bg-purple-light">
            <FileText size={24} className="text-purple" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Semua Dokumen</span>
            <div className="stat-value-group">
              <span className="stat-value">{totalFiles}</span>
              <span className="stat-unit">file</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper bg-green-light">
            <span className="pdf-icon-text">PDF</span>
          </div>
          <div className="stat-info">
            <span className="stat-label">File PDF</span>
            <div className="stat-value-group">
              <span className="stat-value">{totalPdf}</span>
              <span className="stat-unit">file</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper bg-blue-light">
            <ImageIcon size={24} className="text-blue" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Gambar</span>
            <div className="stat-value-group">
              <span className="stat-value">{totalImg}</span>
              <span className="stat-unit">file</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper bg-orange-light">
            <HardDrive size={24} className="text-orange" />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Ukuran</span>
            <div className="stat-value-group">
              <span className="stat-value">{totalSizeFormatted}</span>
            </div>
            <span className="stat-unit-bottom">dari 100 MB</span>
          </div>
        </div>
      </div>

      <div className="docs-filters">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Cari dokumen..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="docs-table">
          <thead>
            <tr>
              <th>Nama Dokumen</th>
              <th>Jenis</th>
              <th>Kategori</th>
              <th>Ukuran</th>
              <th>Tanggal Upload</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                  Memuat dokumen...
                </td>
              </tr>
            ) : filteredDocs.length === 0 ? (
              <tr>
                <td colSpan="6" style={{textAlign: 'center', padding: '32px', color: '#6b7280'}}>
                  Belum ada dokumen yang diunggah.
                </td>
              </tr>
            ) : (
              filteredDocs.map((doc) => {
                const isPdf = doc.file_type === 'application/pdf';
                const dateObj = new Date(doc.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                const isEditing = editingId === doc.id;

                return (
                  <tr key={doc.id}>
                    <td className="col-name">
                      <div className="doc-name-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isPdf ? (
                          <div className="icon-pdf-small">PDF</div>
                        ) : (
                          <div className="icon-img-small"><ImageIcon size={14} /></div>
                        )}
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                            <input 
                              type="text" 
                              value={editNameValue} 
                              onChange={e => setEditNameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') saveRename(doc);
                                if (e.key === 'Escape') cancelRename();
                              }}
                              autoFocus
                              style={{
                                padding: '4px 8px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: '1.5px solid var(--primary)',
                                outline: 'none',
                                width: '100%'
                              }}
                            />
                            <button onClick={() => saveRename(doc)} style={{ background: '#16a34a', border: 'none', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex' }} title="Simpan"><Check size={14} /></button>
                            <button onClick={cancelRename} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', display: 'flex' }} title="Batal"><X size={14} /></button>
                          </div>
                        ) : (
                          <div className="doc-name-text">
                            <span className="doc-title">{doc.file_name}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="col-type">{isPdf ? 'PDF' : 'JPG/PNG'}</td>
                    <td className="col-category">
                      <span className={`badge ${categoryColors[doc.file_category] || categoryColors['Lainnya']}`}>
                        {doc.file_category || 'Lainnya'}
                      </span>
                    </td>
                    <td className="col-size">{formatBytes(doc.file_size)}</td>
                    <td className="col-date">
                      <div className="date-cell">
                        <span>{dateStr}</span>
                        <span className="time-text">{timeStr}</span>
                      </div>
                    </td>
                    <td className="col-actions">
                      <div className="actions-group">
                        <button className="action-btn" onClick={() => startRename(doc)} title="Rename / Ubah Nama"><Edit3 size={16} /></button>
                        <button className="action-btn" onClick={() => handleDownload(doc.storage_path, doc.file_name)} title="Download"><Download size={16} /></button>
                        <button className="action-btn" onClick={() => handleDelete(doc.id, doc.storage_path)} title="Hapus"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyDocuments;

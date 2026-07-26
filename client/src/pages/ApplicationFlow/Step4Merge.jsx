import React, { useState, useRef, useEffect } from 'react';
import {
  FileText, File, FileSignature, FileImage,
  ArrowLeft, Plus, GripVertical, ShieldAlert,
  Loader2, CheckCircle, Download, AlertCircle,
  ChevronUp, ChevronDown, Mail, AlignLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import './Step4Merge.css';
import '../ApplicationFlow/Step3Letter.css';

const cleanFileName = (filename) => filename ? filename.replace(/\.[^/.]+$/, '') : '';

const Step4Merge = ({ jobImage, aiData, letterHtml, initialAttachments = [], onBack }) => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [userFiles, setUserFiles] = useState({});  // id -> File object
  const [merging, setMerging] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    initDocuments();
  }, [initialAttachments]);

  const initDocuments = async () => {
    setLoadingDocs(true);
    const savedRenames = JSON.parse(localStorage.getItem('renamed_doc_names') || '{}');
    
    // Selalu tambahkan surat lamaran di posisi pertama
    const letterDoc = {
      id: 'letter', type: 'Surat Lamaran',
      sub: 'Surat Lamaran', size: '~',
      selected: true, icon: <FileSignature size={20} />
    };
    // Konversi dokumen dari Step3 ke format Step4 dengan nama ter-rename
    const attachDocs = initialAttachments.map(a => {
      const realName = savedRenames[a.id] || a.name;
      return {
        id: a.id,
        type: cleanFileName(realName),
        sub: cleanFileName(realName),
        size: '~',
        selected: true,
        icon: realName.toLowerCase().includes('pdf') ? <FileText size={20} /> : <File size={20} />,
        storage_path: a.storage_path,
        rawName: realName
      };
    });
    setDocuments([letterDoc, ...attachDocs]);
    setLoadingDocs(false);
  };

  const toggleSelect = (id) =>
    setDocuments(docs => docs.map(d => d.id === id ? { ...d, selected: !d.selected } : d));

  const moveDocOrder = (index, direction) => {
    const selectedDocsList = documents.filter(d => d.selected);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= selectedDocsList.length) return;

    const newSelected = [...selectedDocsList];
    const [moved] = newSelected.splice(index, 1);
    newSelected.splice(targetIndex, 0, moved);

    const unselectedDocs = documents.filter(d => !d.selected);
    setDocuments([...newSelected, ...unselectedDocs]);
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const selectedDocsList = documents.filter(d => d.selected);
    const newSelected = [...selectedDocsList];
    const [moved] = newSelected.splice(draggedIndex, 1);
    newSelected.splice(targetIndex, 0, moved);

    const unselectedDocs = documents.filter(d => !d.selected);
    setDocuments([...newSelected, ...unselectedDocs]);
    setDraggedIndex(null);
  };

  const handleAddFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert('File terlalu besar. Maksimal 5MB.'); return; }

    const tempId = `extra_${Date.now()}`;
    const cleanName = cleanFileName(file.name);
    const newDoc = {
      id: tempId,
      type: cleanName,
      sub: cleanName,
      size: (file.size / 1024).toFixed(0) + ' KB',
      selected: true,
      icon: <File size={20} />,
      localFile: file,
      rawName: file.name
    };
    setDocuments(prev => [...prev, newDoc]);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const fileExt = file.name.split('.').pop();
      const storagePath = `${user.id}/${Math.random().toString(36).slice(2)}.${fileExt}`;
      const { error: upErr } = await supabase.storage
        .from('user_documents').upload(storagePath, file);
      if (!upErr) {
        const { data: inserted } = await supabase.from('user_documents').insert({
          user_id: user.id,
          file_name: file.name,
          file_category: 'Lainnya',
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
        }).select().single();
        if (inserted) {
          setDocuments(prev => prev.map(d =>
            d.id === tempId ? { ...d, id: inserted.id, storage_path: storagePath } : d
          ));
        }
      }
    } catch (err) {
      console.warn('Gagal upload ke Dokumen Saya:', err.message);
    }
  };

  const selectedDocs = documents.filter(d => d.selected);

  const handleMergeAndSave = async () => {
    setMerging(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const formData = new FormData();
      formData.append('letterHtml', letterHtml || '');
      formData.append('selectedDocs', JSON.stringify(selectedDocs.map(d => d.id)));

      for (const doc of selectedDocs) {
        if (doc.id === 'letter') continue;
        if (doc.localFile) {
          formData.append('pdfs', doc.localFile, doc.rawName || doc.sub + '.pdf');
        } else if (doc.storage_path) {
          try {
            const { data: fileBlob, error } = await supabase.storage
              .from('user_documents').download(doc.storage_path);
            if (!error && fileBlob) {
              formData.append('pdfs', fileBlob, doc.rawName || doc.sub + '.pdf');
            }
          } catch (e) {
            console.warn(`Skip ${doc.sub}: ${e.message}`);
          }
        }
      }

      const res = await fetch('https://web-loker-5vpr.vercel.app/api/merge-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menggabungkan PDF');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lamaran_${aiData?.company || 'Perusahaan'}_${aiData?.position || 'Posisi'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      let jobImageUrl = null;
      if (jobImage) {
        try {
          const res = await fetch(jobImage);
          const blob = await res.blob();
          const fileName = `job_${Date.now()}.jpg`;
          const { data: uploadData } = await supabase.storage
            .from('user_documents')
            .upload(`${user.id}/jobs/${fileName}`, blob, { contentType: blob.type });
          
          if (uploadData) {
            const { data } = supabase.storage
              .from('user_documents')
              .getPublicUrl(`${user.id}/jobs/${fileName}`);
            jobImageUrl = data.publicUrl;
          }
        } catch (e) {
          console.warn('Gagal upload job image:', e);
        }
      }

      const payload = {
        user_id: user.id,
        company: aiData?.company || '',
        position: aiData?.position || '',
        location: aiData?.location || '',
        type: aiData?.type || '',
        education: aiData?.education || '',
        experience: aiData?.experience || '',
        email: aiData?.email || '',
        description: aiData?.description || '',
        status: 'draft',
        created_at: new Date().toISOString(),
      };
      
      if (jobImageUrl) {
        payload.job_image_url = jobImageUrl;
      }

      const { error: dbError } = await supabase.from('applications').insert(payload);
      if (dbError) {
        console.error('Simpan DB gagal. Pastikan kolom job_image_url ada!', dbError);
      }

      setDone(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setMerging(false);
    }
  };

  const handleGmailDraft = () => {
    try {
      const to = (aiData?.email && aiData.email !== 'Tidak disebutkan') ? aiData.email : '';
      const pos = aiData?.position || 'Pekerjaan';
      const comp = aiData?.company || 'Perusahaan';
      const userName = user?.user_metadata?.full_name || user?.email || 'Yusril Fahmi';
      
      const subject = `${pos} - ${userName}`;
      
      const bodyText = `Yth. Tim Rekrutmen ${comp}

Dengan hormat,

Sehubungan dengan informasi lowongan pekerjaan yang dibuka oleh ${comp} untuk posisi ${pos}, melalui email ini saya bermaksud untuk mengajukan diri guna mengisi posisi tersebut.

Saya adalah lulusan S1 Teknik Informatika yang memiliki ketertarikan kuat serta keahlian yang relevan.

Sebagai bahan pertimbangan Bapak/Ibu, bersama email ini saya lampirkan berkas dokumen lamaran kerja lengkap (Curriculum Vitae, Surat Lamaran, dan lampiran pendukung) dalam format PDF.

Besar harapan saya untuk diberikan kesempatan mengikuti tahapan seleksi selanjutnya agar dapat mendiskusikan bagaimana kualifikasi saya dapat berkontribusi positif bagi ${comp}.

Terima kasih atas waktu, perhatian, dan kesempatan yang Bapak/Ibu berikan.

Hormat saya,

${userName}`;

      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
      
      const a = document.createElement('a');
      a.href = gmailUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error opening Gmail draft:', err);
      alert('Gagal membuka Gmail draft: ' + err.message);
    }
  };

  return (
    <div className="step4-container">
      <div className="step4-header">
        <h2>4. Gabung Dokumen</h2>
        <p>Pilih dokumen yang akan digabungkan menjadi 1 file PDF lamaran.</p>
      </div>

      {done ? (
        <div 
          className="step4-done" 
          style={{ 
            maxWidth: '560px', 
            margin: '32px auto', 
            padding: '36px 28px', 
            textAlign: 'center', 
            background: '#ffffff', 
            borderRadius: '16px', 
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)', 
            border: '1px solid #e5e7eb' 
          }}
        >
          <div style={{ background: '#f0fdf4', width: '72px', height: '72px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <CheckCircle size={44} color="#16a34a" />
          </div>
          
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>Lamaran Berhasil Dibuat! 🎉</h2>
          <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: 1.5 }}>
            File PDF lamaran sudah otomatis diunduh dan tersimpan di Riwayat Lamaran.
          </p>

          {/* Email & Instructions Banner */}
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#ea4335', color: 'white', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Mail size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: '#991b1b', display: 'block' }}>Email Perusahaan</span>
                <strong style={{ fontSize: '14px', color: '#7f1d1d', wordBreak: 'break-all' }}>{aiData?.email || 'Tidak disebutkan'}</strong>
              </div>
            </div>

            {aiData?.description && (
              <div style={{ borderTop: '1px dashed #fca5a5', paddingTop: '10px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ background: '#fee2e2', color: '#991b1b', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AlignLeft size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700, color: '#991b1b', display: 'block' }}>Dokumen & Tujuan Kirim</span>
                  <span style={{ fontSize: '13px', color: '#7f1d1d', lineHeight: '1.4', display: 'block', marginTop: '2px' }}>{aiData.description}</span>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={handleGmailDraft} 
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#ea4335', color: 'white', border: 'none',
                padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                boxShadow: '0 4px 12px rgba(234, 67, 53, 0.3)', width: '100%'
              }}
            >
              <Mail size={18} /> Kirim via Gmail (Buka Draft)
            </button>

            <button 
              onClick={onBack}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#f3f4f6', color: '#374151', border: 'none',
                padding: '10px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                width: '100%'
              }}
            >
              Buat Lamaran Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="step4-layout">
          {/* Left – Available Docs */}
          <div className="step4-panel">
            <h3 className="panel-title">Dokumen yang Tersedia</h3>

            <div className="docs-available-list">
              {documents.map(doc => (
                <div key={doc.id} className="doc-item">
                  <input type="checkbox" className="doc-checkbox" checked={doc.selected} onChange={() => toggleSelect(doc.id)} />
                  <div className="doc-icon-box">{doc.icon}</div>
                  <div className="doc-info">
                    <span className="doc-type">{cleanFileName(doc.type)}</span>
                  </div>
                  <span className="doc-size">{doc.size}</span>
                </div>
              ))}
            </div>

            <input ref={fileInputRef} type="file" accept=".pdf" style={{display:'none'}} onChange={handleAddFile} />
            <button className="btn-dashed-add" onClick={() => fileInputRef.current.click()}>
              <Plus size={16} /> Tambah Dokumen Lain
              <span className="btn-subtext">Klik untuk pilih file PDF</span>
            </button>
          </div>

          {/* Middle – Order */}
          <div className="step4-panel">
            <h3 className="panel-title">Urutan Dokumen</h3>
            <p className="panel-subtitle">Geser atau gunakan tombol panah untuk mengatur urutan file</p>

            <div className="docs-order-list">
              {selectedDocs.map((doc, index) => (
                <div 
                  key={doc.id} 
                  className="order-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  style={{ cursor: 'grab', userSelect: 'none' }}
                >
                  <div className="order-number">{index + 1}</div>
                  <span className="order-name" style={{ flex: 1 }}>{cleanFileName(doc.type)}</span>
                  
                  {/* Action controls: Up, Down, Drag handle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      disabled={index === 0}
                      onClick={() => moveDocOrder(index, -1)}
                      style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: '2px' }}
                      title="Geser Ke Atas"
                    >
                      <ChevronUp size={16} color="var(--text-main)" />
                    </button>
                    <button
                      disabled={index === selectedDocs.length - 1}
                      onClick={() => moveDocOrder(index, 1)}
                      style={{ background: 'none', border: 'none', cursor: index === selectedDocs.length - 1 ? 'default' : 'pointer', opacity: index === selectedDocs.length - 1 ? 0.3 : 1, padding: '2px' }}
                      title="Geser Ke Bawah"
                    >
                      <ChevronDown size={16} color="var(--text-main)" />
                    </button>
                    <GripVertical size={16} color="var(--text-muted)" style={{ cursor: 'grab' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="info-box">
              <div className="info-icon-circle">i</div>
              <div className="info-text">
                <strong>Tips</strong>
                <p>Urutan dokumen akan sesuai dengan daftar di atas pada file PDF hasil gabungan.</p>
              </div>
            </div>
          </div>

          {/* Right – Summary */}
          <div className="step4-panel summary-panel">
            <h3 className="panel-title">Ringkasan Lamaran</h3>

            <div className="summary-stats">
              <div className="stat-item">
                <span className="stat-label">Total File</span>
                <span className="stat-value">{selectedDocs.length} file</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Format Output</span>
                <span className="stat-value">PDF</span>
              </div>
            </div>

            <div className="summary-illustration">
              <div className="illus-files">
                <div className="illus-file file-1"></div>
                <div className="illus-file file-2"></div>
              </div>
              <div className="illus-arrow">→</div>
              <div className="illus-pdf-box"><span className="pdf-text">PDF</span></div>
            </div>

            <div className="summary-status">
              <h4>Semua siap untuk digabungkan!</h4>
              <p>Pastikan semua dokumen sudah sesuai dan berurutan dengan benar.</p>
            </div>

            {error && (
              <div className="merge-error">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              className="btn-primary btn-merge-large"
              onClick={handleMergeAndSave}
              disabled={merging || selectedDocs.length === 0}
            >
              {merging
                ? <><Loader2 size={18} className="spin" /> Menggabungkan...</>
                : <><FileText size={18} /> Gabungkan Menjadi 1 PDF</>
              }
            </button>

            <div className="security-alert">
              <ShieldAlert size={24} className="security-icon" />
              <div className="security-text">
                <strong>Data Anda Aman</strong>
                <p>Lamaran ini juga akan tersimpan otomatis di Riwayat Lamaran Anda.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!done && (
        <div style={{ paddingTop: '24px', borderTop: '1px solid var(--border-color)' }}>
          <button className="s3-nav-back" onClick={onBack}><ArrowLeft size={16} /> Kembali</button>
        </div>
      )}
    </div>
  );
};

export default Step4Merge;

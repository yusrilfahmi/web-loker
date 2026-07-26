import React, { useState, useRef, useEffect } from 'react';
import {
  Building, MapPin, Briefcase, User, Clock,
  Wand2, Edit3, Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Trash2, Plus, ArrowLeft, ArrowRight, Download, PenTool, FileText, Loader2,
  ChevronUp, ChevronDown, Mail
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './Step3Letter.css';

const cleanFileName = (filename) => filename ? filename.replace(/\.[^/.]+$/, '') : '';

const Step3Letter = ({ jobImage, aiData, onBack, onComplete }) => {
  const navigate = useNavigate();
  const [attachments, setAttachments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [hasSignature, setHasSignature] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');
  const [sigOffset, setSigOffset] = useState({ top: 15, right: 10 });
  const [sigBase64, setSigBase64] = useState('/signature.png');
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startTop: 15, startRight: 10 });
  const paperRef = useRef(null);
  const wrapperRef = useRef(null); // ref for the paper wrapper

  // ── Dynamic paper scaling for mobile ──
  useEffect(() => {
    const A4_WIDTH_PX = 794; // 210mm at 96dpi

    const applyScale = () => {
      if (!wrapperRef.current || !paperRef.current) return;
      const availableWidth = wrapperRef.current.offsetWidth;
      if (availableWidth < A4_WIDTH_PX) {
        const scale = Math.max(availableWidth / A4_WIDTH_PX, 0.3);
        const naturalHeight = paperRef.current.scrollHeight;
        paperRef.current.style.transform = `scale(${scale})`;
        paperRef.current.style.transformOrigin = 'top center';
        paperRef.current.style.marginTop = '0px';
        // Collapse whitespace: after scale visual height = naturalHeight * scale
        // So we need negative margin = naturalHeight * scale - naturalHeight
        const negativeMargin = naturalHeight * (scale - 1);
        paperRef.current.style.marginBottom = `${negativeMargin}px`;
      } else {
        paperRef.current.style.transform = '';
        paperRef.current.style.transformOrigin = '';
        paperRef.current.style.marginBottom = '';
        paperRef.current.style.marginTop = '';
      }
    };

    // Run after first paint so paper has its natural height
    requestAnimationFrame(() => {
      applyScale();
    });

    const ro = new ResizeObserver(applyScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    fetchUserDocs();
    // Load signature image as base64 for reliable PDF rendering
    fetch('/signature.png')
      .then(res => res.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) setSigBase64(reader.result);
        };
        reader.readAsDataURL(blob);
      })
      .catch(err => console.warn('Sig base64 err:', err));
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSig) return;
      const deltaX = e.clientX - dragStartRef.current.mouseX;
      const deltaY = e.clientY - dragStartRef.current.mouseY;
      setSigOffset({
        top: dragStartRef.current.startTop + deltaY,
        right: dragStartRef.current.startRight - deltaX
      });
    };

    const handleMouseUp = () => {
      setIsDraggingSig(false);
    };

    if (isDraggingSig) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSig]);

  const fetchUserDocs = async () => {
    setLoadingDocs(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingDocs(false); return; }
    const { data } = await supabase
      .from('user_documents')
      .select('id, file_name, file_size, storage_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (data) {
      const savedRenames = JSON.parse(localStorage.getItem('renamed_doc_names') || '{}');
      setAttachments(data.map(d => ({ 
        id: d.id, 
        name: savedRenames[d.id] || d.file_name, 
        storage_path: d.storage_path 
      })));
    }
    setLoadingDocs(false);
  };

  const removeAttachment = (id) => setAttachments(prev => prev.filter(a => a.id !== id));

  const moveAttachment = (index, direction) => {
    const newAttachments = [...attachments];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newAttachments.length) return;
    const [movedItem] = newAttachments.splice(index, 1);
    newAttachments.splice(targetIndex, 0, movedItem);
    setAttachments(newAttachments);
  };

  const handleSigMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSig(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startTop: sigOffset.top,
      startRight: sigOffset.right
    };
  };

  const handleToggleSignature = () => {
    setHasSignature(prev => !prev);
  };

  const getFinalLetterHtml = () => {
    if (!paperRef.current) return '';
    const clone = paperRef.current.cloneNode(true);
    const badges = clone.querySelectorAll('.sig-drag-badge');
    badges.forEach(b => b.remove());

    if (hasSignature) {
      const container = clone.querySelector('.ltr-signoff-container');
      if (container) {
        let sigEl = container.querySelector('.floating-signature-overlay');
        if (!sigEl) {
          sigEl = document.createElement('div');
          sigEl.className = 'floating-signature-overlay';
          container.appendChild(sigEl);
        }
        sigEl.style.position = 'absolute';
        sigEl.style.top = `${sigOffset.top}px`;
        sigEl.style.right = `${sigOffset.right}px`;
        sigEl.style.zIndex = '100';
        sigEl.innerHTML = `<img src="${sigBase64}" alt="Tanda Tangan" style="height: 75px; width: auto; display: block;" />`;
      }
    } else {
      const sigEl = clone.querySelector('.floating-signature-overlay');
      if (sigEl) sigEl.remove();
    }
    return clone.innerHTML;
  };

  const handleGenerateAI = async () => {
    setGeneratingAI(true);
    setAiError('');
    try {
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      const res = await fetch('https://web-loker-5vpr.vercel.app/api/generate-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobData: aiData, userProfile }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (paperRef.current) {
        paperRef.current.innerHTML = data.letter;
        setHasSignature(false);
      }
    } catch (err) {
      setAiError('Gagal generate surat: ' + err.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
  };

  const handlePrint = () => {
    const content = getFinalLetterHtml();
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return alert('Izinkan popup untuk mencetak PDF.');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Surat Lamaran</title>
        <style>
          @page { size: A4; margin: 20mm 25.4mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #000; position: relative; }
          .ltr-date { text-align: right; margin-bottom: 14pt; margin-top: 0; }
          .ltr-line { margin-bottom: 0; line-height: 1.5; margin-top: 0; }
          .ltr-justify { text-align: justify; margin-top: 8pt; margin-bottom: 0; text-justify: inter-word; }
          .ltr-signoff { text-align: right; margin-top: 0; margin-bottom: 0; }
          .floating-signature-overlay { position: absolute; z-index: 100; }
          .floating-signature-overlay img { height: 70px; width: auto; }
          .ltr-table { border-collapse: collapse; width: 100%; margin: 0; }
          .ltr-table td { padding: 1pt 0; vertical-align: top; font-size: 11pt; border: none; }
          .ltr-table col:nth-child(1) { width: 175px; }
          .ltr-table col:nth-child(2) { width: 16px; }
          .ltr-list { margin: 0 0 0 20px; }
          .ltr-list li { margin-bottom: 2pt; }
          p { margin: 0; }
          strong { font-weight: bold; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  const handleMergeAndSave = async (openGmail = false) => {
    setIsMerging(true);
    setMergeError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const formData = new FormData();
      
      const letterContent = getFinalLetterHtml();
      formData.append('letterHtml', letterContent || '');
      
      const docIds = ['letter', ...attachments.map(a => a.id)];
      formData.append('selectedDocs', JSON.stringify(docIds));

      for (const doc of attachments) {
        if (doc.storage_path) {
          try {
            const { data: fileBlob, error } = await supabase.storage
              .from('user_documents').download(doc.storage_path);
            if (!error && fileBlob) {
              formData.append('pdfs', fileBlob, doc.name + '.pdf');
            }
          } catch (e) {
            console.warn(`Skip ${doc.name}: ${e.message}`);
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
      if (dbError) console.error('Simpan DB gagal:', dbError);
      
      if (openGmail) {
        const to = (aiData?.email && aiData.email !== 'Tidak disebutkan') ? aiData.email : '';
        const pos = aiData?.position || 'Pekerjaan';
        const comp = aiData?.company || 'Perusahaan';
        const userName = user?.user_metadata?.full_name || user?.email || 'Pelamar';
        
        const subject = `${pos} - ${userName}`;
        
        const bodyText = `Yth. Tim Rekrutmen ${comp}\n\nDengan hormat,\n\nSehubungan dengan informasi lowongan pekerjaan yang dibuka oleh ${comp} untuk posisi ${pos}, melalui email ini saya bermaksud untuk mengajukan diri guna mengisi posisi tersebut.\n\nSebagai bahan pertimbangan Bapak/Ibu, bersama email ini saya lampirkan berkas dokumen lamaran kerja lengkap (Curriculum Vitae, Surat Lamaran, dan lampiran pendukung) dalam format PDF.\n\nBesar harapan saya untuk diberikan kesempatan mengikuti tahapan seleksi selanjutnya agar dapat mendiskusikan bagaimana kualifikasi saya dapat berkontribusi positif bagi ${comp}.\n\nTerima kasih atas waktu, perhatian, dan kesempatan yang Bapak/Ibu berikan.\n\nHormat saya,\n\n${userName}`;
  
        const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
        
        const gmailLink = document.createElement('a');
        gmailLink.href = gmailUrl;
        gmailLink.target = '_blank';
        gmailLink.rel = 'noopener noreferrer';
        document.body.appendChild(gmailLink);
        gmailLink.click();
        document.body.removeChild(gmailLink);
        
        // Let the user know they have to attach the PDF manually
        alert("PENTING:\n\nFile PDF Lamaran Anda telah diunduh.\nSilakan seret (drag and drop) file PDF tersebut ke halaman Gmail yang baru saja terbuka.");
      }

      if (onComplete) onComplete();
      navigate('/history');
    } catch (err) {
      console.error(err);
      setMergeError(err.message);
    } finally {
      setIsMerging(false);
    }
  };

  const company = aiData?.company || 'PT PETRO GRAHA MEDIKA';
  const position = aiData?.position || 'IT Staff';
  const location = aiData?.location || 'Gresik, Jawa Timur';
  const experience = aiData?.experience || '1 - 3 Tahun';
  const type = aiData?.type || 'Full Time';

  return (
    <div className="step3-container">
      <div className="step3-layout">

        {/* ─── Middle Panel: Editor ─── */}
        <div className="step3-middle-panel">
          {/* Header */}
          <div className="s3-editor-header">
            <div className="s3-editor-title">
              <div className="s3-title-icon"><FileText size={18} color="var(--primary)" /></div>
              <div>
                <h2>3. Surat Lamaran</h2>
                <p>Buat dan sesuaikan surat lamaran Anda sebelum melanjutkan.</p>
              </div>
            </div>
            {aiError && <p style={{color:'#dc2626', fontSize:'13px', marginTop:'8px'}}>{aiError}</p>}
          </div>

          {/* Toolbar */}
          <div className="s3-editor-box">
            <div className="s3-toolbar">
              <button className="s3-tool"><Undo size={15} /></button>
              <button className="s3-tool"><Redo size={15} /></button>
              <div className="s3-divider" />
              <select className="s3-select" style={{width: 56}}>
                <option>100%</option>
              </select>
              <select className="s3-select" style={{width: 136}}>
                <option>Times New Roman</option>
              </select>
              <div className="s3-size-ctrl">
                <button className="s3-tool">−</button>
                <span>11</span>
                <button className="s3-tool">+</button>
              </div>
              <div className="s3-divider" />
              <button className="s3-tool"><Bold size={15} /></button>
              <button className="s3-tool"><Italic size={15} /></button>
              <button className="s3-tool"><Underline size={15} /></button>
              <div className="s3-divider" />
              <button className="s3-tool s3-active"><AlignLeft size={15} /></button>
              <button className="s3-tool"><AlignCenter size={15} /></button>
              <button className="s3-tool"><AlignRight size={15} /></button>
            </div>

            {/* Paper */}
            <div className="s3-paper-wrapper" ref={wrapperRef}>
              <div
                ref={paperRef}
                id="letter-print-area"
                className="s3-paper"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={handleKeyDown}
              >
                {/* Date — rata kanan */}
                <br />
                <p className="ltr-date">Gresik, {new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>

                {/* Recipient */}
                <p className="ltr-line"><strong>Kepada Yth.</strong></p>
                <p className="ltr-line"><strong>Bapak/Ibu HRD</strong></p>
                <p className="ltr-line"><strong>{company.toUpperCase()}</strong></p>
                <br />

                {/* Salutation */}
                <p className="ltr-line"><strong>Dengan hormat,</strong></p>
                <p className="ltr-justify">
                  Sesuai informasi yang saya bahwa terdapat lowongan pekerjaan pada perusahaan Bapak/Ibu.
                  Melalui surat lamaran ini, saya mengajukan diri melamar pekerjaan sebagai <strong>{position}</strong>.
                  Saya yang bertandatangan di bawah ini:
                </p>

                {/* Personal Data Table */}
                <table className="ltr-table">
                  <colgroup>
                    <col style={{width:'175px'}} />
                    <col style={{width:'16px'}} />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr><td>Nama</td><td>:</td><td>Yusril Fahmi</td></tr>
                    <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>Gresik, 23 November 2001</td></tr>
                    <tr><td>Pendidikan Terakhir</td><td>:</td><td>Strata 1</td></tr>
                    <tr><td>Jurusan</td><td>:</td><td>Teknik Informatika</td></tr>
                    <tr><td>IPK</td><td>:</td><td>3.82</td></tr>
                    <tr><td>Status Nikah</td><td>:</td><td>Belum menikah</td></tr>
                    <tr><td>Alamat</td><td>:</td><td>Cerme Indah Jl Kurma Blok O Nomor 235 RT 6 RW 4</td></tr>
                    <tr><td>No. Telp</td><td>:</td><td>085156804614</td></tr>
                  </tbody>
                </table>

                {/* Body */}
                <p className="ltr-justify">
                  Dengan ini saya mengajukan surat lamaran pekerjaan di perusahaan yang Bapak/Ibu pimpin sebagai{' '}
                  <strong>{position}</strong>, saya adalah seorang yang bertanggung jawab dalam pekerjaan,
                  manajemen waktu, disiplin, mampu bekerja sebagai tim maupun individu, bersemangat dan mampu
                  bekerja dibawah tekanan. Berbekal pengalaman yang saya miliki, menjadi bekal bagi saya untuk
                  bekerja sebagai <strong>{position}</strong> di <strong>{company.toUpperCase()}</strong>.
                  Saya yakin bisa memberikan kontribusi maksimal di perusahaan Bapak/Ibu.
                  Sebagai bahan pertimbangan, bersama ini terlampir:
                </p>
                {/* Attachment List - Tanpa Ekstensi */}
                <ul className="ltr-list">
                  {attachments.map(a => <li key={a.id}>{cleanFileName(a.name)}</li>)}
                </ul>

                {/* Closing */}
                <p className="ltr-justify">
                  Besar harapan saya lamaran pekerjaan ini mendapat respon yang baik dari Bapak/Ibu.
                  Atas perhatian dan kesediaan Bapak/Ibu saya ucapkan terima kasih.
                </p>
                <br />
                <br />
                <br />
                <br />

                {/* Sign off — rata kanan */}
                <div className="ltr-signoff-container" style={{ textAlign: 'right', position: 'relative', marginTop: '24px', pageBreakInside: 'avoid' }}>
                  <p className="ltr-signoff">Hormat Saya</p>
                  <div style={{ height: '65px' }}></div>
                  <p className="ltr-signoff">Yusril Fahmi</p>

                  {/* Floating Sticker Signature Overlay */}
                  {hasSignature && (
                    <div
                      className="floating-signature-overlay"
                      style={{
                        position: 'absolute',
                        top: `${sigOffset.top}px`,
                        right: `${sigOffset.right}px`,
                      }}
                      onMouseDown={handleSigMouseDown}
                    >
                      <img
                        src={sigBase64}
                        alt="Tanda Tangan"
                        draggable={false}
                        style={{ height: '75px', width: 'auto', display: 'block', pointerEvents: 'none' }}
                      />
                      <div 
                        className="sig-drag-badge"
                        style={{
                          position: 'absolute',
                          bottom: -18,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          fontSize: '10px',
                          background: 'rgba(99, 102, 241, 0.95)',
                          color: 'white',
                          padding: '1px 6px',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          fontWeight: '600',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}
                      >
                        Geser ✥
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="s3-editor-footer">
              <span>A4 (210 × 297 mm)</span>
            </div>
          </div>

          {/* Actions below editor */}
          <div className="s3-bottom-actions">
            <button className="s3-btn-outline" onClick={handlePrint}><Download size={14} /> Unduh PDF</button>
            <button 
              className={`s3-btn-outline ${hasSignature ? 'active-signature' : ''}`}
              onClick={handleToggleSignature}
              style={{
                borderColor: hasSignature ? 'var(--primary)' : undefined,
                color: hasSignature ? 'var(--primary)' : undefined,
                backgroundColor: hasSignature ? '#f5f3ff' : undefined
              }}
            >
              <PenTool size={14} /> {hasSignature ? 'Hapus Tanda Tangan' : 'Pasang Tanda Tangan'}
            </button>
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="step3-right-panel">
          
          <div className="s3-info-card" style={{ marginBottom: '24px' }}>
            <p className="s3-info-title">Informasi Lamaran</p>
            <div className="s3-info-item">
              <div className="s3-info-icon"><Building size={16} /></div>
              <div>
                <span className="s3-info-label">Perusahaan</span>
                <span className="s3-info-value">{company}</span>
              </div>
            </div>
            <div className="s3-info-item">
              <div className="s3-info-icon"><Briefcase size={16} /></div>
              <div>
                <span className="s3-info-label">Posisi</span>
                <span className="s3-info-value">{position}</span>
              </div>
            </div>
            <div className="s3-info-item">
              <div className="s3-info-icon"><MapPin size={16} /></div>
              <div>
                <span className="s3-info-label">Lokasi</span>
                <span className="s3-info-value">{location}</span>
              </div>
            </div>
            <div className="s3-info-item">
              <div className="s3-info-icon"><User size={16} /></div>
              <div>
                <span className="s3-info-label">Pengalaman</span>
                <span className="s3-info-value">{experience}</span>
              </div>
            </div>
            <div className="s3-info-item">
              <div className="s3-info-icon"><Clock size={16} /></div>
              <div>
                <span className="s3-info-label">Jenis Pekerjaan</span>
                <span className="s3-info-value">{type}</span>
              </div>
            </div>
            <div className="s3-info-item">
              <div className="s3-info-icon"><AlignLeft size={16} /></div>
              <div>
                <span className="s3-info-label">Dokumen & Tujuan Kirim</span>
                <span className="s3-info-value">{aiData?.description || '-'}</span>
              </div>
            </div>
          </div>

          <p className="s3-info-title">Daftar Lampiran yang Akan Disertakan</p>
          <p className="s3-attach-sub">Gunakan panah untuk mengatur urutan atau hapus file.</p>

          <div className="s3-attach-list">
            {loadingDocs ? (
              <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px'}}>
                <Loader2 size={20} className="spin" /> Memuat dokumen...
              </div>
            ) : attachments.length === 0 ? (
              <div style={{textAlign:'center', padding:'20px', color:'var(--text-muted)', fontSize:'13px'}}>
                Belum ada dokumen. Upload dulu di menu "Dokumen Saya".
              </div>
            ) : (
              attachments.map((item, index) => (
                <div key={item.id} className="s3-attach-item" style={{ gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button 
                      disabled={index === 0} 
                      onClick={() => moveAttachment(index, -1)}
                      style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: 0 }}
                      title="Geser Ke Atas"
                    >
                      <ChevronUp size={14} color="var(--text-main)" />
                    </button>
                    <button 
                      disabled={index === attachments.length - 1} 
                      onClick={() => moveAttachment(index, 1)}
                      style={{ background: 'none', border: 'none', cursor: index === attachments.length - 1 ? 'default' : 'pointer', opacity: index === attachments.length - 1 ? 0.3 : 1, padding: 0 }}
                      title="Geser Ke Bawah"
                    >
                      <ChevronDown size={14} color="var(--text-main)" />
                    </button>
                  </div>
                  <span className="s3-attach-name" style={{ flex: 1 }}>{cleanFileName(item.name)}</span>
                  <button className="s3-btn-del" onClick={() => removeAttachment(item.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Footer Nav */}
      <div className="s3-nav-footer" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
        <button className="s3-nav-back" onClick={onBack} disabled={isMerging}><ArrowLeft size={16} /> Kembali</button>
        <button className="s3-nav-next" style={{ background: '#ef4444' }} onClick={() => handleMergeAndSave(true)} disabled={isMerging}>
          {isMerging ? (
            <><Loader2 size={16} className="spin" /> Memproses...</>
          ) : (
            <><Mail size={16} /> Kirim via Gmail</>
          )}
        </button>
        <button className="s3-nav-next" onClick={() => handleMergeAndSave(false)} disabled={isMerging}>
          {isMerging ? (
            <><Loader2 size={16} className="spin" /> Memproses...</>
          ) : (
            <><Download size={16} /> Selesai & Unduh PDF</>
          )}
        </button>
      </div>
      {mergeError && <div style={{ color: 'red', textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>{mergeError}</div>}
    </div>
  );
};

export default Step3Letter;

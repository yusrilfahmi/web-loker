import React, { useState, useRef, useEffect } from 'react';
import {
  Building, MapPin, Briefcase, User, Clock,
  Wand2, Edit3, Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Trash2, Plus, ArrowLeft, ArrowRight, Download, PenTool, FileText, Loader2,
  ChevronUp, ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Step3Letter.css';

const cleanFileName = (filename) => filename ? filename.replace(/\.[^/.]+$/, '') : '';

const Step3Letter = ({ aiData, onNext, onBack }) => {
  const [attachments, setAttachments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');
  const [hasSignature, setHasSignature] = useState(false);
  const [sigOffset, setSigOffset] = useState({ top: 15, right: 10 });
  const [sigBase64, setSigBase64] = useState('/signature.png');
  const [isDraggingSig, setIsDraggingSig] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, startTop: 15, startRight: 10 });
  const paperRef = useRef(null);

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
      const res = await fetch('http://localhost:5000/api/generate-letter', {
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
            <div className="s3-paper-wrapper">
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
                <br />
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
      <div className="s3-nav-footer">
        <button className="s3-nav-back" onClick={onBack}><ArrowLeft size={16} /> Kembali</button>
        <button className="s3-nav-next" onClick={() => onNext(getFinalLetterHtml(), attachments)}>
          Lanjut ke Gabung Dokumen <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Step3Letter;

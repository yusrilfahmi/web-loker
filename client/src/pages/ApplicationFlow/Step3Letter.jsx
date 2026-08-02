import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Building, MapPin, Briefcase, User, Clock,
  Edit3, Undo, Redo, Bold, Italic, Underline,
  AlignLeft, AlignCenter, AlignRight,
  Trash2, ArrowLeft, Download, PenTool, FileText, Loader2,
  ChevronUp, ChevronDown, Mail, Layers, Save, RotateCcw, X, CheckSquare, Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import GmailModal from '../../components/GmailModal/GmailModal';
import './Step3Letter.css';

const cleanFileName = (filename) => filename ? filename.replace(/\.[^/.]+$/, '') : '';

// ── Letter Templates ───────────────────────────────────────────────────────
const buildTemplates = (company, position, userProfile, attachments) => {
  const name     = userProfile?.full_name    || 'Nama Pelamar';
  const place    = userProfile?.birthplace   || 'Kota';
  const bdate    = userProfile?.birthdate
    ? new Date(userProfile.birthdate).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
    : 'Tanggal Lahir';
  const edu      = userProfile?.education    || 'Strata 1';
  const major    = userProfile?.major        || '-';
  const gpa      = userProfile?.gpa          || '-';
  const marital  = userProfile?.marital_status || 'Belum menikah';
  const address  = userProfile?.address      || 'Alamat';
  const phone    = userProfile?.phone        || '-';
  const today    = new Date().toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' });
  const cityText = place || 'Kota';
  const attachList = attachments.length
    ? attachments.map(a => `<li>${cleanFileName(a.name)}</li>`).join('')
    : '<li>Curriculum Vitae</li><li>Surat Lamaran</li>';

  return [
    {
      id: 0,
      label: '📋 Template Formal',
      desc: 'Surat lamaran formal baku Indonesia',
      html: `
<p class="ltr-date">${cityText}, ${today}</p>
<p class="ltr-line"><strong>Kepada Yth.</strong></p>
<p class="ltr-line"><strong>Bapak/Ibu HRD</strong></p>
<p class="ltr-line"><strong>${company.toUpperCase()}</strong></p>
<br/>
<p class="ltr-line"><strong>Dengan hormat,</strong></p>
<p class="ltr-justify">
  Sesuai informasi yang saya peroleh, terdapat lowongan pekerjaan pada perusahaan Bapak/Ibu.
  Melalui surat lamaran ini, saya mengajukan diri melamar pekerjaan sebagai <strong>${position}</strong>.
  Saya yang bertandatangan di bawah ini:
</p>
<table class="ltr-table">
  <colgroup><col style="width:175px"/><col style="width:16px"/><col/></colgroup>
  <tbody>
    <tr><td>Nama</td><td>:</td><td>${name}</td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${place}, ${bdate}</td></tr>
    <tr><td>Pendidikan Terakhir</td><td>:</td><td>${edu}</td></tr>
    <tr><td>Jurusan</td><td>:</td><td>${major}</td></tr>
    <tr><td>IPK</td><td>:</td><td>${gpa}</td></tr>
    <tr><td>Status Nikah</td><td>:</td><td>${marital}</td></tr>
    <tr><td>Alamat</td><td>:</td><td>${address}</td></tr>
    <tr><td>No. Telp</td><td>:</td><td>${phone}</td></tr>
  </tbody>
</table>
<br/>
<p class="ltr-justify">
  Dengan ini saya mengajukan surat lamaran pekerjaan di perusahaan yang Bapak/Ibu pimpin
  sebagai <strong>${position}</strong>. Saya adalah seorang yang bertanggung jawab dalam pekerjaan,
  manajemen waktu, disiplin, mampu bekerja sebagai tim maupun individu, bersemangat dan mampu
  bekerja di bawah tekanan. Sebagai bahan pertimbangan, bersama ini terlampir:
</p>
<ul class="ltr-list">${attachList}</ul>
<br/>
<p class="ltr-justify">
  Besar harapan saya lamaran pekerjaan ini mendapat respon yang baik dari Bapak/Ibu.
  Atas perhatian dan kesediaan Bapak/Ibu saya ucapkan terima kasih.
</p>
<br/>
<div class="ltr-signoff-container" style="text-align:right;position:relative;margin-top:24px;page-break-inside:avoid">
  <p class="ltr-signoff">Hormat Saya,</p>
  <div style="height:65px"></div>
  <p class="ltr-signoff"><strong>${name}</strong></p>
</div>`
    },
    {
      id: 1,
      label: '🎓 Template Fresh Graduate',
      desc: 'Menonjolkan potensi dan semangat belajar',
      html: `
<p class="ltr-date">${cityText}, ${today}</p>
<p class="ltr-line"><strong>Kepada Yth.</strong></p>
<p class="ltr-line"><strong>HRD ${company}</strong></p>
<p class="ltr-line"><strong>${company.toUpperCase()}</strong></p>
<br/>
<p class="ltr-line"><strong>Dengan hormat,</strong></p>
<p class="ltr-justify">
  Dengan penuh semangat dan harapan, saya ${name}, seorang lulusan baru ${edu} Program Studi ${major},
  mengajukan lamaran untuk posisi <strong>${position}</strong> di ${company}.
  Meskipun baru memulai karier profesional, saya membawa semangat belajar yang tinggi, kemampuan adaptasi
  yang cepat, serta fondasi akademik yang kuat (IPK ${gpa}) sebagai modal utama saya.
</p>
<br/>
<p class="ltr-justify">Berikut adalah data diri saya:</p>
<table class="ltr-table">
  <colgroup><col style="width:175px"/><col style="width:16px"/><col/></colgroup>
  <tbody>
    <tr><td>Nama</td><td>:</td><td>${name}</td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>:</td><td>${place}, ${bdate}</td></tr>
    <tr><td>Pendidikan Terakhir</td><td>:</td><td>${edu} – ${major}</td></tr>
    <tr><td>IPK</td><td>:</td><td>${gpa}</td></tr>
    <tr><td>Alamat</td><td>:</td><td>${address}</td></tr>
    <tr><td>No. Telp</td><td>:</td><td>${phone}</td></tr>
  </tbody>
</table>
<br/>
<p class="ltr-justify">
  Saya percaya bahwa kesempatan bergabung bersama ${company} akan menjadi langkah awal yang luar biasa
  dalam perjalanan karier saya. Saya berkomitmen untuk terus belajar dan berkontribusi secara maksimal
  demi kemajuan perusahaan. Sebagai bahan pertimbangan, saya lampirkan:
</p>
<ul class="ltr-list">${attachList}</ul>
<br/>
<p class="ltr-justify">
  Besar harapan saya untuk dapat bertemu dan berdiskusi lebih lanjut mengenai kontribusi yang dapat
  saya berikan. Atas perhatian Bapak/Ibu, saya ucapkan terima kasih.
</p>
<br/>
<div class="ltr-signoff-container" style="text-align:right;position:relative;margin-top:24px;page-break-inside:avoid">
  <p class="ltr-signoff">Hormat Saya,</p>
  <div style="height:65px"></div>
  <p class="ltr-signoff"><strong>${name}</strong></p>
</div>`
    },
    {
      id: 2,
      label: '💼 Template Modern & Ringkas',
      desc: 'Padat, langsung ke poin, cocok untuk startup',
      html: `
<p class="ltr-date">${cityText}, ${today}</p>
<p class="ltr-line"><strong>Yth. Tim Rekrutmen ${company}</strong></p>
<br/>
<p class="ltr-line"><strong>Perihal: Lamaran Pekerjaan – ${position}</strong></p>
<br/>
<p class="ltr-justify">
  Dengan hormat, saya ${name} (${place}, ${bdate} | ${edu} ${major} | IPK ${gpa}),
  bermaksud melamar untuk posisi <strong>${position}</strong> yang saat ini dibuka di ${company}.
</p>
<br/>
<p class="ltr-justify">
  Saya memiliki latar belakang yang relevan dan telah membuktikan kemampuan saya melalui berbagai
  proyek dan pengalaman. Saya dikenal sebagai individu yang proaktif, mampu bekerja dalam tim
  maupun mandiri, serta berorientasi pada solusi.
</p>
<br/>
<p class="ltr-justify"><strong>Kontak & Domisili:</strong></p>
<table class="ltr-table">
  <colgroup><col style="width:175px"/><col style="width:16px"/><col/></colgroup>
  <tbody>
    <tr><td>Alamat</td><td>:</td><td>${address}</td></tr>
    <tr><td>No. Telp / WA</td><td>:</td><td>${phone}</td></tr>
    <tr><td>Status</td><td>:</td><td>${marital}</td></tr>
  </tbody>
</table>
<br/>
<p class="ltr-justify">
  Bersama surat ini, saya lampirkan berkas pendukung:
</p>
<ul class="ltr-list">${attachList}</ul>
<br/>
<p class="ltr-justify">
  Saya sangat berharap dapat berkontribusi bagi ${company} dan siap untuk dihubungi
  kapan saja untuk proses wawancara. Terima kasih atas kesempatan ini.
</p>
<br/>
<div class="ltr-signoff-container" style="text-align:right;position:relative;margin-top:24px;page-break-inside:avoid">
  <p class="ltr-signoff">Salam Profesional,</p>
  <div style="height:65px"></div>
  <p class="ltr-signoff"><strong>${name}</strong></p>
</div>`
    }
  ];
};

// ──────────────────────────────────────────────────────────────────────────────

const Step3Letter = ({ jobImage, aiData, onBack, onComplete }) => {
  const navigate = useNavigate();

  const [attachments, setAttachments] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [userProfile, setUserProfile] = useState({});
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  const [hasSignature, setHasSignature] = useState(false);
  const [sigBase64, setSigBase64] = useState(null);

  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState('');

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewTemplateIdx, setPreviewTemplateIdx] = useState(0); // preview tab in modal
  // Gmail modal
  const [showGmailModal, setShowGmailModal] = useState(false);
  // Save indicator
  const [savedIndicator, setSavedIndicator] = useState(false);

  const SESSION_KEY = `letterContent_${aiData?.company}_${aiData?.position}`;

  // ── Scale paper ────────────────────────────────────────────────────────────
  useEffect(() => {
    const A4_WIDTH_PX = 794;
    const applyScale = () => {
      if (!wrapperRef.current || !paperRef.current) return;
      const availableWidth = wrapperRef.current.offsetWidth;
      if (availableWidth < A4_WIDTH_PX) {
        const scale = Math.max(availableWidth / A4_WIDTH_PX, 0.3);
        const naturalHeight = paperRef.current.scrollHeight;
        paperRef.current.style.transform = `scale(${scale})`;
        paperRef.current.style.transformOrigin = 'top center';
        paperRef.current.style.marginTop = '0px';
        const negativeMargin = naturalHeight * (scale - 1);
        paperRef.current.style.marginBottom = `${negativeMargin}px`;
      } else {
        paperRef.current.style.transform = '';
        paperRef.current.style.transformOrigin = '';
        paperRef.current.style.marginBottom = '';
        paperRef.current.style.marginTop = '';
      }
    };
    requestAnimationFrame(applyScale);
    const ro = new ResizeObserver(applyScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Init: load profile + docs + signature ─────────────────────────────────
  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    // 1. Load user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const prof = profileData || JSON.parse(localStorage.getItem('userProfile') || '{}');
    setUserProfile(prof);
    localStorage.setItem('userProfile', JSON.stringify(prof));

    // 2. Load signature from Supabase Storage
    if (profileData?.signature_path) {
      try {
        const { data: urlData } = await supabase.storage
          .from('signatures')
          .createSignedUrl(profileData.signature_path, 3600);
        if (urlData?.signedUrl) {
          const res = await fetch(urlData.signedUrl);
          const blob = await res.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setSigBase64(reader.result);
              setHasSignature(true);
            }
          };
          reader.readAsDataURL(blob);
        }
      } catch (e) {
        console.warn('Sig load err:', e);
      }
    } else {
      // fallback to static /signature.png
      fetch('/signature.png')
        .then(r => r.ok ? r.blob() : null)
        .then(blob => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => { if (reader.result) setSigBase64(reader.result); };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    }

    // 3. Load docs
    await fetchUserDocs(user);
  };

  const fetchUserDocs = async (user) => {
    setLoadingDocs(true);
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

  // ── After docs loaded, restore saved letter or apply default template ─────
  useEffect(() => {
    if (loadingDocs) return;
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved && paperRef.current) {
      paperRef.current.innerHTML = saved;
    } else {
      applyTemplate(0);
    }
  }, [loadingDocs]);

  // ── Draggable signature ────────────────────────────────────────────────────
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSig) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      setSigOffset({ top: dragStartRef.current.startTop + dy, right: dragStartRef.current.startRight - dx });
    };
    const handleMouseUp = () => setIsDraggingSig(false);
    if (isDraggingSig) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSig]);

  // ── Template Apply ─────────────────────────────────────────────────────────
  const applyTemplate = useCallback((idx) => {
    const company  = aiData?.company  || 'Perusahaan';
    const position = aiData?.position || 'Posisi';
    const templates = buildTemplates(company, position, userProfile, attachments);
    if (paperRef.current) {
      paperRef.current.innerHTML = templates[idx].html;
      // Remove old sig overlay
      if (hasSignature && sigBase64) {
        injectSignatureIntoPaper(paperRef.current, sigBase64);
      }
    }
    setShowTemplateModal(false);
    sessionStorage.removeItem(SESSION_KEY);
  }, [userProfile, attachments, aiData, hasSignature, sigBase64]);

  // ── Save edits ─────────────────────────────────────────────────────────────
  const handleSaveEdits = () => {
    if (paperRef.current) {
      sessionStorage.setItem(SESSION_KEY, paperRef.current.innerHTML);
      setSavedIndicator(true);
      setTimeout(() => setSavedIndicator(false), 2500);
    }
  };

  const handleResetLetter = () => {
    if (!window.confirm('Reset ke template awal? Editan akan hilang.')) return;
    sessionStorage.removeItem(SESSION_KEY);
    applyTemplate(0);
  };

  // ── Signature ──────────────────────────────────────────────────────────────
  const handleSigMouseDown = (e) => {
    e.preventDefault();
    setIsDraggingSig(true);
    dragStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, startTop: sigOffset.top, startRight: sigOffset.right };
  };

  // ── Inject signature into paper HTML at signoff container ─────────────────
  const injectSignatureIntoPaper = (el, base64) => {
    // remove existing sig overlay first
    el.querySelectorAll('.sig-in-paper').forEach(n => n.remove());
    const container = el.querySelector('.ltr-signoff-container');
    if (!container) return;
    container.style.position = 'relative';
    const sigEl = document.createElement('div');
    sigEl.className = 'sig-in-paper';
    sigEl.style.cssText = 'position:absolute;bottom:22px;right:0;';
    sigEl.innerHTML = `<img src="${base64}" alt="Tanda Tangan" style="height:72px;width:auto;display:block;" />`;
    container.appendChild(sigEl);
  };

  const getFinalLetterHtml = () => {
    if (!paperRef.current) return '';
    const clone = paperRef.current.cloneNode(true);
    // sig is already injected in paper, just clean up drag badge if any
    clone.querySelectorAll('.sig-drag-badge').forEach(b => b.remove());
    return clone.innerHTML;
  };

  // ── Print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const content = getFinalLetterHtml();
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return alert('Izinkan popup untuk mencetak PDF.');
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Surat Lamaran</title>
      <style>
        @page { size: A4; margin: 20mm 25.4mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; color: #000; position: relative; }
        .ltr-date { text-align: right; margin-bottom: 14pt; }
        .ltr-line { margin-bottom: 0; line-height: 1.5; }
        .ltr-justify { text-align: justify; margin-top: 8pt; text-justify: inter-word; }
        .ltr-signoff { text-align: right; }
        .floating-signature-overlay { position: absolute; z-index: 100; }
        .floating-signature-overlay img { height: 70px; width: auto; }
        .ltr-table { border-collapse: collapse; width: 100%; }
        .ltr-table td { padding: 1pt 0; vertical-align: top; font-size: 11pt; border: none; }
        .ltr-table col:nth-child(1) { width: 175px; }
        .ltr-table col:nth-child(2) { width: 16px; }
        .ltr-list { margin: 0 0 0 20px; }
        .ltr-list li { margin-bottom: 2pt; }
        p { margin: 0; } strong { font-weight: bold; }
      </style></head><body>${content}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  // ── Merge & Save ──────────────────────────────────────────────────────────
  const handleMergeAndSave = async () => {
    setIsMerging(true);
    setMergeError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const formData = new FormData();
      formData.append('letterHtml', getFinalLetterHtml() || '');
      formData.append('selectedDocs', JSON.stringify(['letter', ...attachments.map(a => a.id)]));

      const attachmentUrls = [];
      for (const doc of attachments) {
        if (doc.storage_path) {
          try {
            const { data, error } = await supabase.storage
              .from('user_documents').createSignedUrl(doc.storage_path, 60);
            if (!error && data?.signedUrl) attachmentUrls.push({ name: doc.name, url: data.signedUrl });
          } catch (e) { console.warn(`Skip URL ${doc.name}:`, e.message); }
        }
      }
      formData.append('attachmentUrls', JSON.stringify(attachmentUrls));

      const res = await fetch('https://web-loker-5vpr.vercel.app/api/merge-pdf', { method: 'POST', body: formData });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Gagal merge PDF'); }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lamaran_${aiData?.company || 'Perusahaan'}_${aiData?.position || 'Posisi'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      // Save job image
      let jobImageUrl = null;
      if (jobImage) {
        try {
          const r = await fetch(jobImage);
          const b = await r.blob();
          const fn = `job_${Date.now()}.jpg`;
          const { data: up } = await supabase.storage.from('user_documents').upload(`${user.id}/jobs/${fn}`, b, { contentType: b.type });
          if (up) {
            const { data: pub } = supabase.storage.from('user_documents').getPublicUrl(`${user.id}/jobs/${fn}`);
            jobImageUrl = pub.publicUrl;
          }
        } catch (e) { console.warn('Job image upload err:', e); }
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
        ...(jobImageUrl && { job_image_url: jobImageUrl }),
      };
      const { error: dbError } = await supabase.from('applications').insert(payload);
      if (dbError) console.error('Simpan DB gagal:', dbError);

      sessionStorage.removeItem(SESSION_KEY);
      if (onComplete) onComplete();
      navigate('/history');
    } catch (err) {
      console.error(err);
      setMergeError(err.message || 'Gagal menggabungkan PDF');
    } finally {
      setIsMerging(false);
    }
  };

  // toggle sig in paper
  const handleToggleSignature = () => {
    if (!paperRef.current) return;
    if (hasSignature) {
      // remove
      paperRef.current.querySelectorAll('.sig-in-paper').forEach(n => n.remove());
      setHasSignature(false);
    } else {
      if (!sigBase64) {
        alert('Tanda tangan belum diupload. Silakan upload di halaman Profil.');
        return;
      }
      injectSignatureIntoPaper(paperRef.current, sigBase64);
      setHasSignature(true);
    }
  };

  const company  = aiData?.company   || 'PT PERUSAHAAN';
  const position = aiData?.position  || 'Posisi';
  const location = aiData?.location  || '-';
  const experience = aiData?.experience || '-';
  const type     = aiData?.type      || '-';

  // template list untuk preview
  const templateList = buildTemplates(company, position, userProfile, attachments);

  return (
    <div className="step3-container">
      {/* ── Template Modal with Preview ── */}
      {showTemplateModal && (
        <div className="template-modal-overlay" onClick={() => setShowTemplateModal(false)}>
          <div className="template-modal template-modal-wide" onClick={e => e.stopPropagation()}>
            <div className="template-modal-header">
              <h3><Layers size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Pilih Template Surat</h3>
              <button onClick={() => setShowTemplateModal(false)} className="template-modal-close"><X size={18} /></button>
            </div>
            <div className="template-modal-body">
              {/* Tab list */}
              <div className="template-tab-list">
                {templateList.map((t, idx) => (
                  <button
                    key={t.id}
                    className={`template-tab-btn ${previewTemplateIdx === idx ? 'active' : ''}`}
                    onClick={() => setPreviewTemplateIdx(idx)}
                  >
                    <span className="tcb-label">{t.label}</span>
                    <span className="tcb-desc">{t.desc}</span>
                  </button>
                ))}
              </div>
              {/* Preview pane */}
              <div className="template-preview-pane">
                <div className="template-preview-header">
                  <Eye size={14} />
                  <span>Preview: {templateList[previewTemplateIdx]?.label}</span>
                </div>
                <div
                  className="template-preview-content"
                  dangerouslySetInnerHTML={{ __html: templateList[previewTemplateIdx]?.html || '' }}
                />
                <button
                  className="template-apply-btn"
                  onClick={() => applyTemplate(previewTemplateIdx)}
                >
                  Terapkan Template Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gmail Modal ── */}
      <GmailModal
        isOpen={showGmailModal}
        onClose={() => setShowGmailModal(false)}
        aiData={aiData}
        userProfile={userProfile}
      />

      <div className="step3-layout">
        {/* ─── Middle Panel ─── */}
        <div className="step3-middle-panel">
          <div className="s3-editor-header">
            <div className="s3-editor-title">
              <div className="s3-title-icon"><FileText size={18} color="var(--primary)" /></div>
              <div>
                <h2>3. Surat Lamaran</h2>
                <p>Buat dan sesuaikan surat lamaran Anda sebelum melanjutkan.</p>
              </div>
            </div>
            <div className="s3-header-actions">
              <button className="s3-btn-template" onClick={() => setShowTemplateModal(true)}>
                <Layers size={14} /> Pilih Template
              </button>
            </div>
          </div>

          <div className="s3-editor-box">
            {/* Toolbar */}
            <div className="s3-toolbar">
              <button className="s3-tool" title="Undo" onClick={() => document.execCommand('undo')}><Undo size={15} /></button>
              <button className="s3-tool" title="Redo" onClick={() => document.execCommand('redo')}><Redo size={15} /></button>
              <div className="s3-divider" />
              <select className="s3-select" style={{ width: 56 }} onChange={e => document.execCommand('fontSize', false, e.target.value)}>
                <option value="2">100%</option>
              </select>
              <select className="s3-select" style={{ width: 136 }} onChange={e => document.execCommand('fontName', false, e.target.value)}>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
              </select>
              <div className="s3-divider" />
              <button className="s3-tool" onClick={() => document.execCommand('bold')}><Bold size={15} /></button>
              <button className="s3-tool" onClick={() => document.execCommand('italic')}><Italic size={15} /></button>
              <button className="s3-tool" onClick={() => document.execCommand('underline')}><Underline size={15} /></button>
              <div className="s3-divider" />
              <button className="s3-tool" onClick={() => document.execCommand('justifyLeft')}><AlignLeft size={15} /></button>
              <button className="s3-tool" onClick={() => document.execCommand('justifyCenter')}><AlignCenter size={15} /></button>
              <button className="s3-tool" onClick={() => document.execCommand('justifyRight')}><AlignRight size={15} /></button>
            </div>

            {/* Paper */}
            <div className="s3-paper-wrapper" ref={wrapperRef}>
              <div
                ref={paperRef}
                id="letter-print-area"
                className="s3-paper"
                contentEditable
                suppressContentEditableWarning
                onKeyDown={e => {
                  if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
                }}
              />
            </div>

            <div className="s3-editor-footer"><span>A4 (210 × 297 mm)</span></div>
          </div>

          {/* Actions below editor */}
          <div className="s3-bottom-actions">
            <button className="s3-btn-outline" onClick={handlePrint}><Download size={14} /> Unduh PDF</button>
            <button
              className={`s3-btn-outline ${hasSignature ? 'active-signature' : ''}`}
              onClick={handleToggleSignature}
              style={{ borderColor: hasSignature ? 'var(--primary)' : undefined, color: hasSignature ? 'var(--primary)' : undefined, backgroundColor: hasSignature ? '#f5f3ff' : undefined }}
            >
              <PenTool size={14} /> {hasSignature ? 'Hapus Tanda Tangan' : 'Pasang Tanda Tangan'}
            </button>
            <button className={`s3-btn-outline ${savedIndicator ? 'saved-indicator' : ''}`} onClick={handleSaveEdits}>
              {savedIndicator ? <><CheckSquare size={14} /> Tersimpan!</> : <><Save size={14} /> Simpan Editan</>}
            </button>
            <button className="s3-btn-outline" onClick={handleResetLetter} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* ─── Right Panel ─── */}
        <div className="step3-right-panel">
          <div className="s3-info-card" style={{ marginBottom: '24px' }}>
            <p className="s3-info-title">Informasi Lamaran</p>
            {[
              { icon: Building, label: 'Perusahaan', val: company },
              { icon: Briefcase, label: 'Posisi', val: position },
              { icon: MapPin, label: 'Lokasi', val: location },
              { icon: User, label: 'Pengalaman', val: experience },
              { icon: Clock, label: 'Jenis Pekerjaan', val: type },
              { icon: AlignLeft, label: 'Dokumen & Tujuan Kirim', val: aiData?.description || '-' },
            ].map(({ icon: Icon, label, val }) => (
              <div key={label} className="s3-info-item">
                <div className="s3-info-icon"><Icon size={16} /></div>
                <div>
                  <span className="s3-info-label">{label}</span>
                  <span className="s3-info-value">{val}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="s3-info-title">Daftar Lampiran yang Akan Disertakan</p>
          <p className="s3-attach-sub">Gunakan panah untuk mengatur urutan atau hapus file.</p>

          <div className="s3-attach-list">
            {loadingDocs ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <Loader2 size={20} className="spin" /> Memuat dokumen...
              </div>
            ) : attachments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                Belum ada dokumen. Upload dulu di menu "Dokumen Saya".
              </div>
            ) : (
              attachments.map((item, index) => (
                <div key={item.id} className="s3-attach-item" style={{ gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      disabled={index === 0}
                      onClick={() => {
                        const arr = [...attachments];
                        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
                        setAttachments(arr);
                      }}
                      style={{ background: 'none', border: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1, padding: 0 }}
                    ><ChevronUp size={14} color="var(--text-main)" /></button>
                    <button
                      disabled={index === attachments.length - 1}
                      onClick={() => {
                        const arr = [...attachments];
                        [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
                        setAttachments(arr);
                      }}
                      style={{ background: 'none', border: 'none', cursor: index === attachments.length - 1 ? 'default' : 'pointer', opacity: index === attachments.length - 1 ? 0.3 : 1, padding: 0 }}
                    ><ChevronDown size={14} color="var(--text-main)" /></button>
                  </div>
                  <span className="s3-attach-name" style={{ flex: 1 }}>{cleanFileName(item.name)}</span>
                  <button className="s3-btn-del" onClick={() => setAttachments(prev => prev.filter(a => a.id !== item.id))}>
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
        <button
          className="s3-nav-next"
          style={{ background: '#ea4335' }}
          onClick={() => setShowGmailModal(true)}
          disabled={isMerging}
        >
          <Mail size={16} /> Kirim via Gmail
        </button>
        <button className="s3-nav-next" onClick={handleMergeAndSave} disabled={isMerging}>
          {isMerging
            ? <><Loader2 size={16} className="spin" /> Memproses...</>
            : <><Download size={16} /> Selesai &amp; Unduh PDF</>
          }
        </button>
      </div>
      {mergeError && <div style={{ color: 'red', textAlign: 'center', marginTop: '10px', fontSize: '13px' }}>{mergeError}</div>}
    </div>
  );
};

export default Step3Letter;

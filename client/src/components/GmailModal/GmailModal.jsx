import React, { useState, useEffect } from 'react';
import { X, Mail, ChevronRight, Send, Edit3, Check } from 'lucide-react';
import './GmailModal.css';

const GmailModal = ({ isOpen, onClose, aiData, userProfile }) => {
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [step, setStep] = useState('select'); // 'select' | 'preview'

  const to   = aiData?.email && aiData.email !== 'Tidak disebutkan' ? aiData.email : '';
  const pos  = aiData?.position || 'Pekerjaan';
  const comp = aiData?.company  || 'Perusahaan';
  const name = userProfile?.full_name || 'Pelamar';
  const edu  = userProfile?.education || 'S1';
  const major= userProfile?.major || '';

  const templates = [
    {
      id: 0,
      label: '📋 Formal & Profesional',
      desc: 'Template standar, bahasa baku dan formal',
      subject: `Lamaran Pekerjaan – ${pos} – ${name}`,
      body: `Yth. Tim Rekrutmen ${comp}

Dengan hormat,

Sehubungan dengan informasi lowongan pekerjaan yang dibuka oleh ${comp} untuk posisi ${pos}, melalui email ini saya bermaksud untuk mengajukan diri guna mengisi posisi tersebut.

Sebagai bahan pertimbangan Bapak/Ibu, bersama email ini saya lampirkan berkas dokumen lamaran kerja lengkap (Curriculum Vitae, Surat Lamaran, dan lampiran pendukung) dalam format PDF.

Besar harapan saya untuk diberikan kesempatan mengikuti tahapan seleksi selanjutnya agar dapat mendiskusikan bagaimana kualifikasi saya dapat berkontribusi positif bagi ${comp}.

Terima kasih atas waktu, perhatian, dan kesempatan yang Bapak/Ibu berikan.

Hormat saya,

${name}`
    },
    {
      id: 1,
      label: '✨ Singkat & Padat',
      desc: 'Template ringkas, langsung ke poin',
      subject: `${pos} – ${name}`,
      body: `Yth. HRD ${comp},

Perkenalkan, saya ${name}${major ? `, lulusan ${edu} ${major}` : ''}. Saya tertarik melamar posisi ${pos} di ${comp}.

Bersama email ini saya lampirkan dokumen lamaran lengkap dalam format PDF untuk Bapak/Ibu pertimbangkan.

Terima kasih atas perhatian Bapak/Ibu. Saya siap dihubungi kapan saja untuk proses selanjutnya.

Salam,
${name}`
    },
    {
      id: 2,
      label: '💫 Personal & Hangat',
      desc: 'Template antusias, cocok untuk startup',
      subject: `Hi! Lamaran ${pos} dari ${name}`,
      body: `Halo Tim ${comp},

Nama saya ${name}${major ? `, seorang lulusan ${edu} ${major}` : ''}. Saya sangat antusias melihat lowongan posisi ${pos} di ${comp} dan yakin bahwa saya adalah kandidat yang tepat!

Dengan semangat belajar yang tinggi dan dedikasi dalam setiap pekerjaan, saya percaya dapat memberikan kontribusi nyata bagi tim ${comp}. Saya telah menyertakan CV dan Surat Lamaran lengkap dalam file PDF terlampir.

Saya berharap dapat berdiskusi lebih lanjut tentang bagaimana saya bisa berkontribusi. Terima kasih banyak sudah meluangkan waktu!

Salam hangat,
${name}`
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedTemplate(0);
    }
  }, [isOpen]);

  const handleSelectTemplate = (idx) => {
    setSelectedTemplate(idx);
    setEditedSubject(templates[idx].subject);
    setEditedBody(templates[idx].body);
    setStep('preview');
  };

  const handleOpenGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(editedSubject)}&body=${encodeURIComponent(editedBody)}`;
    window.open(gmailUrl, '_blank');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="gmail-modal-overlay" onClick={onClose}>
      <div className="gmail-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gmail-modal-header">
          <div className="gmail-modal-title">
            <div className="gmail-icon"><Mail size={18} color="white" /></div>
            <div>
              <h2>Kirim via Gmail</h2>
              <p>{to ? `Kepada: ${to}` : 'Email tujuan tidak tersedia di lowongan'}</p>
            </div>
          </div>
          <button className="gmail-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {step === 'select' ? (
          <>
            <p className="gmail-step-label">Pilih template body email:</p>
            <div className="gmail-templates">
              {templates.map((t, idx) => (
                <button
                  key={t.id}
                  className={`gmail-template-card ${selectedTemplate === idx ? 'selected' : ''}`}
                  onClick={() => handleSelectTemplate(idx)}
                >
                  <div className="gmail-template-info">
                    <span className="gmail-template-name">{t.label}</span>
                    <span className="gmail-template-desc">{t.desc}</span>
                  </div>
                  <ChevronRight size={18} className="gmail-template-arrow" />
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <button className="gmail-back-btn" onClick={() => setStep('select')}>
              ← Ganti Template
            </button>
            <div className="gmail-preview-section">
              <label className="gmail-field-label">Subject Email</label>
              <input
                className="gmail-field-input"
                value={editedSubject}
                onChange={e => setEditedSubject(e.target.value)}
              />
            </div>
            <div className="gmail-preview-section">
              <label className="gmail-field-label">
                <Edit3 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Body Email (bisa diedit)
              </label>
              <textarea
                className="gmail-field-textarea"
                value={editedBody}
                onChange={e => setEditedBody(e.target.value)}
                rows={12}
              />
            </div>
            <div className="gmail-modal-footer">
              <button className="gmail-cancel-btn" onClick={() => setStep('select')}>Pilih Template Lain</button>
              <button className="gmail-send-btn" onClick={handleOpenGmail}>
                <Send size={15} /> Buka Gmail
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailModal;

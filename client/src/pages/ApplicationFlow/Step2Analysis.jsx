import React, { useState } from 'react';
import { 
  Building, User, MapPin, Briefcase, Mail, GraduationCap, 
  AlignLeft, Edit3, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Maximize, X
} from 'lucide-react';
import './Step2Analysis.css';

const Step2Analysis = ({ jobImage, aiData, onNext, onBack }) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleResetZoom = () => setZoom(100);

  return (
    <div className="step2-container">
      <div className="step2-header">
        <div className="step2-title">
          <h2>2. Analisis Lowongan oleh AI</h2>
          <p>AI telah membaca gambar lowongan kerja dan mengekstrak informasi berikut. Silakan periksa kembali dan edit jika ada yang kurang tepat.</p>
        </div>
        <button className="btn-outline-primary">
          <Edit3 size={16} /> Edit Semua Informasi
        </button>
      </div>

      <div className="step2-layout">
        {/* Left Column - Image */}
        <div className="preview-panel">
          <h3>Preview Gambar Lowongan</h3>
          <div className="image-viewer" style={{ overflow: 'auto', position: 'relative' }}>
            <img 
              src={jobImage} 
              alt="Job Vacancy" 
              style={{ 
                transform: `scale(${zoom / 100})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
            />
          </div>
          <div className="viewer-controls">
            <button className="ctrl-btn" onClick={handleZoomOut} title="Zoom Out"><ZoomOut size={18} /></button>
            <div className="divider"></div>
            <span className="zoom-text" onClick={handleResetZoom} style={{ cursor: 'pointer' }} title="Reset 100%">{zoom}%</span>
            <div className="divider"></div>
            <button className="ctrl-btn" onClick={handleZoomIn} title="Zoom In"><ZoomIn size={18} /></button>
            <button className="ctrl-btn max-btn" onClick={() => setIsFullscreen(true)} title="Fullscreen"><Maximize size={18} /></button>
          </div>
        </div>

        {/* Fullscreen Overlay */}
        {isFullscreen && (
          <div 
            style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setIsFullscreen(false)}
          >
            <button 
              onClick={() => setIsFullscreen(false)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'white', border: 'none', borderRadius: '50%',
                width: 40, height: 40, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
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
            <div className="info-item">
              <div className="info-icon"><Building size={20} /></div>
              <div className="info-text">
                <span className="info-label">Perusahaan</span>
                <span className="info-value">{aiData?.company}</span>
              </div>
            </div>
            
            <div className="info-item">
              <div className="info-icon"><User size={20} /></div>
              <div className="info-text">
                <span className="info-label">Pengalaman</span>
                <span className="info-value">{aiData?.experience}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Briefcase size={20} /></div>
              <div className="info-text">
                <span className="info-label">Posisi</span>
                <span className="info-value">{aiData?.position}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Briefcase size={20} /></div> {/* Time icon */}
              <div className="info-text">
                <span className="info-label">Jenis Pekerjaan</span>
                <span className="info-value">{aiData?.type}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><MapPin size={20} /></div>
              <div className="info-text">
                <span className="info-label">Lokasi</span>
                <span className="info-value">{aiData?.location}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><Mail size={20} /></div>
              <div className="info-text">
                <span className="info-label">Email Perusahaan</span>
                <span className="info-value">{aiData?.email}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><GraduationCap size={20} /></div>
              <div className="info-text">
                <span className="info-label">Pendidikan</span>
                <span className="info-value">{aiData?.education}</span>
              </div>
            </div>

            <div className="info-item">
              <div className="info-icon"><AlignLeft size={20} /></div>
              <div className="info-text">
                <span className="info-label">Dokumen & Tujuan Kirim</span>
                <span className="info-value">{aiData?.description}</span>
              </div>
            </div>
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
    </div>
  );
};

export default Step2Analysis;

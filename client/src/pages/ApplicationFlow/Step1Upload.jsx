import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react';
import './Step1Upload.css';

const Step1Upload = ({ onNext }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
              setPreview(reader.result);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch('https://web-loker-5vpr.vercel.app/api/analyze-job', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error dari server (${response.status})`);
      }
      
      const aiData = await response.json();
      
      // Lanjut ke step berikutnya dengan membawa data gambar dan hasil AI
      onNext(preview, aiData); 
    } catch (error) {
      console.error(error);
      alert(`Gagal menganalisis: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="step1-container">
      <div className="step1-content">
        <h2>Upload / Paste Gambar Lowongan</h2>
        <p>Silakan upload screenshot, paste (Ctrl+V) langsung dari clipboard, atau pilih poster lowongan pekerjaan yang ingin Anda lamar. AI kami akan membaca informasi di dalamnya secara otomatis.</p>
        
        <div 
          className="main-upload-area" 
          onClick={() => !preview && !loading && fileInputRef.current?.click()}
          style={{ cursor: preview || loading ? 'default' : 'pointer' }}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/png, image/jpeg, image/jpg"
            disabled={loading}
            hidden 
          />
          
          {preview ? (
            <div className="preview-container">
              <img src={preview} alt="Lowongan" className="image-preview" style={{ opacity: loading ? 0.5 : 1 }} />
              {!loading && (
                <button 
                  className="btn-change-image"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setPreview(null);
                  }}
                >
                  Ganti Gambar
                </button>
              )}
            </div>
          ) : (
            <div className="upload-placeholder">
              <div className="icon-circle">
                <ImageIcon size={32} color="var(--primary)" />
              </div>
              <h3>Klik atau Paste (Ctrl+V) gambar lowongan di sini</h3>
              <p>Mendukung JPG, PNG, atau Salin-Tempel dari Clipboard (Max 5MB)</p>
            </div>
          )}
        </div>

        <div className="step1-actions">
          <button 
            className={`btn-primary ${(!preview || loading) ? 'disabled' : ''}`}
            disabled={!preview || loading}
            onClick={handleAnalyze}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={16} className="spinning" /> Menganalisis...
              </span>
            ) : (
              'Analisis dengan AI'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Step1Upload;

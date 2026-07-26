# 💼 Web Loker - AI Job Application Assistant & PDF Merger

Aplikasi web modern berbasis AI yang dirancang untuk mempermudah pencari kerja dalam menganalisis poster lowongan pekerjaan, membuat surat lamaran kerja formal secara otomatis, dan menggabungkan surat lamaran beserta dokumen pendukung (CV, Ijazah, Transkrip, Sertifikat) menjadi satu file PDF utuh yang rapi.

---

## 🌟 Fitur Utama

- 🔍 **AI Poster Lowongan Analyzer**: Ekstraksi data otomatis dari gambar/poster lowongan kerja (Nama Perusahaan, Posisi, Kualifikasi, Email HRD, Persyaratan Dokumen) menggunakan model AI Vision Qwen 3.7.
- ✍️ **AI Cover Letter Generator**: Pembuatan Surat Lamaran Kerja otomatis dalam bahasa Indonesia yang baku, profesional, dan dapat disesuaikan dengan profil pengguna.
- 📑 **PDF Document Merger**: Menggabungkan Surat Lamaran (dirender presisi ke PDF ukuran A4 via Puppeteer) dengan file PDF pendukung lainnya (CV, Ijazah, Sertifikat) menjadi 1 file `Lamaran.pdf`.
- 👤 **Manajemen Profil & Dokumen**: Simpan data diri, riwayat pendidikan, IPK, serta manajemen berkas digital terintegrasi dengan Supabase.
- 📊 **Dashboard & Riwayat**: Memantau status dan riwayat lamaran kerja yang sudah diajukan.

---

## 🏗️ Struktur Proyek

```text
web-loker/
├── client/                   # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── components/       # Komponen UI reusable (Navbar, Sidebar, Modal, dll.)
│   │   ├── contexts/         # Context Provider (AuthContext)
│   │   ├── lib/              # Client utilities (Supabase Client Setup)
│   │   └── pages/            # Halaman Aplikasi
│   │       ├── ApplicationFlow/  # Step 1: Upload, Step 2: Analisis, Step 3: Surat, Step 4: Merge
│   │       ├── Dashboard/        # Dashboard Utama
│   │       ├── History/          # Riwayat Lamaran
│   │       ├── Login/            # Login & Register
│   │       ├── MyDocuments/      # Manajemen Dokumen User
│   │       └── Profile/          # Pengaturan Profil User
│   ├── .env                  # Environment Variables Frontend
│   ├── package.json
│   └── vite.config.js
│
└── server/                   # Backend Application (Express.js + AI & PDF Engine)
    ├── index.js              # Entrypoint server & endpoint API
    ├── .env                  # Environment Variables Backend
    └── package.json
```

---

## 💻 Teknologi yang Digunakan

### Frontend
- **Framework & Build Tool**: React 19, Vite
- **Routing**: React Router v7
- **Iconography**: Lucide React
- **BaaS / Database & Auth**: Supabase (`@supabase/supabase-js`)

### Backend
- **Runtime & Framework**: Node.js, Express.js
- **AI Integration**: OpenAI Node SDK (Integrasi ke DashScope / Qwen API `qwen3.7-flash`)
- **PDF Processing**: `pdf-lib` & `puppeteer-core` (Headless Browser rendering HTML to PDF)
- **File Upload Handler**: Multer (Memory Storage)

---

## 🚀 Panduan Instalasi & Penggunaan

### Prasyarat System
- **Node.js**: versi 18.x atau lebih baru
- **Google Chrome / Microsoft Edge**: Terinstall di komputer lokal (digunakan Puppeteer untuk cetak PDF)

### 1. Clone Repository
```bash
git clone https://github.com/yusrilfahmi/web-loker.git
cd web-loker
```

### 2. Konfigurasi Backend (`server`)

1. Masuk ke direktori server dan install dependencies:
   ```bash
   cd server
   npm install
   ```
2. Buat file `.env` di dalam folder `server`:
   ```env
   PORT=5000
   QWEN_API_KEY=your_qwen_dashscope_api_key_here
   ```
3. Jalankan server backend:
   ```bash
   npm run dev
   ```
   *Server akan berjalan di `http://localhost:5000`*

### 3. Konfigurasi Frontend (`client`)

1. Buka terminal baru, masuk ke direktori client dan install dependencies:
   ```bash
   cd client
   npm install
   ```
2. Buat file `.env` di dalam folder `client`:
   ```env
   VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
3. Jalankan frontend client:
   ```bash
   npm run dev
   ```
   *Aplikasi akan berjalan di `http://localhost:5173`*

---

## 📡 Dokumentasi API (Backend Services)

Base URL: `http://localhost:5000` (atau port yang diset di `.env`)

### 1. Health Check
Memeriksa apakah server backend berjalan dengan baik.

- **URL**: `/api/health`
- **Method**: `GET`
- **Response**: `200 OK`
```json
{
  "status": "ok",
  "message": "Backend is running!"
}
```

---

### 2. Analisis Poster Lowongan Kerja (`/api/analyze-job`)
Menerima file gambar poster lowongan kerja, me-ekstrak detail informasi lowongan menggunakan AI Vision, dan mengembalikan data berformat JSON.

- **URL**: `/api/analyze-job`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `image` *(File, Required)*: File gambar poster lowongan (`.png`, `.jpg`, `.jpeg`, `.webp`).

- **Response Success**: `200 OK`
```json
{
  "company": "PT Contoh Indonesia",
  "position": "Software Engineer",
  "location": "Jakarta Selatan",
  "education": "S1 Teknik Informatika / Sistem Informasi",
  "experience": "Minimal 1 tahun",
  "type": "Full Time",
  "email": "hrd@contoh.co.id",
  "description": "Kirim CV & Surat Lamaran ke hrd@contoh.co.id",
  "skills": ["JavaScript", "React", "Node.js", "SQL"]
}
```

- **Response Error**: `400 Bad Request` / `500 Internal Server Error`
```json
{
  "error": "No image uploaded"
}
```

---

### 3. Generate Surat Lamaran Kerja (`/api/generate-letter`)
Membuat draft surat lamaran kerja dalam format HTML yang baku dan terstruktur berdasarkan data lowongan dan profil pengguna.

- **URL**: `/api/generate-letter`
- **Method**: `POST`
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "jobData": {
    "company": "PT Contoh Indonesia",
    "position": "Software Engineer",
    "location": "Jakarta Selatan",
    "skills": ["JavaScript", "React", "Node.js"]
  },
  "userProfile": {
    "full_name": "Yusril Fahmi",
    "birthdate": "Gresik, 23 November 2001",
    "education": "Strata 1",
    "major": "Teknik Informatika",
    "gpa": "3.82",
    "marital_status": "Belum menikah",
    "address": "Gresik, Jawa Timur",
    "phone": "081234567890"
  }
}
```

- **Response Success**: `200 OK`
```json
{
  "letter": "<p class=\"ltr-date\">Gresik, 26 Juli 2026</p><p class=\"ltr-line\"><strong>Kepada Yth.</strong></p>..."
}
```

---

### 4. Merge PDF (`/api/merge-pdf`)
Menerima HTML surat lamaran dan sekumpulan file PDF pendukung (CV, Ijazah, Sertifikat), merender surat lamaran ke PDF A4 via Puppeteer, dan menggabungkan semuanya menjadi 1 berkas PDF utuh.

- **URL**: `/api/merge-pdf`
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Request Body**:
  - `letterHtml` *(Text, Optional)*: Kode HTML Surat Lamaran Kerja yang akan dirender.
  - `selectedDocs` *(JSON Stringified Array, Required)*: Daftar identifier dokumen yang dipilih, contoh `["letter", "cv", "ijazah"]`.
  - `pdfs` *(File Array, Optional)*: File-file PDF tambahan yang akan digabungkan.

- **Response Success**: `200 OK`
  - **Content-Type**: `application/pdf`
  - **Content-Disposition**: `attachment; filename="Lamaran.pdf"`
  - **Body**: Binary Stream PDF Buffer (`Lamaran.pdf`).

---

## 📝 Alur Kerja Aplikasi (Application Flow)

1. **Step 1 - Upload Poster**: Pengguna mengunggah gambar/poster lowongan pekerjaan.
2. **Step 2 - Analisis AI**: Sistem secara otomatis membaca poster lowongan dan mengekstrak info detail lowongan.
3. **Step 3 - Surat Lamaran**: AI menyusun Surat Lamaran Kerja. Pengguna dapat mengedit teks surat dan menambahkan tanda tangan digital.
4. **Step 4 - Merge & Download PDF**: Pengguna memilih dokumen pendukung (CV, Ijazah, Transkrip) dari penyimpanan akun dan mengunduh berkas PDF gabungan `Lamaran.pdf`.

---

## 📄 Lisensi

Proyek ini dibuat untuk keperluan pengembangan & penggunaan pribadi / profesional.

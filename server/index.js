require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { OpenAI } = require('openai');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

function getBrowserPath() {
  const paths = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const app = express();
const port = process.env.PORT || 5000;

const upload = multer({ storage: multer.memoryStorage() });

const openai = new OpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── 0. ROOT ROUTE ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('JobApply AI Backend is running on Vercel!');
});

// ── HELPER: parse JSON dari respon AI ──────────────────────────────────────
function parseAIJson(text) {
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Kadang Qwen menambahkan <think>...</think> di awal
  const jsonStart = clean.indexOf('{');
  const jsonEnd   = clean.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('Tidak ada JSON ditemukan');
  return JSON.parse(clean.substring(jsonStart, jsonEnd + 1));
}

// ── 1. ANALISIS GAMBAR LOWONGAN ────────────────────────────────────────────
app.post('/api/analyze-job', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const base64Image = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const promptText = `
      Anda adalah AI asisten untuk membaca poster/gambar lowongan pekerjaan.
      Tugas Anda adalah mengekstrak informasi dari gambar yang diberikan dan mengembalikannya HANYA dalam format JSON yang valid, tanpa tambahan teks apapun.
      
      Struktur JSON yang diharapkan:
      {
        "company": "Nama perusahaan (atau 'Tidak disebutkan')",
        "position": "Posisi pekerjaan (atau 'Tidak disebutkan')",
        "location": "Lokasi pekerjaan (atau 'Tidak disebutkan')",
        "education": "Syarat pendidikan terakhir (atau 'Tidak disebutkan')",
        "experience": "Syarat pengalaman kerja (atau 'Tidak disebutkan')",
        "type": "Jenis pekerjaan misal Full Time, Part Time, Magang (atau 'Tidak disebutkan')",
        "email": "Email perusahaan untuk melamar (atau 'Tidak disebutkan')",
        "description": "Sebutkan dokumen apa saja yang diminta untuk dikirim dan dikirim ke mana (contoh: 'Kirim CV & Surat Lamaran ke emmt.indonesia@gmail.com')",
        "skills": ["Skill 1", "Skill 2", "Skill 3"]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "qwen3.7-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUrl } }
        ],
      }],
    });

    const textResult = response.choices[0].message.content;
    console.log("=== ANALYZE RAW ===\n", textResult);
    const parsedData = parseAIJson(textResult);
    res.json(parsedData);

  } catch (error) {
    console.error('Analyze Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menganalisis gambar' });
  }
});

// ── 2. GENERATE SURAT LAMARAN ──────────────────────────────────────────────
app.post('/api/generate-letter', async (req, res) => {
  try {
    const { jobData, userProfile } = req.body;
    if (!jobData) return res.status(400).json({ error: 'Data lowongan diperlukan' });

    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    const prompt = `
      Anda adalah asisten profesional yang ahli menulis surat lamaran kerja dalam Bahasa Indonesia yang baku dan formal.
      
      Tugas: Tulis surat lamaran kerja yang profesional, personal, dan meyakinkan berdasarkan data berikut.
      
      DATA LOWONGAN:
      - Perusahaan: ${jobData.company || 'Tidak disebutkan'}
      - Posisi: ${jobData.position || 'Tidak disebutkan'}
      - Lokasi: ${jobData.location || 'Tidak disebutkan'}
      - Kualifikasi: ${jobData.skills?.join(', ') || 'Tidak disebutkan'}
      
      DATA PELAMAR:
      - Nama: ${userProfile?.full_name || 'Yusril Fahmi'}
      - Tanggal Lahir: ${userProfile?.birthdate || 'Gresik, 23 November 2001'}
      - Pendidikan: ${userProfile?.education || 'Strata 1'} - ${userProfile?.major || 'Teknik Informatika'}
      - IPK: ${userProfile?.gpa || '3.82'}
      - Status Nikah: ${userProfile?.marital_status || 'Belum menikah'}
      - Alamat: ${userProfile?.address || 'Gresik, Jawa Timur'}
      - No. Telp: ${userProfile?.phone || '-'}
      
      FORMAT SURAT:
      Gunakan format surat lamaran Indonesia yang baku dengan mengikuti struktur HTML dan class berikut:
      1. Baris tanggal: <p class="ltr-date">Gresik, 17 Juli 2026</p>
      2. Kepada Yth: 
         <p class="ltr-line"><strong>Kepada Yth.</strong></p>
         <p class="ltr-line"><strong>Bapak/Ibu HRD</strong></p>
         <p class="ltr-line"><strong>Nama Perusahaan</strong></p><br/><br/>
      3. Salam pembuka: <p class="ltr-line"><strong>Dengan hormat,</strong></p>
      4. Paragraf pembuka: <p class="ltr-justify">Sesuai informasi...</p><br/>
      5. Tabel data diri: 
         <table class="ltr-table">
           <colgroup><col style="width:175px"/><col style="width:16px"/><col/></colgroup>
           <tbody>
             <tr><td>Nama</td><td>:</td><td>Nama Pelamar</td></tr>
             ...
           </tbody>
         </table><br/>
      6. Paragraf isi/penutup: <p class="ltr-justify">...</p><br/>
      7. Tanda tangan:
         <p class="ltr-signoff">Hormat Saya</p><br/><br/><br/><br/>
         <p class="ltr-signoff">Nama Pelamar</p>
      
      PENTING: 
      - Kembalikan HANYA kode HTML seperti format di atas.
      - Jangan tambahkan tag \`html\`, \`body\`, atau markdown blocks. Hanya isi suratnya saja.
      - Jangan tambahkan penjelasan atau komentar apapun.
    `;

    const response = await openai.chat.completions.create({
      model: "qwen3.7-flash",
      messages: [{ role: "user", content: prompt }],
    });

    const letterHtml = response.choices[0].message.content
      .replace(/```html/g, '').replace(/```/g, '').trim();

    console.log("=== LETTER GENERATED ===\n", letterHtml.substring(0, 200));
    res.json({ letter: letterHtml });

  } catch (error) {
    console.error('Generate Letter Error:', error);
    res.status(500).json({ error: error.message || 'Gagal membuat surat lamaran' });
  }
});

// ── 3. MERGE PDF ────────────────────────────────────────────────────────────
app.post('/api/merge-pdf', upload.any(), async (req, res) => {
  try {
    const { letterHtml, selectedDocs } = req.body;
    const selected = JSON.parse(selectedDocs || '[]');

    const mergedPdf = await PDFDocument.create();

    // ── Buat halaman surat lamaran dari HTML menggunakan Puppeteer ───────
    if (selected.includes('letter') && letterHtml) {
      try {
        let browser;
        
        if (process.env.VERCEL) {
          // Konfigurasi untuk Vercel Serverless Function
          browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
          });
        } else {
          // Konfigurasi untuk Local Windows
          const browserPath = getBrowserPath();
          if (browserPath) {
            browser = await puppeteer.launch({
              executablePath: browserPath,
              headless: true,
              args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
          }
        }

        if (browser) {
          const page = await browser.newPage();

          const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <style>
                @page { size: A4; margin: 18mm 25.4mm; }
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { 
                  font-family: 'Times New Roman', Times, serif; 
                  font-size: 11pt; 
                  line-height: 1.4; 
                  color: #000; 
                  position: relative;
                }
                .s3-paper {
                  position: relative;
                  width: 100%;
                  box-sizing: border-box;
                }
                .floating-signature-overlay {
                  position: absolute;
                  z-index: 100;
                }
                .floating-signature-overlay img {
                  height: 60px;
                  width: auto;
                  display: block;
                }
                .ltr-date { text-align: right; margin-bottom: 10pt; margin-top: 0; }
                .ltr-line { margin-bottom: 0; line-height: 1.4; margin-top: 0; }
                .ltr-justify { text-align: justify; margin-top: 6pt; margin-bottom: 0; text-justify: inter-word; line-height: 1.4; }
                .ltr-signoff { text-align: right; margin-top: 0; margin-bottom: 0; }
                .ltr-signoff-container { text-align: right; position: relative; margin-top: 14pt; page-break-inside: avoid; }
                .ltr-table { border-collapse: collapse; width: 100%; margin: 4pt 0; }
                .ltr-table td { padding: 1pt 0; vertical-align: top; font-size: 11pt; border: none; }
                .ltr-table col:nth-child(1) { width: 175px; }
                .ltr-table col:nth-child(2) { width: 16px; }
                .ltr-list { margin: 4pt 0 4pt 20px; }
                .ltr-list li { margin-bottom: 1pt; }
                p { margin: 0; }
                strong { font-weight: bold; }
              </style>
            </head>
            <body>
              <div className="s3-paper" style="position: relative;">
                ${letterHtml}
              </div>
            </body>
            </html>
          `;

          await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
          const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
          await browser.close();

          const letterPdf = await PDFDocument.load(pdfBuffer);
          const letterPages = await mergedPdf.copyPages(letterPdf, letterPdf.getPageIndices());
          letterPages.forEach(p => mergedPdf.addPage(p));
        }
      } catch (err) {
        console.error('Puppeteer rendering error:', err);
      }
    }

    // ── Gabungkan PDF yang dikirim frontend ───────────────────────────────
    const pdfFiles = (req.files || []).filter(f => f.fieldname === 'pdfs');
    console.log(`Menggabungkan ${pdfFiles.length} file PDF...`);

    for (const file of pdfFiles) {
      try {
        const donor = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(donor, donor.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
        console.log(`  ✓ ${file.originalname} (${donor.getPageCount()} halaman)`);
      } catch (e) {
        console.warn(`  ✗ Skip ${file.originalname}: ${e.message}`);
      }
    }

    const pdfBytes = await mergedPdf.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Lamaran.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Merge PDF Error:', error);
    res.status(500).json({ error: error.message || 'Gagal menggabungkan PDF' });
  }
});

// ── 4. HEALTH CHECK ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(port, () => {
    console.log(`Server berjalan di port: ${port}`);
  });
}

// Harus di-export agar Vercel bisa membacanya sebagai serverless function
module.exports = app;

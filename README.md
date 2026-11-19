# 🎬 OpenEdit - Web Video Editor

Aplikasi video editor berbasis web dengan antarmuka dan alur kerja terinspirasi dari **CapCut**, dibangun menggunakan **React 19**, **TypeScript**, **Vite**, dan **Tailwind CSS**.

Aplikasi ini berjalan 100% di sisi klien (in-browser) menggunakan **HTML5 Canvas**, **Web Audio API**, dan **MediaRecorder**, sehingga tidak memerlukan backend/server khusus untuk pemrosesan video.

---

## ✨ Fitur Utama

### 1. 📁 Ambil & Kelola Video (Import Media)
- Unggah file video Anda sendiri dari komputer (**MP4, WebM, MOV, dll.**) atau beberapa klip sekaligus.
- Ekstraksi otomatis durasi dan thumbnail per klip video.
- Fitur **"Muat Sampel Demo"**: Menghasilkan 2 klip video animasi berwarna secara instan dengan 1 klik untuk langsung menguji seluruh fitur aplikasi tanpa harus mencari file video terlebih dahulu.

### 2. ✂️ Potong & Sambung Video (Trim, Split & Sequence)
- **Potong / Gunting (Split)**: Belah video tepat pada posisi jarum *playhead* secara presisi menjadi dua klip terpisah.
- **Titik Potong (Trim Range)**: Geser titik *Trim In* (awal) dan *Trim Out* (akhir) untuk memangkas bagian video yang tidak diinginkan.
- **Sambung Video**: Klip-klip pada *timeline* otomatis tersambung secara mulus saat diputar. Anda dapat mengatur urutan sambungan (Geser Maju / Geser Mundur).
- **Duplikat & Hapus**: Tombol duplikat klip dan hapus klip terpilih.
- **Kontrol Volume**: Atur volume masing-masing klip video secara independen.

### 3. 💬 Subtitle & Teks
- Tambahkan teks takarir (*captions/subtitles*) pada linimasa video.
- Atur waktu mulai (*Start Time*) dan waktu selesai (*End Time*) dalam detik.
- Kustomisasi gaya teks:
  - Ukuran font (*Font size slider*).
  - Pilihan warna teks (*Color picker*).
  - Background teks transparan / semi-gelap.
  - Penyesuaian posisi vertikal (*Y-position percentage slider*).

### 4. 🏷️ Watermark Logo & Teks
- Aktifkan atau nonaktifkan watermark dengan saklar cepat.
- **2 Pilihan Mode**:
  - **Teks**: Masukkan teks watermark (misalnya: `@username` atau `@CapCutWeb`).
  - **Logo Gambar**: Unggah file PNG/JPG logo Anda sendiri.
- **5 Posisi Penempatan**: Kiri Atas, Kanan Atas, Kiri Bawah, Kanan Bawah, atau Tengah layar.
- **Slider Transparansi (Opacity)**: Atur kepekatan dari 10% hingga 100%.
- **Slider Skala Ukuran**: Perkecil atau perbesar ukuran watermark.

### 5. 🎙️ Tambah Narasi Suara (Voiceover)
- **Rekam Suara Langsung**: Rekam suara Anda melalui mikrofon secara langsung dengan indikator status perekaman dan penghitung durasi waktu.
- **Upload File Audio**: Impor rekaman atau musik latar belakang (**MP3 / WAV**).
- Penempatan audio pada detik tertentu di *timeline* agar tersinkronisasi tepat dengan momen video.
- Pengaturan volume audio narasi suara.

### 6. 🎛️ Player Interaktif & Multi-Track Timeline
- **Player Preview**: Pratinjau langsung dengan rasio aspek yang dapat dipilih:
  - `16:9` Landscape (YouTube, Desktop).
  - `9:16` Portrait (TikTok, Instagram Reels, YouTube Shorts).
  - `1:1` Square (Feed Instagram).
- **Kontrol Transport**: Play/Pause, Mundur 1 detik, Maju 1 detik, indikator *timecode*, slider volume master, dan mode *Fullscreen*.
- **Multi-Track Timeline**:
  - **Track 1 (Video)**: Menampilkan balok-balok klip video berurutan, thumbnail, dan durasi aktif.
  - **Track 2 (Subtitle)**: Menampilkan balok subtitle dan teksnya.
  - **Track 3 (Narasi)**: Menampilkan balok narasi audio.
  - **Jarum Playhead Merah**: Dapat diklik dan digeser (*scrubbing*) ke detik mana pun pada *timeline*.
  - **Slider Zoom**: Perbesar/perkecil skala tampilan linimasa.

### 7. 🚀 Ekspor Video
- Render seluruh hasil pengeditan (klip yang telah dipotong & disambung, narasi suara yang dipadukan, watermark yang disematkan, serta subtitle yang dirasterkan per frame).
- Dilengkapi dengan *Modal Progress Bar* yang menampilkan status persentase rendering secara *real-time*.
- Langsung unduh file hasil ekspor ke format video `.webm` kualitas tinggi.

### 8. ⌨️ Pintasan Keyboard (Shortcuts)
- **Spasi**: Putar / Jeda video (*Play/Pause*).
- **Panah Kiri (←)**: Mundur 1 detik.
- **Panah Kanan (→)**: Maju 1 detik.
- **Delete / Backspace**: Hapus klip video yang sedang dipilih.

---

## 🛠️ Menjalankan Proyek Secara Lokal

Pastikan Anda telah menginstal **Node.js** (v18+ disarankan).

1. **Jalankan development server**:
   ```bash
   npm run dev
   ```
2. Buka URL yang muncul di terminal (biasanya `http://localhost:5173`) di browser Anda (Google Chrome / Microsoft Edge disarankan untuk performa Canvas & Web Audio optimal).

3. **Build untuk produksi**:
   ```bash
   npm run build
   ```

---

## 📂 Struktur Direktori Proyek

```
d:\prog\new\
├── src/
│   ├── components/
│   │   ├── Navbar.tsx          # Bar atas (Logo, nama proyek, rasio aspek, tombol sampel & ekspor)
│   │   ├── Sidebar.tsx         # Panel samping (Media, Potong, Subtitle, Watermark, Narasi)
│   │   ├── PreviewPlayer.tsx   # Layar preview video, overlay watermark & subtitle, transport bar
│   │   ├── Timeline.tsx        # Multi-track timeline (Video, Subtitle, Audio) & playhead scrubber
│   │   └── ExportModal.tsx     # Dialog proses render & download video
│   ├── types/
│   │   └── editor.ts           # Definisi TypeScript untuk VideoClip, Subtitle, Watermark, Voiceover
│   ├── utils/
│   │   ├── time.ts             # Format waktu mm:ss / timecode
│   │   ├── media.ts            # Ekstraksi metadata, thumbnail, & generator demo klip
│   │   └── exportVideo.ts      # Engine render video berbasis Canvas + Web Audio + MediaRecorder
│   ├── App.tsx                 # Root component yang mengelola state editor
│   ├── main.tsx                # Entry point React
│   └── index.css               # Styling global Tailwind CSS & tema gelap
├── package.json
└── vite.config.ts
```

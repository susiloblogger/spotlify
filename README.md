# Spotlify 🎵

> **Realtime synced Spotify lyrics overlay with a customizable transparent gradient OSD for GNOME Shell.**

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-46%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050-blue?logo=gnome)](https://extensions.gnome.org)
[![Session](https://img.shields.io/badge/Session-Wayland%20Native%20%2F%20X11-purple)](https://wayland.freedesktop.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules%20(GJS)-yellow?logo=javascript)](https://gjs.guide)
[![License](https://img.shields.io/badge/License-GPL--2.0--or--later-green.svg)](LICENSE)
[![EGO Ready](https://img.shields.io/badge/EGO-Reviewed%20%26%20Compliant-brightgreen)](https://extensions.gnome.org)

**Spotlify** adalah ekstensi GNOME Shell modern, ringan, dan elegan yang mendeteksi lagu yang sedang diputar di Spotify Desktop secara realtime via D-Bus MPRIS, mengunduh lirik tersinkron (LRC) otomatis dari komunitas open-source, dan menampilkannya sebagai On-Screen Display (OSD) bergradasi transparan dengan tampilan album art langsung di desktop Linux Anda.

---

## 🎨 Pratinjau Desain OSD (*Dual-Pane Card*)

Spotlify mengusung desain *floating card* berestetika *glassmorphism* modern dengan pembagian dua panel:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐   NOW PLAYING • Bohemian Rhapsody — Queen                            │
│  │              │   Is this the real life? Is this just fantasy?                       │
│  │  [Cover Art  │ ▌ Caught in a landslide, no escape from reality                      │
│  │   Thumbnail] │   Open your eyes, look up to the skies and see                       │
│  └──────────────┘                                                                      │
└────────────────────────────────────────────────────────────────────────────────────────┘
     Left Pane:                             Right Pane:
  Album Cover Art              Track Header + Synced Lyrics (Active Accent Bar)
```

- **Panel Kiri**: Thumbnail sampul album (*Album Cover Art*) beresolusi tinggi dengan sistem unduhan *asynchronous* dan *cache* lokal otomatis.
- **Panel Kanan**: 
  - *Header Row*: Badge status `NOW PLAYING` yang rapi bersama judul lagu dan artis.
  - *Lyrics Container*: Tampilan baris lirik dinamis dengan aksen vertikal hijau khas Spotify (`▌`) pada baris lirik yang sedang aktif.

---

## ✨ Fitur Unggulan

### ⏱ 1. Sinkronisasi Presisi Tinggi & Ultra-Low CPU (< 1%)
- **Estimasi Monotonik Lokal**: Menghitung pergeseran waktu lagu secara lokal berbasis `GLib.get_monotonic_time()` untuk mencegah *lag* atau jeda sinkronisasi.
- **Event-Driven Scheduler**: Menggunakan `GLib.timeout_add` yang dijadwalkan tepat ke *timestamp* baris lirik berikutnya, bukan melalui teknik *polling* intensif setiap 100ms. Penggunaan CPU tetap berada di bawah 1%.
- **Auto Drift Resync**: Melakukan sinkronisasi ulang berkala via D-Bus MPRIS setiap ~2000ms dan mengoreksi waktu secara otomatis jika terjadi pergeseran (*drift*) > 500ms atau saat pengguna melakukan *seek*.

### 🪟 2. OSD Transparan Bergradasi & Click-Through
- **Modern Glassmorphism**: Latar belakang OSD mendukung gradasi dinamis St Clutter (**Horizontal**, **Vertical**, **Radial**, atau **Solid**) dengan warna awal (*start*) dan akhir (*end*) yang dapat disesuaikan.
- **Click-Through Non-Intrusive**: OSD melayang transparan di atas desktop tanpa mengganggu klik tetikus (*mouse*) atau interaksi aplikasi lain di bawahnya (`reactive: false`).
- **Opsi Always on Top**: OSD dapat diatur agar selalu berada di lapisan terdepan jendela aplikasi.
- **Pilihan 1, 2, atau 3 Baris**:
  - *Triple Mode (3 Baris)*: Baris sebelumnya (redup), baris aktif (terang + *accent bar*), dan baris berikutnya (redup).
  - *Double Mode (2 Baris)*: Baris aktif dan baris berikutnya.
  - *Single Mode (1 Baris)*: Hanya baris aktif.

### 🖼 3. Album Cover Art Loader & Caching Cerdas
- Mengunduh gambar sampul album langsung dari metadata Spotify via `Soup.Session` (Soup 3.0) secara *non-blocking*.
- Menyimpan *cache* gambar lokal di `~/.cache/spotlify/art/` dengan manajemen rotasi dan pembersihan berkala (*cache pruning*) saat sistem dalam kondisi *idle*.
- Menampilkan ikon *fallback* vinil/audio yang anggun apabila sampul album belum atau tidak tersedia.

### 🎯 4. Multi-Provider Lirik & Pencocokan Ketat
- **LRCLIB (Primer)**: Mengambil lirik tersinkronisasi dari basis data komunitas [LRCLIB](https://lrclib.net) secara cepat dan bebas pelacak.
- **NetEase Cloud Music (Cadangan)**: Opsi sumber cadangan otomatis apabila lirik tidak ditemukan pada penyedia utama.
- **Normalisasi Judul Lagu**: Algoritma pembersih judul yang cerdas (menghapus keterangan seperti `(Remastered ...)`, `(Live)`, `[feat. ...]`, `Deluxe Edition`, dll.).
- **Toleransi Durasi Ketat (±2 Detik)**: Memvalidasi durasi lagu dengan ketat agar lirik yang dimuat sesuai dengan rekaman lagu yang sedang diputar.
- **Two-Tier Cache**: Penyimpanan lirik ganda (*memory* + *disk* di `~/.cache/spotlify/`) disertai *negative cache* selama 24 jam untuk lagu tanpa lirik.
- **Dukungan Instrumental**: Deteksi jeda instrumen otomatis yang divisualisasikan dengan simbol musik `♪`.

### 🖥 5. Dukungan Multi-Monitor & 9 Titik Jangkar Layar
- Menyediakan 9 preset penempatan layar instan:
  - `Top-Left`, `Top-Center`, `Top-Right`
  - `Middle-Left`, `Center`, `Middle-Right`
  - `Bottom-Left`, `Bottom-Center` *(Default)*, `Bottom-Right`
- Penyesuaian presisi koordinat pixel horizontal (*Offset X*) dan vertikal (*Offset Y*).
- Dukungan pemilihan monitor target tertentu atau monitor utama (*Primary Monitor*).

### 🛡 6. Smart Auto-Hide
- Menyembunyikan OSD secara otomatis ketika:
  - Musik dijeda (*Paused*) atau dihentikan (*Stopped*).
  - Lagu yang diputar tidak memiliki lirik atau merupakan lagu instrumental.
  - Terdapat aplikasi yang sedang berjalan dalam mode layar penuh (*Fullscreen*).
  - Layar sistem terkunci (*Lock Screen*).

### 🔘 7. Menu Panel Atas (Top Bar Quick Controls)
- Ikon indikator status terintegrasi pada panel atas GNOME:
  - Sakelar cepat untuk menampilkan atau menyembunyikan OSD.
  - Sakelar cepat status **Always on Top**.
  - Submenu koreksi sinkronisasi instan: **Advance -250 ms**, **Delay +250 ms**, dan **Reset (0 ms)**.
  - Pintasan langsung membuka jendela pengaturan Spotlify.
  - Tombol **Exit** untuk keluar dan menonaktifkan ekstensi secara bersih dalam satu klik.

### ⌨️ 8. Pintasan Keyboard Global
- Bawaan: `<Super><Alt>l` untuk beralih (*toggle*) visibilitas OSD seketika dari mana saja. Kombinasi tombol dapat diubah melalui menu pengaturan GNOME.

### 🚀 9. Autostart on Login Terintegrasi
- Opsi untuk mengaktifkan Spotlify secara otomatis setiap kali Anda masuk (*login*) ke sesi desktop GNOME melalui berkas `.desktop` standar di `~/.config/autostart/spotlify.desktop`.

### 🧩 10. Standar Kepatuhan EGO Penuh (Extensions.gnome.org)
- Siklus hidup (*lifecycle*) bersih: seluruh sinyal GSettings, Clutter/St actor, koneksi D-Bus MPRIS, timer GLib, dan `Gio.Cancellable` dilepaskan tanpa sisa saat ekstensi dinonaktifkan (`disable()`), menjamin **nol kebocoran memori (zero memory leak)**.
- Seluruh modul ditulis menggunakan standar ECMAScript Modules (ESM) modern.

---

## 🚀 Kompatibilitas

| Komponen | Spesifikasi yang Didukung |
|---|---|
| **GNOME Shell** | `46`, `47`, `48`, `49`, `50` |
| **Sesi Display** | Wayland Native & X11 |
| **Aplikasi Spotify** | Spotify Desktop Native (`.deb`, `.rpm`), Flatpak (`com.spotify.Client`), dan Snap (`spotify`) |
| **Arsitektur Kode** | ES Modules (ESM) + GJS modern |
| **Pustaka Preferensi** | GTK4 + Libadwaita 1.5+ |

---

## ⚙️ Halaman Pengaturan (Preferences)

Jendela pengaturan dibangun menggunakan **Libadwaita** modern dengan kategori yang tertata rapi:

1. **Appearance (Tampilan)**:
   - Jumlah baris lirik (Single / Double / Triple).
   - Perataan teks lirik (Kiri, Tengah, Kanan).
   - Pemilihan keluarga font (*Font Family*), ukuran teks (*Font Size*), opsi teks tebal (*Bold*), dan bayangan teks (*Text Shadow*).
2. **Colors & Gradient (Warna & Gradasi)**:
   - Warna teks lirik aktif (*Active Color*) & tidak aktif (*Inactive Color*).
   - Arah gradasi latar belakang (None, Vertical, Horizontal, Radial).
   - Penentuan warna gradasi awal (*Start Color*) dan akhir (*End Color*).
   - Pengaturan *Border Radius* sudut melengkung dan *Padding* internal OSD.
3. **Position & Layout (Posisi & Tata Letak)**:
   - Pilihan 9 preset posisi jangkar layar atau posisi kustom.
   - Penyetelan pergeseran piksel sumbu X dan Y.
   - Pemilihan monitor target.
   - Batas lebar maksimal OSD (*Max Width*) dan sakelar *Always on Top*.
4. **Behavior & Synchronization (Perilaku & Sinkronisasi)**:
   - Pengaturan *Global Sync Offset* waktu lirik (milidetik).
   - Durasi animasi transisi baris lirik.
   - Sakelar penyedia cadangan NetEase Cloud Music.
   - Opsi menampilkan lirik polos (*Unsynchronized Lyrics*) jika lirik sinkron tidak ada.
   - Aturan penyembunyian otomatis (*Hide when Paused*, *Hide when No Lyrics*, *Hide in Fullscreen*).
   - Tampilkan/sembunyikan ikon indikator panel atas.
   - Sakelar **Autostart on Login**.
5. **Support & About (Dukungan & Informasi)**:
   - Tautan langsung donasi pengembang (Saweria, Trakteer, Ko-fi, GitHub Sponsors).
   - Informasi lisensi dan pelaporan *bug* / *issue* di GitHub.

---

## 📦 Pemasangan Manual

### 1. Kloning Repositori
```bash
git clone https://github.com/jenova/spotlify.git
cd spotlify
```

### 2. Pasang Symlink & Kompilasi Skema
```bash
make install
```
*Perintah di atas akan mengompilasi schema GSettings dan membuat symlink ke direktori ekstensi pengguna: `~/.local/share/gnome-shell/extensions/spotlify@jenova`.*

### 3. Muat Ulang GNOME Shell
- **Pada Sesi Wayland**: Logout kemudian Login kembali ke akun Anda.
- **Pada Sesi X11**: Tekan `Alt + F2`, ketik `r`, lalu tekan `Enter`.

### 4. Aktifkan Ekstensi
```bash
gnome-extensions enable spotlify@jenova
```
Buka jendela pengaturan ekstensi kapan saja dengan perintah:
```bash
gnome-extensions prefs spotlify@jenova
```

---

## 🛠 Perintah Pengembangan (Makefile)

Spotlify menyediakan alur kerja terstruktur untuk pengembangan dan pengujian otomatis:

```bash
# Mengompilasi GSettings schema XML
make schemas

# Memasang ekstensi ke sistem lokal (symlink mode)
make install

# Menjalankan seluruh rangkaian automated unit test
make test

# Membuat paket rilis zip terverifikasi untuk extensions.gnome.org (EGO)
make pack

# Menampilkan stream log runtime ekstensi secara realtime
make log

# Membersihkan file build dan paket zip rilis
make clean

# Menghapus instalasi ekstensi dari sistem lokal
make uninstall
```

### 🧪 Cakupan Pengujian Unit (*Unit Test Suite*)
Perintah `make test` menguji seluruh komponen inti logika secara otomatis menggunakan runtime `gjs`:
- `tests/lrcParser.test.js`: Validasi parsing format timestamp LRC, multi-tag per baris, dan penanganan jeda instrumental.
- `tests/trackMatcher.test.js`: Validasi normalisasi judul lagu dan pencocokan durasi toleransi ketat.
- `tests/syncEngine.test.js`: Validasi algoritma pencarian posisi baris (*binary search*) dan sinkronisasi baris aktif.
- `tests/coverArtLoader.test.js`: Validasi resolusi URI, hashing MD5, dan mekanisme penyimpanan *cache* sampul album.
- `tests/autostartManager.test.js`: Validasi pembuatan dan pembacaan entri desktop autostart di sesi GNOME.

---

## 💖 Dukungan & Donasi

Jika Spotlify bermanfaat dan mempercantik pengalaman mendengarkan musik di desktop GNOME Anda, pertimbangkan untuk mendukung kelanjutan proyek ini:

- 🇮🇩 **Saweria (QRIS / GoPay / OVO / DANA)**: [saweria.co/susiloblogger](https://saweria.co/susiloblogger)
- 🇮🇩 **Trakteer**: [trakteer.id/jenova](https://trakteer.id/susiloblogger)
- ☕ **Ko-fi**: [ko-fi.com/jenova](https://ko-fi.com/susiloblogger)
- 🐙 **GitHub Sponsors**: [github.com/sponsors/jenova](https://github.com/sponsors/susiloblogger)

---

## 📄 Lisensi

Proyek ini dirilis di bawah lisensi **GNU General Public License v2.0 or later (GPL-2.0-or-later)**. Lihat berkas [LICENSE](LICENSE) untuk informasi hak cipta dan ketentuan selengkapnya.

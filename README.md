# Spotlify 🎵

> **Realtime synced Spotify lyrics overlay with a customizable transparent gradient OSD for GNOME Shell.**

Spotlify adalah ekstensi GNOME Shell modern yang mendeteksi lagu yang sedang diputar di Spotify Desktop secara realtime via D-Bus MPRIS, mengunduh lirik tersinkron (LRC) otomatis dari komunitas open-source, dan menampilkannya sebagai On-Screen Display (OSD) bergradasi transparan di desktop Anda.

---

## ✨ Fitur Unggulan

- ⏱ **Sinkronisasi Presisi Tinggi**: Estimasi posisi berbasis *monotonic clock* lokal dengan koreksi berkala (< 500ms drift).
- 🪟 **OSD Transparan Bergradasi**: Desain *glassmorphism* modern dengan pilihan gradasi horizontal, vertikal, radial, atau solid.
- 📜 **Tampilan 3 Baris**: Baris sebelumnya (redup), baris aktif (terang & membesar), dan baris berikutnya (redup). Tersedia juga mode 1 dan 2 baris.
- 🎯 **Multi-Provider Lirik**: Mengambil lirik dari **LRCLIB** (primer) dan **NetEase Cloud Music** (cadangan) dengan algoritma normalisasi judul dan pencocokan durasi lagu ketat.
- 🖱 **Click-Through**: OSD melayang transparan tanpa mengganggu klik atau interaksi aplikasi lain di bawahnya.
- 🖥 **Dukungan Multi-Monitor & 9 Preset**: Pilihan 9 titik jangkar layar (Top, Middle, Bottom × Left, Center, Right) serta penyesuaian offset X/Y pixel.
- ⚡ **Hemat Daya & CPU**: Berbasis event-driven scheduler (`GLib.timeout_add` tepat ke timestamp lirik berikutnya), CPU usage < 1%.
- 🔘 **Top Bar Quick Controls**: Menu panel atas untuk toggle OSD dan koreksi sinkron cepat (±250ms).
- 🎨 **Kustomisasi Lengkap (Libadwaita)**: Pengaturan font, ukuran teks, warna aktif/inaktif, text shadow, border radius, padding, dan perilaku auto-hide saat pause atau fullscreen.
- 💖 **Halaman Dukungan & Donasi**: Terintegrasi langsung dengan platform donasi (Saweria, Trakteer, Ko-fi, GitHub Sponsors).

---

## 🚀 Kompatibilitas

- **GNOME Shell**: 46, 47, 48, 49, 50 (Wayland Native, ES Modules).
- **Player**: Spotify Desktop (baik versi `.deb`, Snap, maupun Flatpak).

---

## 📦 Pemasangan Manual

```bash
# 1. Kloning repositori
git clone https://github.com/jenova/spotlify.git
cd spotlify

# 2. Pasang symlink dan kompilasi schema
make install

# 3. Muat ulang sesi GNOME Shell (Logout & Login kembali pada Wayland)
# 4. Aktifkan ekstensi
gnome-extensions enable spotlify@jenova
```

---

## 🛠 Pengujian & Pengembangan

Spotlify dilengkapi unit test suite otomatis:

```bash
# Jalankan unit test untuk parser LRC, track matcher, dan sync engine
make test

# Buat paket rilis untuk extensions.gnome.org (EGO)
make pack
```

---

## 💖 Dukungan & Donasi

Jika Spotlify bermanfaat untuk Anda, pertimbangkan untuk mendukung pengembang:

- **Saweria (QRIS / GoPay / OVO / DANA)**: [saweria.co/jenova](https://saweria.co/jenova)
- **Trakteer**: [trakteer.id/jenova](https://trakteer.id/jenova)
- **Ko-fi**: [ko-fi.com/jenova](https://ko-fi.com/jenova)
- **GitHub Sponsors**: [github.com/sponsors/jenova](https://github.com/sponsors/jenova)

---

## 📄 Lisensi

Didistribusikan di bawah lisensi **GNU General Public License v2.0 or later (GPL-2.0-or-later)**. Lihat [LICENSE](LICENSE) untuk informasi lebih lanjut.

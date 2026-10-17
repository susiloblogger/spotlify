# Product Requirements Document (PRD)
## Spotlify: Realtime Synced Spotify Lyrics On-Screen Display for GNOME Shell

| Metadata | Detail |
|---|---|
| **Product Name** | Spotlify |
| **UUID** | `spotlify@jenova` |
| **Version** | 1.0.0 |
| **Target GNOME Shell** | 46, 47, 48, 49, 50 (Wayland Native, ES Modules) |
| **License** | GPL-2.0-or-later |
| **Target Distribution** | [extensions.gnome.org](https://extensions.gnome.org) (EGO) + GitHub |
| **Document Status** | Approved / Living Document |

---

## 1. Executive Summary & Vision

**Spotlify** adalah ekstensi GNOME Shell modern, ringan, dan elegan yang mendeteksi lagu yang sedang diputar di Spotify Desktop secara realtime melalui D-Bus MPRIS, mengunduh lirik tersinkron (LRC) melalui API publik, dan menampilkannya sebagai On-Screen Display (OSD) transparan dengan latar belakang gradasi dinamis di atas desktop Linux.

### Key Objectives
1. **Zero-Friction Lyrics**: Lirik bergulir otomatis mengikuti tempo lagu tanpa perlu membuka tab browser atau aplikasi terpisah.
2. **Aesthetic Excellence**: Tampilan OSD kaca transparan modern (*glassmorphism*) dengan gradasi warna yang dapat disesuaikan sepenuhnya.
3. **Resource Efficiency**: CPU usage < 1% pada sistem modern dengan arsitektur timer event-based (bukan polling 100ms intensif).
4. **EGO Store Ready**: Memenuhi 100% pedoman peninjauan extensions.gnome.org, termasuk lifecycle cleanup yang sempurna tanpa memory leak, I/O non-blocking, serta integrasi profil donasi kreator.

---

## 2. Functional Requirements (FR)

### 2.1 Spotify MPRIS Detection (`MprisClient`)
- **FR-1.1**: Mendeteksi secara otomatis saat `org.mpris.MediaPlayer2.spotify` muncul atau hilang dari Session Bus.
- **FR-1.2**: Menangkap sinyal `PropertiesChanged` untuk `Metadata` (`xesam:title`, `xesam:artist`, `xesam:album`, `mpris:length`, `mpris:trackid`) dan `PlaybackStatus`.
- **FR-1.3**: Mengabaikan track iklan (`trackid` berawalan `spotify:ad:`).
- **FR-1.4**: Menangani track lokal (`spotify:local:`).
- **FR-1.5**: Membaca properti `Position` secara *asynchronous* via `org.freedesktop.DBus.Properties.Get`.

### 2.2 Position Tracking & Clock Interpolation (`PositionTracker`)
- **FR-2.1**: Menghitung posisi lagu saat `Playing` secara lokal dengan clock monotonik (`GLib.get_monotonic_time()`):
  $$\text{CurrentPosition} = \text{basePosition} + (\text{now} - \text{baseTimestamp}) + \text{globalOffset}$$
- **FR-2.2**: Melakukan resync query D-Bus setiap ~2000ms saat playback aktif.
- **FR-2.3**: Deteksi seek jika selisih posisi $> 500\text{ ms}$, lalu langsung menjadwal ulang timer.

### 2.3 Lyrics Fetching, Matching & Caching (`LyricsManager`)
- **FR-3.1**: Primary source dari **LRCLIB** (`https://lrclib.net/api/get` dan `/api/search`) via `Soup.Session` (Soup 3.0) async non-blocking.
- **FR-3.2**: Fallback source dari **NetEase Cloud Music** (bisa dimatikan via setting).
- **FR-3.3**: Normalisasi judul & pencocokan durasi ketat ($\pm 2\text{ detik}$) untuk menjamin akurasi sinkronisasi.
- **FR-3.4**: Cache lokal di `~/.cache/spotlify/` dengan negative-cache 24 jam.
- **FR-3.5**: Pembatalan request lama dengan `Gio.Cancellable` saat berganti lagu.

### 2.4 Realtime Sync Engine (`SyncEngine` & `LrcParser`)
- **FR-4.1**: Parsing timestamp `[mm:ss.xx]`, multi-tag per baris, dan offset.
- **FR-4.2**: Baris lirik kosong dipetakan sebagai jeda instrumental `♪`.
- **FR-4.3**: Penjadwalan baris menggunakan **Binary Search** dan `GLib.timeout_add()` ke timestamp baris berikutnya.

### 2.5 On-Screen Display UI (`OsdWidget`)
- **FR-5.1**: Widget `St.BoxLayout` dengan mode 3 baris (sebelum, aktif, berikutnya).
- **FR-5.2**: Click-through via `Main.layoutManager.addChrome(widget, { trackFullscreen: true })` and `reactive: false`.
- **FR-5.3**: Background gradient dinamis via CSS St (`background-gradient-direction`, `background-gradient-start`, `background-gradient-end`).
- **FR-5.4**: Baris teks solid dengan font, size, alignment, shadow, dan highlight warna aktif.
- **FR-5.5**: 9 Preset posisi, offset X/Y, multi-monitor, dan mode drag unlock.
- **FR-5.6**: Auto-hide saat pause, no-lyrics, fullscreen, atau lock screen.

### 2.6 Panel Indicator & Preferences
- **FR-6.1**: Quick actions via Top Bar: status lagu, toggle OSD, offset $\pm 250\text{ ms}$, shortcut `<Super><Alt>l`, dan menu **Exit** untuk keluar / menonaktifkan ekstensi.
- **FR-6.2**: Preferensi Libadwaita: Appearance, Colors & Gradient, Position, Behavior (termasuk opsi **Autostart on Login** via `~/.config/autostart/`), Support & Donations.

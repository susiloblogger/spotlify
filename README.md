# Spotlify 🎵

> **Realtime synced Spotify lyrics overlay with a customizable transparent gradient OSD for GNOME Shell.**

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-46%20%7C%2047%20%7C%2048%20%7C%2049%20%7C%2050-blue?logo=gnome)](https://extensions.gnome.org)
[![Session](https://img.shields.io/badge/Session-Wayland%20Native%20%2F%20X11-purple)](https://wayland.freedesktop.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules%20(GJS)-yellow?logo=javascript)](https://gjs.guide)
[![License](https://img.shields.io/badge/License-GPL--2.0--or--later-green.svg)](LICENSE)
[![EGO Ready](https://img.shields.io/badge/EGO-Reviewed%20%26%20Compliant-brightgreen)](https://extensions.gnome.org)

**Spotlify** is a modern, lightweight, and elegant GNOME Shell extension that detects songs playing on Spotify Desktop in real time via D-Bus MPRIS, automatically fetches synchronized lyrics (LRC) from open-source community providers, and displays them as a floating, transparent gradient On-Screen Display (OSD) with album cover art directly on your Linux desktop.

---

## 🎨 OSD Design Preview (*Dual-Pane Card*)

Spotlify features a floating card design with modern glassmorphism aesthetics divided into two panels:

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

- **Left Pane**: High-resolution album cover art thumbnail with asynchronous downloading and automated local disk caching.
- **Right Pane**:
  - *Header Row*: A clean `NOW PLAYING` status badge alongside the track title and artist name.
  - *Lyrics Container*: Dynamic lyric lines with Spotify's signature green vertical accent bar (`▌`) highlighting the active line.

---

## ✨ Key Features

### ⏱ 1. High-Precision Sync & Ultra-Low CPU (< 1%)
- **Local Monotonic Interpolation**: Tracks playback position locally using `GLib.get_monotonic_time()` to prevent jitter or sync lag.
- **Event-Driven Scheduler**: Uses `GLib.timeout_add` scheduled specifically to the timestamp of the next lyric line instead of aggressive 100ms polling loops. CPU consumption remains well below 1%.
- **Automatic Drift Correction**: Periodically queries Spotify D-Bus every ~2000ms and reschedules instantly if drift exceeds 500ms or when seeking tracks.

### 🪟 2. Transparent Gradient OSD & Click-Through
- **Modern Glassmorphism**: Dynamic St Clutter background gradients (**Horizontal**, **Vertical**, **Radial**, or **Solid**) with customizable start and end RGBA colors.
- **Non-Intrusive Click-Through**: Floats transparently over your desktop without capturing mouse clicks or interfering with windows below (`reactive: false`).
- **Always on Top Option**: Keep the lyrics card visible above application windows when desired.
- **1, 2, or 3-Line Display Modes**:
  - *Triple Mode (3 Lines)*: Previous line (dimmed), active line (bright + accent bar), and next line (dimmed).
  - *Double Mode (2 Lines)*: Active line and next line.
  - *Single Mode (1 Line)*: Active line only.

### 🖼 3. Album Cover Art Loader & Intelligent Caching
- Asynchronously downloads album artwork from Spotify metadata using `Soup.Session` (Soup 3.0) without blocking the UI.
- Stores images locally in `~/.cache/spotlify/art/` with background rotation and automatic cache pruning during idle states.
- Displays an elegant vinyl fallback icon when cover art is unavailable or loading.

### 🎯 4. Multi-Provider Lyrics & Strict Accuracy Matching
- **LRCLIB (Primary)**: Fetches synchronized lyrics from the open [LRCLIB](https://lrclib.net) community database (fast, free, tracker-free).
- **NetEase Cloud Music (Fallback)**: Automatic fallback provider if lyrics are not found on the primary source.
- **Track Title Normalization**: Cleans metadata strings by stripping noise such as `(Remastered ...)`, `(Live)`, `[feat. ...]`, `Deluxe Edition`, etc.
- **Strict Duration Tolerance (±2 Seconds)**: Verifies track lengths to guarantee lyrics match the exact recording.
- **Two-Tier Cache**: Memory cache + persistent disk cache in `~/.cache/spotlify/` with 24-hour negative caching for instrumental or unlisted songs.
- **Instrumental Detection**: Automatically indicates musical interludes with the musical symbol `♪`.

### 🖥 5. Multi-Monitor Support & 9 Screen Anchor Presets
- 9 instant screen anchor presets:
  - `Top-Left`, `Top-Center`, `Top-Right`
  - `Middle-Left`, `Center`, `Middle-Right`
  - `Bottom-Left`, `Bottom-Center` *(Default)*, `Bottom-Right`
- Fine-grained pixel adjustments for horizontal (*Offset X*) and vertical (*Offset Y*) positions.
- Multi-monitor selector: bind OSD to a specific monitor or follow the primary display.

### 🛡 6. Smart Auto-Hide
- Automatically conceals the OSD when:
  - Playback is paused or stopped.
  - The current track has no lyrics or is purely instrumental.
  - Any application window enters fullscreen mode.
  - The desktop screen is locked.

### 🔘 7. Top Bar Quick Controls
- Integrated status indicator on GNOME's top panel:
  - Quick toggle for OSD visibility.
  - Instant sync offset adjustments: **Advance -250 ms**, **Delay +250 ms**, and **Reset (0 ms)**.
  - Direct shortcut to open Spotlify Settings.
  - **Exit** button to cleanly unload and disable the extension in one click.

### ⌨️ 8. Global Keyboard Shortcut
- Default shortcut: `<Super><Alt>l` to toggle OSD visibility on demand from anywhere (customizable in GNOME Settings).

### 🧩 9. Strict EGO Review Compliance
- Completely leak-free lifecycle: all GSettings signals, Clutter/St actors, D-Bus listeners, GLib timeout sources, and `Gio.Cancellable` requests are unconditionally released on `disable()`, guaranteeing **zero memory leaks**.
- Built 100% on native ECMAScript Modules (ESM).

---

## 🚀 Compatibility

| Component | Supported Specification |
|---|---|
| **GNOME Shell** | `46`, `47`, `48`, `49`, `50` |
| **Display Session** | Wayland Native & X11 |
| **Spotify Client** | Spotify Desktop Native (`.deb`, `.rpm`), Flatpak (`com.spotify.Client`), and Snap (`spotify`) |
| **Architecture** | Modern ES Modules (ESM) + GJS |
| **Preferences UI** | GTK4 + Libadwaita 1.5+ |

---

## ⚙️ Preferences Guide (Libadwaita)

The preferences window is crafted with **Libadwaita** into clean, categorized sections:

1. **Appearance**:
   - Lyric line count (Single / Double / Triple).
   - Text alignment (Left, Center, Right).
   - Typography settings: Font Family, Active Font Size, Bold weight, and soft Text Shadow.
2. **Colors & Gradient**:
   - Active and inactive lyric text colors.
   - Background gradient direction (None/Solid, Vertical, Horizontal, Radial).
   - Gradient Start and End RGBA colors.
   - Card border radius and internal padding.
3. **Position & Layout**:
   - 9 screen anchor presets or custom positioning.
   - X and Y coordinate offsets in pixels.
   - Target monitor index.
   - Maximum card width and Always on Top toggle.
4. **Behavior & Synchronization**:
   - Global sync offset in milliseconds.
   - Lyric line transition animation duration.
   - NetEase Cloud Music fallback toggle.
   - Option to display unsynchronized plain lyrics.
   - Auto-hide rules (*Hide when Paused*, *Hide when No Lyrics*, *Hide in Fullscreen*).
   - Top panel indicator visibility.
5. **Support & About**:
   - Direct donation links (Saweria, Trakteer, Ko-fi, GitHub Sponsors).
   - Extension version info, GitHub repository, and issue tracker links.

---

## 📦 Manual Installation

### 1. Clone the Repository
```bash
git clone https://github.com/susiloblogger/spotlify.git
cd spotlify
```

### 2. Link Extension & Compile Schemas
```bash
make install
```
*This compiles the GSettings schema and creates a symlink to `~/.local/share/gnome-shell/extensions/spotlify@jenova`.*

### 3. Restart GNOME Shell
- **On Wayland**: Log out and log back into your user session.
- **On X11**: Press `Alt + F2`, type `r`, and press `Enter`.

### 4. Enable the Extension
```bash
gnome-extensions enable spotlify@jenova
```

Open the preferences window anytime with:
```bash
gnome-extensions prefs spotlify@jenova
```

---

## 🛠 Development & Testing Workflow (Makefile)

Spotlify comes with a streamlined Makefile for development, automated testing, and packaging:

```bash
# Compile GSettings schema XML
make schemas

# Install extension locally via symlink
make install

# Run the complete automated unit test suite
make test

# Build verified release zip package for extensions.gnome.org (EGO)
make pack

# Stream extension runtime logs in real time
make log

# Clean build artifacts and packaged zip files
make clean

# Remove extension symlink from local system
make uninstall
```

### 🧪 Automated Unit Test Suite
Running `make test` executes isolated unit tests using the `gjs` runtime:
- `tests/lrcParser.test.js`: Validates timestamp parsing, multi-tags per line, and instrumental break handling.
- `tests/trackMatcher.test.js`: Validates track title sanitization and strict duration matching algorithms.
- `tests/syncEngine.test.js`: Validates binary search lookup and active line progression.
- `tests/coverArtLoader.test.js`: Validates URI resolution, MD5 hashing, and disk cache storage.

---

## 💖 Support & Donations

If Spotlify enhances your daily music listening experience on GNOME, consider supporting ongoing development:

- 🇮🇩 **Saweria (QRIS / GoPay / OVO / DANA)**: [saweria.co/susiloblogger](https://saweria.co/susiloblogger)
- 🇮🇩 **Trakteer**: [trakteer.id/susiloblogger](https://trakteer.id/susiloblogger)
- ☕ **Ko-fi**: [ko-fi.com/susiloblogger](https://ko-fi.com/susiloblogger)
- 🐙 **GitHub Sponsors**: [github.com/sponsors/susiloblogger](https://github.com/sponsors/susiloblogger)

---

## 📄 License

Distributed under the **GNU General Public License v2.0 or later (GPL-2.0-or-later)**. See the [LICENSE](LICENSE) file for full details and copyright notices.

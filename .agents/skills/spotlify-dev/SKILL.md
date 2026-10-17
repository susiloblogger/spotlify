---
name: spotlify-dev
description: >-
  Development guidelines, architecture rules, EGO compliance standards, and workflows
  for building, debugging, and maintaining the Spotlify GNOME Shell extension (realtime Spotify lyrics).
---

# Spotlify Development Skill & Reference Runbook

Use this skill whenever working on, modifying, debugging, or reviewing code in the **Spotlify** GNOME Shell extension project.

---

## 1. Environment & Architecture Invariants

Spotlify targets **GNOME Shell 46, 47, 48, 49, and 50** under **Wayland Native** using modern **ECMAScript Modules (ESM)**.

### 1.1 Core Module Imports
Always use explicit GObject Introspection version imports where applicable:
```javascript
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import Soup from 'gi://Soup?version=3.0';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
```

### 1.2 Preferences Imports (prefs.js)
`prefs.js` executes in the `gnome-extensions-prefs` process, NOT inside GNOME Shell.
- **NEVER** import `St`, `Clutter`, `Meta`, or `Main` inside `prefs.js` or `prefs/*.js`.
- Use GTK4 and Libadwaita:
```javascript
import Gtk from 'gi://Gtk?version=4.0';
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
```

### 1.3 Libadwaita 1.5 Compatibility (GNOME 46 - 50)
To ensure smooth operation across GNOME 46 through 50:
- **Baseline**: Libadwaita 1.5 / GTK 4.14.
- **Allowed Widgets**: `Adw.PreferencesPage`, `Adw.PreferencesGroup`, `Adw.ActionRow`, `Adw.ExpanderRow`, `Adw.ComboRow`, `Adw.SpinRow`, `Adw.SwitchRow`, `Adw.Banner`, `Gtk.ColorDialogButton`, `Gtk.FontDialogButton`, `Gtk.UriLauncher`.
- **PROHIBITED Widgets**:
  - `Adw.ButtonRow` (only in 1.6+). Use `Adw.ActionRow` with a `Gtk.Button` suffix instead.
  - `Adw.ToggleGroup` (1.7+).

---

## 2. The `disable()` Golden Rule (EGO Strict Requirement)

Every resource created or acquired in `enable()` **must be unconditionally freed** in `disable()`.
- Disconnect all GSettings signals
- Disconnect all St / Clutter signals
- Remove GLib timeouts via `GLib.Source.remove()`
- Cancel ongoing `Gio.Cancellable` requests
- Unwatch D-Bus watchers & destroy D-Bus proxies
- Remove OSD Chrome actor via `Main.layoutManager.removeChrome()` and `.destroy()`
- Remove panel indicators & keybindings

---

## 3. Subsystem Implementation Patterns

### 3.1 MPRIS D-Bus Watcher & Position Interpolation
Spotify MPRIS service: `org.mpris.MediaPlayer2.spotify`, object path `/org/mpris/MediaPlayer2`.
- Query `Position` via async `Get` call on track change, seek, and unpause.
- Calculate position locally between queries using monotonic time:
  `elapsedMs = Math.floor((nowUs - baseMonotonicTimeUs) / 1000)`
- Resync every ~2000ms. If drift > 500ms, reschedule.

### 3.2 Lyrics Management & Matching
- Primary: LRCLIB (`https://lrclib.net/api/get`). Fallback: NetEase.
- Clean track titles (strip `(Remastered ...)`, `(Live)`, `[feat. ...]`). Require duration difference $\le 2000\text{ ms}$ for synced lyrics.
- User-Agent: `Spotlify/<version> (https://github.com/jenova/spotlify)`.

### 3.3 Dynamic Gradient OSD (St CSS)
```javascript
const css = `
  background-gradient-direction: ${direction};
  background-gradient-start: ${startColorRgba};
  background-gradient-end: ${endColorRgba};
  border-radius: ${borderRadius}px;
  padding: ${padding}px;
`;
this._container.set_style(css);
```

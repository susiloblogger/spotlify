import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

import { OsdWidget } from './lib/osdWidget.js';
import { PositionTracker } from './lib/positionTracker.js';
import { MprisClient } from './lib/mprisClient.js';
import { LyricsManager } from './lib/lyrics/lyricsManager.js';
import { SyncEngine } from './lib/syncEngine.js';
import { SpotlifyIndicator } from './lib/panelIndicator.js';

export default class SpotlifyExtension extends Extension {
    enable() {
        console.debug(`[Spotlify] Enabling ${this.metadata.name} v${this.metadata.version}`);

        this._settings = this.getSettings();
        this._settingsSignals = [];
        this._disableIdleId = null;

        // 1. Initialize core subsystems
        this._osdWidget = new OsdWidget(this._settings);
        this._positionTracker = new PositionTracker();
        this._lyricsManager = new LyricsManager(this._settings);
        this._syncEngine = new SyncEngine();
        this._indicator = null;

        // Configure initial sync offset
        this._positionTracker.setUserOffset(this._settings.get_int('sync-offset'));
        const offsetSignalId = this._settings.connect('changed::sync-offset', () => {
            this._positionTracker.setUserOffset(this._settings.get_int('sync-offset'));
            this._syncEngine.update();
        });
        this._settingsSignals.push(offsetSignalId);

        // Connect position getter to SyncEngine
        this._syncEngine.setPositionGetter(() => this._positionTracker.getPositionMs());
        this._syncEngine.onLineChanged = ({ prevText, currentText, nextText, nextNextText }) => {
            if (this._osdWidget) {
                this._osdWidget.setLyrics(prevText, currentText, nextText, nextNextText);
            }
        };

        // 2. Initialize MPRIS client & event handlers
        this._mprisClient = new MprisClient();

        this._mprisClient.onTrackChanged = (trackInfo) => {
            this._handleTrackChanged(trackInfo);
        };

        this._mprisClient.onPlaybackStatusChanged = (status) => {
            this._positionTracker.setPlaybackStatus(status);
            this._syncEngine.setPlaybackStatus(status);
            this._osdWidget.setPlaybackStatus(status);
        };

        this._mprisClient.onPositionResynced = (posMs) => {
            const hasDrifted = this._positionTracker.checkDrift(posMs);
            if (hasDrifted) {
                this._syncEngine.update();
            }
        };

        this._mprisClient.onPlayerVanished = () => {
            if (this._indicator) {
                this._indicator.setTrack(null, null);
            }
            this._positionTracker.reset();
            this._syncEngine.setLyrics([]);
            if (this._osdWidget) {
                this._osdWidget.setTrackInfo({ title: 'Spotlify', artist: 'Waiting for music...', artUrl: '' });
                this._osdWidget.setLyrics('', '', '', '');
                this._osdWidget.setPlaybackStatus('Stopped');
            }
        };

        // 3. Initialize Top Bar Indicator
        this._setupIndicator();
        const indicatorToggleId = this._settings.connect('changed::show-panel-indicator', () => {
            this._setupIndicator();
        });
        this._settingsSignals.push(indicatorToggleId);

        // 4. Register global shortcut keybinding
        this._setupKeybinding();

        // 5. Watch fullscreen changes
        this._fullscreenSignalId = global.display.connect('in-fullscreen-changed', () => {
            const isFullscreen = global.display.get_focus_window()?.is_fullscreen() || false;
            if (this._osdWidget) {
                this._osdWidget.setFullscreen(isFullscreen);
            }
        });
    }

    async _handleTrackChanged(trackInfo) {
        if (!trackInfo || !trackInfo.title) return;

        console.debug(`[Spotlify] Now playing: ${trackInfo.title} by ${trackInfo.artist}`);

        if (this._indicator) {
            this._indicator.setTrack(trackInfo.title, trackInfo.artist);
        }

        // Reset sync engine while fetching
        this._positionTracker.setPosition(0);
        this._syncEngine.setLyrics([]);

        // Update OSD track info on left pane
        if (this._osdWidget) {
            this._osdWidget.setTrackInfo(trackInfo);
            this._osdWidget.setLyrics('', '', '', '');
        }

        const lyrics = await this._lyricsManager.getLyrics(trackInfo);
        if (!this._syncEngine || !this._osdWidget) return;

        if (lyrics && lyrics.lines && lyrics.lines.length > 0) {
            console.debug(`[Spotlify] Loaded ${lyrics.lines.length} lines for ${trackInfo.title}`);
            this._syncEngine.setLyrics(lyrics.lines);
        } else {
            console.debug(`[Spotlify] No lyrics found for ${trackInfo.title}`);
            if (this._osdWidget) {
                this._osdWidget.setLyrics('', '', '', '');
            }
        }
    }

    _setupIndicator() {
        const show = this._settings.get_boolean('show-panel-indicator');

        if (show && !this._indicator) {
            this._indicator = new SpotlifyIndicator(
                this._settings,
                () => {
                    this.openPreferences();
                },
                () => {
                    if (this._disableIdleId) {
                        GLib.Source.remove(this._disableIdleId);
                    }
                    this._disableIdleId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                        this._disableIdleId = null;
                        Main.extensionManager.disableExtension(this.uuid);
                        return GLib.SOURCE_REMOVE;
                    });
                }
            );
            Main.panel.addToStatusArea(this.uuid, this._indicator);
        } else if (!show && this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _setupKeybinding() {
        try {
            Main.wm.addKeybinding(
                'toggle-shortcut',
                this._settings,
                Meta.KeyBindingFlags.NONE,
                Shell.ActionMode.ALL,
                () => {
                    const current = this._settings.get_boolean('osd-visible');
                    this._settings.set_boolean('osd-visible', !current);
                }
            );
        } catch (e) {
            console.warn(`[Spotlify] Could not bind toggle-shortcut: ${e.message}`);
        }
    }

    disable() {
        console.debug(`[Spotlify] Disabling ${this.metadata.name}`);

        // 1. Remove pending disable idle callback
        if (this._disableIdleId) {
            GLib.Source.remove(this._disableIdleId);
            this._disableIdleId = null;
        }

        // 2. Remove keybinding
        try {
            Main.wm.removeKeybinding('toggle-shortcut');
        } catch (e) {
            // Ignore
        }

        // 2. Disconnect display fullscreen signal
        if (this._fullscreenSignalId) {
            global.display.disconnect(this._fullscreenSignalId);
            this._fullscreenSignalId = null;
        }

        // 3. Disconnect all GSettings signals
        for (const id of this._settingsSignals) {
            try {
                this._settings.disconnect(id);
            } catch (e) {
                // Ignore
            }
        }
        this._settingsSignals = [];

        // 4. Teardown indicator
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        // 5. Teardown MPRIS client
        if (this._mprisClient) {
            this._mprisClient.destroy();
            this._mprisClient = null;
        }

        // 6. Teardown SyncEngine
        if (this._syncEngine) {
            this._syncEngine.destroy();
            this._syncEngine = null;
        }

        // 7. Teardown LyricsManager
        if (this._lyricsManager) {
            this._lyricsManager.destroy();
            this._lyricsManager = null;
        }

        // 8. Teardown OsdWidget
        if (this._osdWidget) {
            this._osdWidget.destroy();
            this._osdWidget = null;
        }

        this._positionTracker = null;
        this._settings = null;
    }
}

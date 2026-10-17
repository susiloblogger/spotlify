import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class MprisClient {
    constructor() {
        this._watchId = null;
        this._proxy = null;
        this._proxySignalId = null;
        this._resyncTimerId = null;
        this._currentTrackId = null;
        this._playbackStatus = 'Stopped';

        // Callbacks
        this.onTrackChanged = null;
        this.onPlaybackStatusChanged = null;
        this.onPositionResynced = null;
        this.onPlayerVanished = null;

        this._startWatching();
    }

    _startWatching() {
        this._watchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            'org.mpris.MediaPlayer2.spotify',
            Gio.BusNameWatcherFlags.NONE,
            (connection, name, owner) => this._onPlayerAppeared(connection, name, owner),
            (connection, name) => this._onPlayerVanished(connection, name)
        );
    }

    _onPlayerAppeared(connection, name, owner) {
        Gio.DBusProxy.new(
            connection,
            Gio.DBusProxyFlags.NONE,
            null,
            'org.mpris.MediaPlayer2.spotify',
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            null,
            (source, res) => {
                try {
                    this._proxy = Gio.DBusProxy.new_finish(res);
                    this._onProxyReady();
                } catch (e) {
                    console.error(`[Spotlify] Failed to create D-Bus proxy for Spotify: ${e.message}`);
                }
            }
        );
    }

    _onPlayerVanished(connection, name) {
        this._stopResyncTimer();
        this._currentTrackId = null;
        this._playbackStatus = 'Stopped';

        if (this._proxySignalId && this._proxy) {
            try {
                this._proxy.disconnect(this._proxySignalId);
            } catch (e) {
                // Ignore
            }
            this._proxySignalId = null;
        }
        this._proxy = null;

        if (this.onPlayerVanished) {
            this.onPlayerVanished();
        }
    }

    _unpack(val) {
        if (val === null || val === undefined) return null;
        if (typeof val?.deep_unpack === 'function') {
            return this._unpack(val.deep_unpack());
        }
        if (Array.isArray(val)) {
            return val.map(item => this._unpack(item));
        }
        if (typeof val === 'object' && val.constructor === Object) {
            const result = {};
            for (const [k, v] of Object.entries(val)) {
                result[k] = this._unpack(v);
            }
            return result;
        }
        return val;
    }

    _onProxyReady() {
        if (!this._proxy) return;

        this._proxySignalId = this._proxy.connect('g-properties-changed', (proxy, changedProps) => {
            this._handlePropertiesChanged(this._unpack(changedProps));
        });

        // Read initial state
        const statusVariant = this._proxy.get_cached_property('PlaybackStatus');
        if (statusVariant) {
            this._playbackStatus = String(this._unpack(statusVariant));
            if (this.onPlaybackStatusChanged) {
                this.onPlaybackStatusChanged(this._playbackStatus);
            }
        }

        const metadataVariant = this._proxy.get_cached_property('Metadata');
        if (metadataVariant) {
            this._handleMetadata(this._unpack(metadataVariant));
        }

        this._queryPosition((posMs) => {
            if (this.onPositionResynced) {
                this.onPositionResynced(posMs);
            }
        });

        this._updateResyncTimer();
    }

    _handlePropertiesChanged(changed) {
        if (!changed) return;
        const unpacked = this._unpack(changed);

        if ('PlaybackStatus' in unpacked) {
            this._playbackStatus = String(unpacked['PlaybackStatus']);
            this._updateResyncTimer();
            if (this.onPlaybackStatusChanged) {
                this.onPlaybackStatusChanged(this._playbackStatus);
            }
        }

        if ('Metadata' in unpacked) {
            this._handleMetadata(unpacked['Metadata']);
        }
    }

    _handleMetadata(rawMeta) {
        if (!rawMeta) return;

        const trackId = rawMeta['mpris:trackid'] ? String(rawMeta['mpris:trackid']) : '';

        // Ignore ad tracks
        if (trackId.startsWith('spotify:ad:')) {
            console.log('[Spotlify] Spotify ad detected, skipping lyrics.');
            return;
        }

        // Parse artist
        let artist = '';
        const rawArtist = rawMeta['xesam:artist'];
        if (Array.isArray(rawArtist)) {
            artist = rawArtist.join(', ');
        } else if (typeof rawArtist === 'string') {
            artist = rawArtist;
        }

        const title = rawMeta['xesam:title'] ? String(rawMeta['xesam:title']) : '';
        const album = rawMeta['xesam:album'] ? String(rawMeta['xesam:album']) : '';
        const artUrl = rawMeta['mpris:artUrl'] ? String(rawMeta['mpris:artUrl']) : '';

        // mpris:length is in microseconds
        const lengthUs = rawMeta['mpris:length'] ? Number(rawMeta['mpris:length']) : 0;
        const durationSec = Math.round(lengthUs / 1000000);
        const durationMs = Math.round(lengthUs / 1000);

        const trackInfo = {
            trackId,
            title,
            artist,
            album,
            artUrl,
            durationSec,
            durationMs,
        };

        const isNewTrack = (trackId !== this._currentTrackId);
        this._currentTrackId = trackId;

        if (isNewTrack && this.onTrackChanged) {
            this.onTrackChanged(trackInfo);
        }

        // Query current position immediately on track change
        this._queryPosition((posMs) => {
            if (this.onPositionResynced) {
                this.onPositionResynced(posMs);
            }
        });
    }

    _queryPosition(callback) {
        if (!this._proxy) return;

        this._proxy.call(
            'org.freedesktop.DBus.Properties.Get',
            new GLib.Variant('(ss)', ['org.mpris.MediaPlayer2.Player', 'Position']),
            Gio.DBusCallFlags.NONE,
            1000,
            null,
            (source, res) => {
                try {
                    const reply = this._proxy.call_finish(res);
                    const unpacked = this._unpack(reply);
                    const posUs = Array.isArray(unpacked) ? Number(unpacked[0]) : Number(unpacked);
                    const posMs = Math.round(posUs / 1000);
                    if (callback && !isNaN(posMs)) {
                        callback(posMs);
                    }
                } catch (e) {
                    // Position might not be accessible if player is shutting down
                }
            }
        );
    }

    _updateResyncTimer() {
        this._stopResyncTimer();

        if (this._playbackStatus === 'Playing') {
            this._resyncTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
                this._queryPosition((posMs) => {
                    if (this.onPositionResynced) {
                        this.onPositionResynced(posMs);
                    }
                });
                return GLib.SOURCE_CONTINUE;
            });
        }
    }

    _stopResyncTimer() {
        if (this._resyncTimerId) {
            GLib.Source.remove(this._resyncTimerId);
            this._resyncTimerId = null;
        }
    }

    destroy() {
        this._stopResyncTimer();

        if (this._watchId) {
            Gio.bus_unwatch_name(this._watchId);
            this._watchId = null;
        }

        if (this._proxySignalId && this._proxy) {
            try {
                this._proxy.disconnect(this._proxySignalId);
            } catch (e) {
                // Ignore
            }
            this._proxySignalId = null;
        }

        this._proxy = null;
        this.onTrackChanged = null;
        this.onPlaybackStatusChanged = null;
        this.onPositionResynced = null;
        this.onPlayerVanished = null;
    }
}

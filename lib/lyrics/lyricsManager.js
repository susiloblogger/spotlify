import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';
import { LyricsCache } from './lyricsCache.js';
import { LrclibProvider } from './lrclibProvider.js';
import { NeteaseProvider } from './neteaseProvider.js';
import { LrcParser } from '../lrcParser.js';

export class LyricsManager {
    /**
     * @param {Gio.Settings} settings
     */
    constructor(settings) {
        this._settings = settings;
        this._session = new Soup.Session({
            timeout: 6,
        });

        this._cache = new LyricsCache();
        this._lrclib = new LrclibProvider(this._session);
        this._netease = new NeteaseProvider(this._session);

        this._activeCancellable = null;
    }

    /**
     * Fetches and parses lyrics for the given track info.
     * @param {object} trackInfo { title, artist, album, durationSec, trackId }
     * @returns {Promise<{ lines: Array<{ time: number, text: string }>, isSynced: boolean }|null>}
     */
    async getLyrics(trackInfo) {
        // Cancel any pending request for previous track
        if (this._activeCancellable) {
            this._activeCancellable.cancel();
            this._activeCancellable = null;
        }

        const cancellable = new Gio.Cancellable();
        this._activeCancellable = cancellable;

        try {
            // 1. Check local cache
            const cached = await this._cache.load(trackInfo, cancellable);
            if (cancellable.is_cancelled()) return null;

            if (cached) {
                if (cached.notFound) {
                    return null;
                }
                if (cached.syncedLyrics) {
                    const lines = LrcParser.parse(cached.syncedLyrics);
                    return { lines, isSynced: true };
                }
                if (cached.plainLyrics && this._settings.get_boolean('show-unsynced-lyrics')) {
                    return { lines: [{ time: 0, text: cached.plainLyrics }], isSynced: false };
                }
            }

            // 2. Fetch from LRCLIB
            let result = await this._lrclib.fetch(trackInfo, cancellable);
            if (cancellable.is_cancelled()) return null;

            // 3. Fallback to NetEase if synced lyrics were not found on LRCLIB
            const enableNetease = this._settings.get_boolean('enable-netease');
            if ((!result || !result.syncedLyrics) && enableNetease) {
                const neteaseResult = await this._netease.fetch(trackInfo, cancellable);
                if (cancellable.is_cancelled()) return null;

                if (neteaseResult && neteaseResult.syncedLyrics) {
                    result = neteaseResult;
                }
            }

            // 4. Save to cache & return
            if (result && (result.syncedLyrics || result.plainLyrics)) {
                this._cache.save(trackInfo, result);

                if (result.syncedLyrics) {
                    const lines = LrcParser.parse(result.syncedLyrics);
                    return { lines, isSynced: true };
                }
                if (result.plainLyrics && this._settings.get_boolean('show-unsynced-lyrics')) {
                    return { lines: [{ time: 0, text: result.plainLyrics }], isSynced: false };
                }
            } else {
                // Negative cache to prevent rapid repeated failed requests
                this._cache.save(trackInfo, { notFound: true });
            }

            return null;
        } catch (e) {
            if (!cancellable.is_cancelled()) {
                console.error(`[Spotlify] Error fetching lyrics: ${e.message}`);
            }
            return null;
        } finally {
            if (this._activeCancellable === cancellable) {
                this._activeCancellable = null;
            }
        }
    }

    clearCache() {
        if (this._cache) {
            this._cache.clearAll();
        }
    }

    destroy() {
        if (this._activeCancellable) {
            this._activeCancellable.cancel();
            this._activeCancellable = null;
        }

        if (this._session) {
            this._session.abort();
            this._session = null;
        }

        this._cache = null;
        this._lrclib = null;
        this._netease = null;
        this._settings = null;
    }
}

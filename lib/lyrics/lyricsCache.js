import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class LyricsCache {
    constructor() {
        const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'spotlify']);
        this._dir = Gio.File.new_for_path(cacheDir);
        this._ensureCacheDir();
    }

    _ensureCacheDir() {
        try {
            if (!this._dir.query_exists(null)) {
                this._dir.make_directory_with_parents(null);
            }
        } catch (e) {
            console.error(`[Spotlify] Failed to create cache directory: ${e.message}`);
        }
    }

    _getCacheKey(trackInfo) {
        if (trackInfo.trackId && !trackInfo.trackId.startsWith('spotify:local:')) {
            return trackInfo.trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
        }
        const raw = `${trackInfo.artist || ''}|${trackInfo.title || ''}|${trackInfo.durationSec || 0}`;
        const checksum = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, raw, -1);
        return checksum;
    }

    _getFileForKey(key) {
        return this._dir.get_child(`${key}.json`);
    }

    /**
     * Loads cached lyrics for a track asynchronously.
     * @param {object} trackInfo
     * @param {Gio.Cancellable} cancellable
     * @returns {Promise<object|null>}
     */
    async load(trackInfo, cancellable = null) {
        const key = this._getCacheKey(trackInfo);
        const file = this._getFileForKey(key);

        if (!file.query_exists(cancellable)) {
            return null;
        }

        return new Promise((resolve) => {
            file.load_contents_async(cancellable, (source, res) => {
                try {
                    const [, contents] = source.load_contents_finish(res);
                    const decoder = new TextDecoder('utf-8');
                    const jsonStr = decoder.decode(contents);
                    const data = JSON.parse(jsonStr);

                    // Check if it's a negative cache entry
                    if (data && data.notFound) {
                        const ageMs = Date.now() - (data.timestamp || 0);
                        const ttlMs = 24 * 60 * 60 * 1000; // 24 hours
                        if (ageMs < ttlMs) {
                            resolve(data);
                            return;
                        }
                        // Expired negative cache
                        resolve(null);
                        return;
                    }

                    resolve(data);
                } catch (e) {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Saves lyrics to cache asynchronously.
     * @param {object} trackInfo
     * @param {object} data
     */
    save(trackInfo, data) {
        const key = this._getCacheKey(trackInfo);
        const file = this._getFileForKey(key);
        const payload = {
            ...data,
            timestamp: Date.now(),
        };

        const encoder = new TextEncoder();
        const bytes = encoder.encode(JSON.stringify(payload, null, 2));

        file.replace_contents_async(
            bytes,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
            (source, res) => {
                try {
                    source.replace_contents_finish(res);
                } catch (e) {
                    console.error(`[Spotlify] Failed to write cache: ${e.message}`);
                }
            }
        );
    }

    /**
     * Clears all cached lyrics.
     */
    clearAll() {
        try {
            const enumerator = this._dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
            let info;
            while ((info = enumerator.next_file(null)) !== null) {
                const child = this._dir.get_child(info.get_name());
                child.delete(null);
            }
        } catch (e) {
            console.error(`[Spotlify] Error clearing cache: ${e.message}`);
        }
    }
}

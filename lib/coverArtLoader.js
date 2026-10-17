import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup';

/**
 * Handles fetching, caching, and loading Spotify album cover art,
 * with automatic cache rotation and pruning.
 */
export class CoverArtLoader {
    constructor() {
        this._session = new Soup.Session();
        this._cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'spotlify', 'art']);
        this._cleanupIdleId = null;

        try {
            GLib.mkdir_with_parents(this._cacheDir, 0o755);
        } catch (e) {
            console.warn(`[Spotlify] Could not create art cache dir: ${e.message}`);
        }

        // Schedule low-priority background cache cleanup on startup
        this._cleanupIdleId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            this._cleanupIdleId = null;
            this.cleanCache();
            return GLib.SOURCE_REMOVE;
        });
    }

    /**
     * Resolves the local file path for a given art URL.
     * If the URL is remote, downloads and caches it locally.
     * @param {string} artUrl
     * @returns {Promise<string|null>} Absolute local path to image, or null on error
     */
    async loadArtPath(artUrl) {
        if (!artUrl || typeof artUrl !== 'string') {
            return null;
        }

        // Handle file:// URIs
        if (artUrl.startsWith('file://')) {
            const localPath = artUrl.replace('file://', '');
            if (GLib.file_test(localPath, GLib.FileTest.EXISTS)) {
                return localPath;
            }
            return null;
        }

        // Handle http(s) URLs
        if (!artUrl.startsWith('http://') && !artUrl.startsWith('https://')) {
            return null;
        }

        const hash = GLib.compute_checksum_for_string(GLib.ChecksumType.MD5, artUrl, -1);
        const cachePath = GLib.build_filenamev([this._cacheDir, `${hash}.jpg`]);

        if (GLib.file_test(cachePath, GLib.FileTest.EXISTS)) {
            return cachePath;
        }

        try {
            const message = Soup.Message.new('GET', artUrl);
            if (!message) {
                return null;
            }

            const bytes = await new Promise((resolve, reject) => {
                this._session.send_and_read_async(
                    message,
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (session, res) => {
                        try {
                            const b = session.send_and_read_finish(res);
                            resolve(b);
                        } catch (e) {
                            reject(e);
                        }
                    }
                );
            });

            if (message.get_status() !== Soup.Status.OK || !bytes) {
                return null;
            }

            const data = bytes.get_data();
            const file = Gio.File.new_for_path(cachePath);
            file.replace_contents(
                data,
                null,
                false,
                Gio.FileCreateFlags.REPLACE_DESTINATION,
                null
            );

            return cachePath;
        } catch (e) {
            console.warn(`[Spotlify] Failed to download cover art from ${artUrl}: ${e.message}`);
            return null;
        }
    }

    /**
     * Automatically prunes the cover art cache by max age and max file count.
     * @param {Object} options
     * @param {number} [options.maxFiles=100] Maximum allowed files in cache
     * @param {number} [options.maxAgeDays=14] Maximum age in days before a file is purged
     * @returns {{ scanned: number, deleted: number }}
     */
    cleanCache({ maxFiles = 100, maxAgeDays = 14 } = {}) {
        const dir = Gio.File.new_for_path(this._cacheDir);
        if (!dir.query_exists(null)) {
            return { scanned: 0, deleted: 0 };
        }

        let scanned = 0;
        let deleted = 0;

        try {
            const enumerator = dir.enumerate_children(
                'standard::name,time::modified',
                Gio.FileQueryInfoFlags.NONE,
                null
            );

            const nowSec = Math.floor(GLib.get_real_time() / 1000000);
            const maxAgeSec = maxAgeDays * 24 * 3600;
            const entries = [];
            let info;

            while ((info = enumerator.next_file(null)) !== null) {
                const name = info.get_name();
                if (!name.endsWith('.jpg')) {
                    continue;
                }

                scanned++;
                const dt = info.get_modification_date_time();
                const modSec = dt ? dt.to_unix() : 0;
                const child = dir.get_child(name);

                // 1. Purge files older than maxAgeDays
                if (maxAgeSec > 0 && (nowSec - modSec) > maxAgeSec) {
                    try {
                        child.delete(null);
                        deleted++;
                    } catch (e) {
                        // Ignore deletion errors
                    }
                } else {
                    entries.push({ child, modSec });
                }
            }
            enumerator.close(null);

            // 2. If remaining files exceed maxFiles, remove the oldest files
            if (entries.length > maxFiles) {
                entries.sort((a, b) => a.modSec - b.modSec); // Oldest first
                const excessCount = entries.length - maxFiles;
                for (let i = 0; i < excessCount; i++) {
                    try {
                        entries[i].child.delete(null);
                        deleted++;
                    } catch (e) {
                        // Ignore deletion errors
                    }
                }
            }
        } catch (e) {
            console.warn(`[Spotlify] Auto-cleanup failed: ${e.message}`);
        }

        return { scanned, deleted };
    }

    destroy() {
        if (this._cleanupIdleId) {
            GLib.Source.remove(this._cleanupIdleId);
            this._cleanupIdleId = null;
        }

        if (this._session) {
            try {
                this._session.abort();
            } catch (e) {
                // Ignore
            }
            this._session = null;
        }
    }
}

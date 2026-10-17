import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import { TrackMatcher } from './trackMatcher.js';

export class LrclibProvider {
    /**
     * @param {Soup.Session} session
     */
    constructor(session) {
        this._session = session;
        this._baseUrl = 'https://lrclib.net/api';
        this._userAgent = 'Spotlify/1.0 (https://github.com/jenova/spotlify)';
    }

    /**
     * Fetches lyrics from LRCLIB.
     * @param {object} track { title, artist, album, durationSec }
     * @param {Gio.Cancellable} cancellable
     * @returns {Promise<{ syncedLyrics: string|null, plainLyrics: string|null }|null>}
     */
    async fetch(track, cancellable = null) {
        const cleanedTitle = TrackMatcher.cleanTitle(track.title);

        // Step 1: Direct exact match via /api/get
        try {
            const exactResult = await this._getExact(cleanedTitle, track, cancellable);
            if (exactResult && (exactResult.syncedLyrics || exactResult.plainLyrics)) {
                return exactResult;
            }
        } catch (e) {
            // If 404 or failed, proceed to search
        }

        if (cancellable && cancellable.is_cancelled()) {
            return null;
        }

        // Step 2: Fallback search via /api/search
        try {
            const searchResult = await this._search(cleanedTitle, track, cancellable);
            if (searchResult) {
                return searchResult;
            }
        } catch (e) {
            // Ignore search errors
        }

        return null;
    }

    _sendRequest(url, cancellable) {
        return new Promise((resolve, reject) => {
            const sendOnce = (isRetry = false) => {
                if (cancellable && cancellable.is_cancelled()) {
                    resolve(null);
                    return;
                }

                const msg = Soup.Message.new('GET', url);
                if (!msg) {
                    resolve(null);
                    return;
                }

                msg.request_headers.append('User-Agent', this._userAgent);

                this._session.send_and_read_async(
                    msg,
                    GLib.PRIORITY_DEFAULT,
                    cancellable,
                    (session, res) => {
                        try {
                            const bytes = session.send_and_read_finish(res);
                            const statusCode = msg.get_status();

                            if (statusCode === 200 && bytes) {
                                const decoder = new TextDecoder('utf-8');
                                const json = JSON.parse(decoder.decode(bytes.get_data()));
                                resolve(json);
                            } else if ((statusCode === 503 || statusCode === 429) && !isRetry) {
                                GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1200, () => {
                                    if (cancellable && cancellable.is_cancelled()) {
                                        resolve(null);
                                    } else {
                                        sendOnce(true);
                                    }
                                    return GLib.SOURCE_REMOVE;
                                });
                            } else {
                                resolve(null);
                            }
                        } catch (e) {
                            reject(e);
                        }
                    }
                );
            };

            sendOnce(false);
        });
    }

    async _getExact(title, track, cancellable) {
        const params = [
            `track_name=${encodeURIComponent(title)}`,
            `artist_name=${encodeURIComponent(track.artist)}`,
        ];

        if (track.durationSec) {
            params.push(`duration=${encodeURIComponent(track.durationSec)}`);
        }

        const url = `${this._baseUrl}/get?${params.join('&')}`;
        const data = await this._sendRequest(url, cancellable);

        if (data) {
            return {
                syncedLyrics: data.syncedLyrics || null,
                plainLyrics: data.plainLyrics || null,
            };
        }
        return null;
    }

    async _search(title, track, cancellable) {
        const query = `${title} ${track.artist}`.trim();
        const url = `${this._baseUrl}/search?q=${encodeURIComponent(query)}`;
        const candidates = await this._sendRequest(url, cancellable);

        if (!Array.isArray(candidates) || candidates.length === 0) {
            return null;
        }

        let bestCandidate = null;
        let highestScore = 0;

        for (const cand of candidates) {
            // Prefer candidates that have syncedLyrics
            if (!cand.syncedLyrics) continue;

            const score = TrackMatcher.scoreCandidate(track, cand);
            if (score > highestScore) {
                highestScore = score;
                bestCandidate = cand;
            }
        }

        if (bestCandidate && highestScore > 0) {
            return {
                syncedLyrics: bestCandidate.syncedLyrics || null,
                plainLyrics: bestCandidate.plainLyrics || null,
            };
        }

        return null;
    }
}

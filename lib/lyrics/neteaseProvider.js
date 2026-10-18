import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';
import { TrackMatcher } from './trackMatcher.js';

export class NeteaseProvider {
    /**
     * @param {Soup.Session} session
     */
    constructor(session) {
        this._session = session;
        this._userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36';
    }

    /**
     * Fetches lyrics from NetEase Cloud Music API.
     * @param {object} track { title, artist, durationSec }
     * @param {Gio.Cancellable} cancellable
     * @returns {Promise<{ syncedLyrics: string|null, plainLyrics: string|null }|null>}
     */
    async fetch(track, cancellable = null) {
        const cleanedTitle = TrackMatcher.cleanTitle(track.title);
        const query = `${cleanedTitle} ${track.artist}`.trim();
        const searchUrl = `https://music.163.com/api/search/get/web?s=${encodeURIComponent(query)}&type=1&limit=5`;

        let searchData;
        try {
            searchData = await this._sendRequest(searchUrl, cancellable);
        } catch (e) {
            return null;
        }

        if (!searchData || !searchData.result || !Array.isArray(searchData.result.songs)) {
            return null;
        }

        const songs = searchData.result.songs;
        let bestSong = null;
        let highestScore = 0;

        for (const s of songs) {
            const cand = {
                trackName: s.name,
                artistName: (s.artists && s.artists[0]) ? s.artists[0].name : '',
                duration: s.duration ? Math.round(s.duration / 1000) : null,
            };

            const score = TrackMatcher.scoreCandidate(track, cand);
            if (score > highestScore) {
                highestScore = score;
                bestSong = s;
            }
        }

        if (!bestSong || highestScore === 0) {
            return null;
        }

        // Fetch lyrics for best song
        const lyricUrl = `https://music.163.com/api/song/lyric?id=${bestSong.id}&lv=1&kv=1&tv=-1`;
        let lyricData;
        try {
            lyricData = await this._sendRequest(lyricUrl, cancellable);
        } catch (e) {
            return null;
        }

        if (lyricData && lyricData.lrc && lyricData.lrc.lyric) {
            return {
                syncedLyrics: lyricData.lrc.lyric,
                plainLyrics: null,
            };
        }

        return null;
    }

    _sendRequest(url, cancellable) {
        return new Promise((resolve, reject) => {
            const msg = Soup.Message.new('GET', url);
            if (!msg) {
                resolve(null);
                return;
            }

            msg.request_headers.append('User-Agent', this._userAgent);
            msg.request_headers.append('Referer', 'https://music.163.com');

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
                        } else {
                            resolve(null);
                        }
                    } catch (e) {
                        reject(e);
                    }
                }
            );
        });
    }
}

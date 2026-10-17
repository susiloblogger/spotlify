/**
 * TrackMatcher
 * Cleans track titles/artists and scores lyric candidates based on title,
 * artist, and duration tolerance.
 */

export class TrackMatcher {
    /**
     * Cleans up Spotify track title by removing annotations like:
     * - (feat. Artist)
     * - - Remastered 2011 / (2011 Remaster)
     * - [Radio Edit]
     * - (Live at ...)
     * @param {string} title
     * @returns {string}
     */
    static cleanTitle(title) {
        if (!title) return '';

        return title
            // Remove feat/ft/with in parentheses or brackets
            .replace(/[\(\[](?:feat|ft|with)\.?\s+[^\)\]]+[\)\]]/gi, '')
            // Remove feat/ft/with after dash or space
            .replace(/(?:-\s*|\s+)(?:feat|ft|with)\.?\s+.*$/gi, '')
            // Remove remaster annotations
            .replace(/[\(\[](?:(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?|deluxe|anniversary|special|expanded)[^\)\]]*[\)\]]/gi, '')
            .replace(/-\s*(?:(?:\d{4}\s*)?remaster(?:ed)?(?:\s*\d{4})?|deluxe|anniversary|special|expanded).*$/gi, '')
            // Remove live annotations
            .replace(/[\(\[]live[^\)\]]*[\)\]]/gi, '')
            .replace(/-\s*live.*$/gi, '')
            // Remove radio/album edit annotations
            .replace(/[\(\[](?:radio|album|single)\s+edit[\)\]]/gi, '')
            // Trim whitespace
            .trim();
    }

    /**
     * Normalizes a string for loose comparison (lowercase, alphanumeric only).
     * @param {string} str
     * @returns {string}
     */
    static normalize(str) {
        if (!str) return '';
        return str
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remove diacritics
            .replace(/[^\w\s]/g, '')         // remove punctuation
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Checks if a candidate's duration matches the expected duration within tolerance.
     * @param {number} expectedSec
     * @param {number} candidateSec
     * @param {number} toleranceSec
     * @returns {boolean}
     */
    static isDurationMatch(expectedSec, candidateSec, toleranceSec = 2) {
        if (!expectedSec || !candidateSec) return true; // If one is unknown, don't reject
        return Math.abs(expectedSec - candidateSec) <= toleranceSec;
    }

    /**
     * Scores a candidate lyric result (0 to 100).
     * @param {object} track { title, artist, durationSec }
     * @param {object} candidate { trackName, artistName, duration }
     * @returns {number} Score from 0 to 100 (0 means disqualified)
     */
    static scoreCandidate(track, candidate) {
        const cleanTrackTitle = this.normalize(this.cleanTitle(track.title));
        const cleanCandTitle = this.normalize(this.cleanTitle(candidate.trackName || candidate.name || ''));

        const cleanTrackArtist = this.normalize(track.artist);
        const cleanCandArtist = this.normalize(candidate.artistName || candidate.artist || '');

        let score = 0;

        // Title match
        if (cleanTrackTitle === cleanCandTitle) {
            score += 50;
        } else if (cleanCandTitle.includes(cleanTrackTitle) || cleanTrackTitle.includes(cleanCandTitle)) {
            score += 30;
        } else {
            return 0; // Title mismatch -> disqualify
        }

        // Artist match
        if (cleanTrackArtist === cleanCandArtist) {
            score += 30;
        } else if (cleanCandArtist.includes(cleanTrackArtist) || cleanTrackArtist.includes(cleanCandArtist)) {
            score += 20;
        } else {
            score += 5; // Might be a featured artist or different artist string format
        }

        // Duration check (critical for synced lyrics!)
        if (track.durationSec && candidate.duration) {
            const diff = Math.abs(track.durationSec - candidate.duration);
            if (diff <= 1) {
                score += 20;
            } else if (diff <= 2) {
                score += 10;
            } else if (diff <= 3) {
                score += 5;
            } else {
                // If duration difference is > 3s, heavily penalize or disqualify
                return 0;
            }
        } else {
            score += 10;
        }

        return score;
    }
}

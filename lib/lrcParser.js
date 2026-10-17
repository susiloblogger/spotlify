/**
 * LrcParser
 * Parses standard LRC strings into sorted timestamped line objects.
 */

export class LrcParser {
    /**
     * Parses an LRC string.
     * @param {string} lrcContent
     * @returns {Array<{ time: number, text: string }>} Array sorted by time in milliseconds
     */
    static parse(lrcContent) {
        if (!lrcContent || typeof lrcContent !== 'string') {
            return [];
        }

        const lines = lrcContent.split(/\r?\n/);
        const result = [];
        let globalOffsetMs = 0;

        const timeTagRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
        const offsetRegex = /\[offset:\s*([+-]?\d+)\s*\]/i;

        for (const rawLine of lines) {
            const trimmed = rawLine.trim();
            if (!trimmed) continue;

            // Check for [offset:+/-ms] tag
            const offsetMatch = trimmed.match(offsetRegex);
            if (offsetMatch) {
                globalOffsetMs = parseInt(offsetMatch[1], 10) || 0;
                continue;
            }

            // Ignore standard metadata header tags [ti:], [ar:], [al:], etc.
            if (/^\[[a-z]{2,8}:.*\]$/i.test(trimmed)) {
                continue;
            }

            // Extract all timestamps from this line
            const timestamps = [];
            let match;
            timeTagRegex.lastIndex = 0;
            while ((match = timeTagRegex.exec(trimmed)) !== null) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseInt(match[2], 10);
                let fraction = match[3] || '0';

                // Normalize fraction to milliseconds
                if (fraction.length === 2) {
                    fraction = fraction + '0'; // 12 -> 120ms
                } else if (fraction.length > 3) {
                    fraction = fraction.slice(0, 3);
                }
                const ms = parseInt(fraction, 10);
                const totalMs = (minutes * 60 * 1000) + (seconds * 1000) + ms;
                timestamps.push(totalMs);
            }

            if (timestamps.length === 0) {
                continue;
            }

            // Remove all time tags to get lyric text
            let lyricText = trimmed.replace(timeTagRegex, '').trim();

            // If line is empty, treat as instrumental interlude
            if (!lyricText) {
                lyricText = '♪';
            }

            for (const timeMs of timestamps) {
                result.push({
                    time: Math.max(0, timeMs + globalOffsetMs),
                    text: lyricText,
                });
            }
        }

        // Sort lines chronologically
        result.sort((a, b) => a.time - b.time);

        return result;
    }
}

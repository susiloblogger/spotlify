import GLib from 'gi://GLib';

/**
 * Tracks and interpolates playback position using local monotonic time.
 */
export class PositionTracker {
    constructor() {
        this._basePositionMs = 0;
        this._baseTimeUs = 0;
        this._isPlaying = false;
        this._userOffsetMs = 0;
    }

    setUserOffset(offsetMs) {
        this._userOffsetMs = offsetMs || 0;
    }

    setPosition(positionMs) {
        this._basePositionMs = Math.max(0, positionMs);
        this._baseTimeUs = GLib.get_monotonic_time();
    }

    setPlaybackStatus(status, positionMs = null) {
        if (positionMs !== null) {
            this.setPosition(positionMs);
        }

        const nowPlaying = (status === 'Playing');
        if (nowPlaying && !this._isPlaying) {
            // Transitioning from pause to play: update monotonic anchor
            this._baseTimeUs = GLib.get_monotonic_time();
        } else if (!nowPlaying && this._isPlaying) {
            // Transitioning to pause: freeze current elapsed position
            this._basePositionMs = this.getPositionMs() - this._userOffsetMs;
        }

        this._isPlaying = nowPlaying;
    }

    getPositionMs() {
        let pos = this._basePositionMs;
        if (this._isPlaying && this._baseTimeUs > 0) {
            const nowUs = GLib.get_monotonic_time();
            const elapsedMs = Math.floor((nowUs - this._baseTimeUs) / 1000);
            pos += Math.max(0, elapsedMs);
        }
        return Math.max(0, pos + this._userOffsetMs);
    }

    /**
     * Checks if actual D-Bus position drifted significantly from interpolated time.
     * @param {number} actualPositionMs
     * @param {number} thresholdMs
     * @returns {boolean} true if drift/seek was detected and resynced
     */
    checkDrift(actualPositionMs, thresholdMs = 500) {
        const calculated = this.getPositionMs() - this._userOffsetMs;
        const diff = Math.abs(actualPositionMs - calculated);

        if (diff > thresholdMs) {
            this.setPosition(actualPositionMs);
            return true;
        }
        return false;
    }

    reset() {
        this._basePositionMs = 0;
        this._baseTimeUs = 0;
        this._isPlaying = false;
    }
}

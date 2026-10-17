import GLib from 'gi://GLib';

/**
 * Event-based synchronization engine for scheduling lyric line changes.
 */
export class SyncEngine {
    constructor() {
        this._lines = [];
        this._currentIndex = -1;
        this._timeoutId = null;
        this._isPlaying = false;
        this._positionGetter = null;

        // Callback: ({ prevText, currentText, nextText, index }) => void
        this.onLineChanged = null;
    }

    setPositionGetter(getterFn) {
        this._positionGetter = getterFn;
    }

    setLyrics(lines = []) {
        this._stopTimer();
        this._lines = lines || [];
        this._currentIndex = -1;
        this.update();
    }

    setPlaybackStatus(status) {
        this._isPlaying = (status === 'Playing');
        if (this._isPlaying) {
            this.update();
        } else {
            this._stopTimer();
        }
    }

    /**
     * Binary search to find the active line index for a given position.
     * @param {number} positionMs
     * @returns {number}
     */
    findActiveIndex(positionMs) {
        if (!this._lines || this._lines.length === 0) return -1;
        if (positionMs < this._lines[0].time) return -1;

        let low = 0;
        let high = this._lines.length - 1;
        let result = 0;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this._lines[mid].time <= positionMs) {
                result = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return result;
    }

    /**
     * Updates current active line and schedules next line transition.
     */
    update() {
        this._stopTimer();

        if (!this._lines || this._lines.length === 0 || !this._positionGetter) {
            return;
        }

        const currentPosMs = this._positionGetter();
        const newIndex = this.findActiveIndex(currentPosMs);

        if (newIndex !== this._currentIndex) {
            this._currentIndex = newIndex;
            this._notifyLineChanged();
        }

        if (this._isPlaying) {
            this._scheduleNext(currentPosMs);
        }
    }

    _notifyLineChanged() {
        if (!this.onLineChanged) return;

        let prevText = '';
        let currentText = '';
        let nextText = '';
        let nextNextText = '';

        if (this._currentIndex >= 0 && this._currentIndex < this._lines.length) {
            currentText = this._lines[this._currentIndex].text;
            if (this._currentIndex > 0) {
                prevText = this._lines[this._currentIndex - 1].text;
            }
            if (this._currentIndex + 1 < this._lines.length) {
                nextText = this._lines[this._currentIndex + 1].text;
            }
            if (this._currentIndex + 2 < this._lines.length) {
                nextNextText = this._lines[this._currentIndex + 2].text;
            }
        } else if (this._currentIndex === -1 && this._lines.length > 0) {
            // Before first line (intro)
            currentText = '♪';
            nextText = this._lines[0].text;
            if (this._lines.length > 1) {
                nextNextText = this._lines[1].text;
            }
        }

        this.onLineChanged({
            prevText,
            currentText,
            nextText,
            nextNextText,
            index: this._currentIndex,
        });
    }

    _scheduleNext(currentPosMs) {
        const nextIndex = this._currentIndex + 1;
        if (nextIndex >= this._lines.length) {
            // Reached last line of the song
            return;
        }

        const nextLineTimeMs = this._lines[nextIndex].time;
        const delayMs = Math.max(10, nextLineTimeMs - currentPosMs);

        this._timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._timeoutId = null;
            this.update();
            return GLib.SOURCE_REMOVE;
        });
    }

    _stopTimer() {
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = null;
        }
    }

    destroy() {
        this._stopTimer();
        this._lines = [];
        this._currentIndex = -1;
        this._positionGetter = null;
        this.onLineChanged = null;
    }
}

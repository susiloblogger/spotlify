import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Pango from 'gi://Pango';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { CoverArtLoader } from './coverArtLoader.js';
import { StyleBuilder } from './styleBuilder.js';

export class OsdWidget {
    constructor(settings) {
        this._settings = settings;
        this._coverArtLoader = new CoverArtLoader();
        this._trackInfo = null;
        this._isVisible = true;
        this._hasLyrics = false;
        this._isPaused = true;
        this._isFullscreen = false;
        this._currentText = '';

        this._resolveAssetPaths();
        this._createUI();
        this._connectSignals();
        this.updateStyle();
        this.updatePosition();
    }

    _resolveAssetPaths() {
        try {
            const thisFile = Gio.File.new_for_uri(import.meta.url);
            const rootDir = thisFile.get_parent().get_parent();
            this._vinylSvgPath = rootDir.get_child('assets').get_child('vinyl.svg').get_path();
        } catch (e) {
            this._vinylSvgPath = null;
        }
    }

    _createUI() {
        // Main horizontal OSD card with subtle xs shadow
        this.actor = new St.BoxLayout({
            name: 'SpotlifyOsdCard',
            style_class: 'spotlify-osd-card',
            vertical: false,
            reactive: false,
            can_focus: false,
            track_hover: false,
            visible: false,
        });
        this._box = this.actor;

        // ==================== LEFT PANE (Album Art Thumbnail) ====================
        this._leftPane = new St.Bin({
            name: 'SpotlifyLeftPane',
            style_class: 'spotlify-left-pane',
            x_expand: false,
            y_expand: false,
            x_align: Clutter.ActorAlign.CENTER,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._leftPane);
        this._artContainer = this._leftPane;

        this._artIcon = new St.Icon({
            name: 'SpotlifyArtIcon',
            style_class: 'spotlify-cover-art spotlify-art-cover',
            icon_size: 80,
        });
        this._leftPane.set_child(this._artIcon);
        this._setDefaultArt();

        // ==================== RIGHT PANE (Header + Synchronized Lyrics) ====================
        this._rightPane = new St.BoxLayout({
            name: 'SpotlifyRightPane',
            style_class: 'spotlify-right-pane',
            vertical: true,
            x_expand: true,
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.actor.add_child(this._rightPane);

        // Header Row: [NOW PLAYING] • Track Title — Artist
        this._headerBox = new St.BoxLayout({
            name: 'SpotlifyHeaderBox',
            style_class: 'spotlify-header-box',
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._rightPane.add_child(this._headerBox);

        this._nowPlayingLabel = new St.Label({
            name: 'SpotlifyNowPlayingLabel',
            style_class: 'spotlify-meta-now-playing',
            text: 'NOW PLAYING',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._headerBox.add_child(this._nowPlayingLabel);

        this._dotLabel = new St.Label({
            name: 'SpotlifyDotLabel',
            style_class: 'spotlify-meta-dot',
            text: '•',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._headerBox.add_child(this._dotLabel);

        this._titleLabel = new St.Label({
            name: 'SpotlifyTitleLabel',
            style_class: 'spotlify-meta-title',
            text: 'Spotlify',
            y_align: Clutter.ActorAlign.CENTER,
        });
        if (this._titleLabel.clutter_text) {
            this._titleLabel.clutter_text.set_line_wrap(false);
            this._titleLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        }
        this._headerBox.add_child(this._titleLabel);

        this._sepLabel = new St.Label({
            name: 'SpotlifySepLabel',
            style_class: 'spotlify-meta-sep',
            text: '—',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._headerBox.add_child(this._sepLabel);

        this._artistLabel = new St.Label({
            name: 'SpotlifyArtistLabel',
            style_class: 'spotlify-meta-artist',
            text: 'Waiting for music...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        if (this._artistLabel.clutter_text) {
            this._artistLabel.clutter_text.set_line_wrap(false);
            this._artistLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        }
        this._headerBox.add_child(this._artistLabel);

        // Lyrics Body
        this._lyricsBody = new St.BoxLayout({
            name: 'SpotlifyLyricsBody',
            style_class: 'spotlify-lyrics-body',
            vertical: true,
            x_expand: true,
        });
        this._rightPane.add_child(this._lyricsBody);

        // Active Line Row with Left Green Accent Bar
        this._activeRow = new St.BoxLayout({
            name: 'SpotlifyActiveRow',
            style_class: 'spotlify-active-row',
            vertical: false,
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._lyricsBody.add_child(this._activeRow);

        this._accentBar = new St.Bin({
            name: 'SpotlifyAccentBar',
            style_class: 'spotlify-accent-bar',
            y_align: Clutter.ActorAlign.FILL,
        });
        this._activeRow.add_child(this._accentBar);

        this._activeLabel = new St.Label({
            name: 'SpotlifyActiveLyric',
            style_class: 'spotlify-lyric-line spotlify-lyric-active',
            text: '',
            x_expand: true,
        });
        if (this._activeLabel.clutter_text) {
            this._activeLabel.clutter_text.set_line_wrap(true);
            this._activeLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        }
        this._activeRow.add_child(this._activeLabel);

        // Upcoming Lines Container
        this._upcomingBox = new St.BoxLayout({
            name: 'SpotlifyUpcomingBox',
            style_class: 'spotlify-upcoming-box',
            vertical: true,
            x_expand: true,
        });
        this._lyricsBody.add_child(this._upcomingBox);

        this._nextLabel = new St.Label({
            name: 'SpotlifyNextLyric',
            style_class: 'spotlify-lyric-line spotlify-lyric-next',
            text: '',
            x_expand: true,
        });
        if (this._nextLabel.clutter_text) {
            this._nextLabel.clutter_text.set_line_wrap(true);
            this._nextLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        }
        this._upcomingBox.add_child(this._nextLabel);

        this._nextNextLabel = new St.Label({
            name: 'SpotlifyNextNextLyric',
            style_class: 'spotlify-lyric-line spotlify-lyric-next-next',
            text: '',
            x_expand: true,
        });
        if (this._nextNextLabel.clutter_text) {
            this._nextNextLabel.clutter_text.set_line_wrap(true);
            this._nextNextLabel.clutter_text.set_ellipsize(Pango.EllipsizeMode.END);
        }
        this._upcomingBox.add_child(this._nextNextLabel);

        // Add to Shell layout based on always-on-top setting
        this._updateChromeLayer();
    }

    _setDefaultArt() {
        if (this._vinylSvgPath && GLib.file_test(this._vinylSvgPath, GLib.FileTest.EXISTS)) {
            const file = Gio.File.new_for_path(this._vinylSvgPath);
            this._artIcon.set_gicon(new Gio.FileIcon({ file }));
            this._artIcon.remove_style_class_name('spotlify-art-cover');
            this._artIcon.add_style_class_name('spotlify-art-vinyl');
        } else {
            this._artIcon.set_gicon(new Gio.ThemedIcon({ name: 'audio-x-generic-symbolic' }));
            this._artIcon.remove_style_class_name('spotlify-art-vinyl');
            this._artIcon.add_style_class_name('spotlify-art-cover');
        }
    }

    async _updateCoverArt(artUrl) {
        if (!artUrl) {
            this._setDefaultArt();
            return;
        }

        const localPath = await this._coverArtLoader.loadArtPath(artUrl);
        if (!this._artIcon) return;

        if (localPath && GLib.file_test(localPath, GLib.FileTest.EXISTS)) {
            const file = Gio.File.new_for_path(localPath);
            this._artIcon.set_gicon(new Gio.FileIcon({ file }));
            this._artIcon.remove_style_class_name('spotlify-art-vinyl');
            this._artIcon.add_style_class_name('spotlify-art-cover');
        } else {
            this._setDefaultArt();
        }
    }

    /**
     * Sets current track metadata and updates left pane.
     * @param {Object} trackInfo
     */
    setTrackInfo(trackInfo) {
        if (!trackInfo) return;
        this._trackInfo = trackInfo;

        const isIdle = !trackInfo.title || trackInfo.title === 'Spotlify';
        if (isIdle) {
            this._nowPlayingLabel.set_text('SPOTLIFY');
            this._dotLabel.visible = false;
            this._titleLabel.visible = false;
            this._sepLabel.visible = false;
            this._artistLabel.set_text(trackInfo.artist || 'Waiting for music...');
        } else {
            this._nowPlayingLabel.set_text('NOW PLAYING');
            this._dotLabel.visible = true;
            this._titleLabel.visible = true;
            this._sepLabel.visible = true;
            this._titleLabel.set_text(trackInfo.title);
            this._artistLabel.set_text(trackInfo.artist || 'Unknown Artist');
        }

        this._updateCoverArt(trackInfo.artUrl);
        this.updatePosition();
    }

    _updateChromeLayer() {
        if (!this.actor) return;
        const alwaysOnTop = this._settings.get_boolean('always-on-top');

        try {
            Main.layoutManager.removeChrome(this.actor);
        } catch (e) {
            // Ignore
        }

        if (alwaysOnTop) {
            Main.layoutManager.addTopChrome(this.actor, {
                trackFullscreen: true,
            });
        } else {
            Main.layoutManager.addChrome(this.actor, {
                trackFullscreen: true,
            });
        }
    }

    _connectSignals() {
        this._signalIds = [];

        // Watch monitor configuration changes
        const monitorsChangedId = Main.layoutManager.connect('monitors-changed', () => {
            this.updatePosition();
        });
        this._signalIds.push({ target: Main.layoutManager, id: monitorsChangedId });

        // Watch settings changes that affect styling or positioning
        const styleKeys = [
            'display-mode', 'font-family', 'font-size', 'font-bold',
            'text-shadow', 'text-align', 'active-color', 'inactive-color',
            'gradient-direction', 'gradient-start', 'gradient-end',
            'border-radius', 'padding', 'max-width',
        ];

        for (const key of styleKeys) {
            const id = this._settings.connect(`changed::${key}`, () => {
                this.updateStyle();
                this.updatePosition();
            });
            this._signalIds.push({ target: this._settings, id });
        }

        const positionKeys = ['position-preset', 'offset-x', 'offset-y', 'monitor-index'];
        for (const key of positionKeys) {
            const id = this._settings.connect(`changed::${key}`, () => {
                this.updatePosition();
            });
            this._signalIds.push({ target: this._settings, id });
        }

        const visibilityKeys = ['osd-visible', 'hide-when-paused', 'hide-when-no-lyrics', 'hide-in-fullscreen'];
        for (const key of visibilityKeys) {
            const id = this._settings.connect(`changed::${key}`, () => {
                this._evaluateVisibility();
            });
            this._signalIds.push({ target: this._settings, id });
        }

        const alwaysOnTopId = this._settings.connect('changed::always-on-top', () => {
            this._updateChromeLayer();
        });
        this._signalIds.push({ target: this._settings, id: alwaysOnTopId });

        // Relayout when box allocation changes
        const notifyAllocationId = this._box.connect('notify::allocation', () => {
            this.updatePosition();
        });
        this._signalIds.push({ target: this._box, id: notifyAllocationId });
    }

    updateStyle() {
        if (!this.actor || !this._box) return;

        // Apply box gradient and border styles
        const boxStyle = StyleBuilder.buildBoxStyle(this._settings);
        this._box.set_style(boxStyle);

        // Apply label styles
        const activeStyle = StyleBuilder.buildLabelStyle(this._settings, 'active');
        const nextStyle = StyleBuilder.buildLabelStyle(this._settings, 'next');
        const nextNextStyle = StyleBuilder.buildLabelStyle(this._settings, 'nextNext');

        this._activeLabel.set_style(activeStyle);
        this._nextLabel.set_style(nextStyle);
        this._nextNextLabel.set_style(nextNextStyle);

        // Handle alignment & accent bar
        const textAlign = this._settings.get_string('text-align') || 'center';
        if (textAlign === 'left') {
            if (this._headerBox) this._headerBox.x_align = Clutter.ActorAlign.START;
            if (this._accentBar) this._accentBar.visible = true;
            if (this._upcomingBox) this._upcomingBox.add_style_class_name('spotlify-upcoming-indented');
        } else if (textAlign === 'right') {
            if (this._headerBox) this._headerBox.x_align = Clutter.ActorAlign.END;
            if (this._accentBar) this._accentBar.visible = false;
            if (this._upcomingBox) this._upcomingBox.remove_style_class_name('spotlify-upcoming-indented');
        } else {
            // center
            if (this._headerBox) this._headerBox.x_align = Clutter.ActorAlign.CENTER;
            if (this._accentBar) this._accentBar.visible = false;
            if (this._upcomingBox) this._upcomingBox.remove_style_class_name('spotlify-upcoming-indented');
        }

        // Apply text shadow
        const useShadow = this._settings.get_boolean('text-shadow');
        for (const label of [this._activeLabel, this._nextLabel, this._nextNextLabel]) {
            if (useShadow) {
                label.add_style_class_name('spotlify-text-shadow');
            } else {
                label.remove_style_class_name('spotlify-text-shadow');
            }
        }

        this._updateDisplayMode();
    }

    _updateDisplayMode() {
        const mode = this._settings.get_string('display-mode') || 'triple';
        if (mode === 'single') {
            this._activeRow.visible = true;
            this._upcomingBox.visible = false;
        } else if (mode === 'double') {
            this._activeRow.visible = true;
            this._upcomingBox.visible = true;
            this._nextLabel.visible = true;
            this._nextNextLabel.visible = false;
        } else {
            // triple
            this._activeRow.visible = true;
            this._upcomingBox.visible = true;
            this._nextLabel.visible = true;
            this._nextNextLabel.visible = true;
        }
    }

    updatePosition() {
        if (!this.actor || !this._box) return;

        const monitors = Main.layoutManager.monitors;
        if (!monitors || monitors.length === 0) return;

        const monitorIdx = this._settings.get_int('monitor-index');
        let monitor;
        if (monitorIdx >= 0 && monitorIdx < monitors.length) {
            monitor = monitors[monitorIdx];
        } else {
            monitor = Main.layoutManager.primaryMonitor || monitors[0];
        }

        const preset = this._settings.get_string('position-preset') || 'bottom-center';
        const offsetX = this._settings.get_int('offset-x') || 0;
        const offsetY = this._settings.get_int('offset-y') || 0;

        const [minWidth, natWidth] = this.actor.get_preferred_width(-1);
        const [minHeight, natHeight] = this.actor.get_preferred_height(natWidth);

        const maxWidth = this._settings.get_int('max-width') || 750;
        const width = Math.min(maxWidth, Math.max(minWidth, natWidth, 460));
        const height = Math.max(minHeight, natHeight, 92);

        const [curWidth, curHeight] = this.actor.get_size();
        if (curWidth !== width || curHeight !== height) {
            this.actor.set_size(width, height);
        }

        let anchorX = monitor.x;
        let anchorY = monitor.y;

        switch (preset) {
            case 'top-left':
                anchorX = monitor.x + 20;
                anchorY = monitor.y + 40;
                break;
            case 'top-center':
                anchorX = monitor.x + Math.floor((monitor.width - width) / 2);
                anchorY = monitor.y + 40;
                break;
            case 'top-right':
                anchorX = monitor.x + monitor.width - width - 20;
                anchorY = monitor.y + 40;
                break;
            case 'middle-left':
                anchorX = monitor.x + 20;
                anchorY = monitor.y + Math.floor((monitor.height - height) / 2);
                break;
            case 'center':
                anchorX = monitor.x + Math.floor((monitor.width - width) / 2);
                anchorY = monitor.y + Math.floor((monitor.height - height) / 2);
                break;
            case 'middle-right':
                anchorX = monitor.x + monitor.width - width - 20;
                anchorY = monitor.y + Math.floor((monitor.height - height) / 2);
                break;
            case 'bottom-left':
                anchorX = monitor.x + 20;
                anchorY = monitor.y + monitor.height - height - 20;
                break;
            case 'bottom-center':
                anchorX = monitor.x + Math.floor((monitor.width - width) / 2);
                anchorY = monitor.y + monitor.height - height - 20;
                break;
            case 'bottom-right':
                anchorX = monitor.x + monitor.width - width - 20;
                anchorY = monitor.y + monitor.height - height - 20;
                break;
            case 'custom':
            default:
                anchorX = monitor.x + Math.floor((monitor.width - width) / 2);
                anchorY = monitor.y + monitor.height - height - 20;
                break;
        }

        const finalX = anchorX + offsetX;
        const finalY = anchorY + offsetY;

        const targetX = Math.round(finalX);
        const targetY = Math.round(finalY);
        const [curX, curY] = this.actor.get_position();
        if (curX !== targetX || curY !== targetY) {
            this.actor.set_position(targetX, targetY);
        }
    }

    /**
     * Sets the active and upcoming lines of lyrics.
     * @param {string} prevText
     * @param {string} currentText
     * @param {string} nextText
     * @param {string} nextNextText
     */
    setLyrics(prevText = '', currentText = '', nextText = '', nextNextText = '') {
        this._hasLyrics = Boolean(currentText || nextText || nextNextText);

        const duration = this._settings.get_int('animation-duration') || 250;

        if (this._currentText !== currentText && duration > 0 && this.actor.visible) {
            // Smooth transition animation on line changes
            this._activeLabel.ease({
                opacity: 80,
                duration: Math.round(duration / 2),
                mode: Clutter.AnimationMode.EASE_OUT_QUAD,
                onComplete: () => {
                    this._activeLabel.set_text(currentText);
                    this._nextLabel.set_text(nextText);
                    this._nextNextLabel.set_text(nextNextText);
                    this._currentText = currentText;

                    this._activeLabel.ease({
                        opacity: 255,
                        duration: Math.round(duration / 2),
                        mode: Clutter.AnimationMode.EASE_IN_QUAD,
                    });
                },
            });
        } else {
            this._activeLabel.set_text(currentText);
            this._nextLabel.set_text(nextText);
            this._nextNextLabel.set_text(nextNextText);
            this._currentText = currentText;
            this._activeLabel.opacity = 255;
        }

        this._evaluateVisibility();
        this.updatePosition();
    }

    setPlaybackStatus(status) {
        this._isPaused = (status !== 'Playing');
        this._evaluateVisibility();
    }

    setFullscreen(isFullscreen) {
        this._isFullscreen = isFullscreen;
        this._evaluateVisibility();
    }

    _evaluateVisibility() {
        if (!this.actor) return;

        const userVisible = this._settings.get_boolean('osd-visible');
        const hideWhenPaused = this._settings.get_boolean('hide-when-paused');
        const hideWhenNoLyrics = this._settings.get_boolean('hide-when-no-lyrics');
        const hideInFullscreen = this._settings.get_boolean('hide-in-fullscreen');

        if (!userVisible) {
            this.actor.visible = false;
            return;
        }

        if (hideWhenPaused && this._isPaused) {
            this.actor.visible = false;
            return;
        }

        if (hideWhenNoLyrics && !this._hasLyrics) {
            this.actor.visible = false;
            return;
        }

        if (hideInFullscreen && this._isFullscreen) {
            this.actor.visible = false;
            return;
        }

        this.actor.visible = true;
    }

    destroy() {
        // Disconnect all registered signal listeners
        for (const item of this._signalIds) {
            try {
                item.target.disconnect(item.id);
            } catch (e) {
                // Ignore already disconnected signals
            }
        }
        this._signalIds = [];

        if (this._coverArtLoader) {
            this._coverArtLoader.destroy();
            this._coverArtLoader = null;
        }

        // Remove from layout manager and destroy actors
        if (this.actor) {
            try {
                Main.layoutManager.removeChrome(this.actor);
            } catch (e) {
                // Ignore if not present
            }
            this.actor.destroy();
            this.actor = null;
        }

        this._box = null;
        this._leftPane = null;
        this._rightPane = null;
        this._artContainer = null;
        this._artIcon = null;
        this._headerBox = null;
        this._nowPlayingLabel = null;
        this._dotLabel = null;
        this._titleLabel = null;
        this._sepLabel = null;
        this._artistLabel = null;
        this._metaBox = null;
        this._lyricsHeaderLabel = null;
        this._lyricsBody = null;
        this._activeRow = null;
        this._accentBar = null;
        this._activeLabel = null;
        this._upcomingBox = null;
        this._nextLabel = null;
        this._nextNextLabel = null;
        this._settings = null;
    }
}

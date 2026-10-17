import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

export const SpotlifyIndicator = GObject.registerClass(
class SpotlifyIndicator extends PanelMenu.Button {
    _init(settings, onOpenPrefs, onExit) {
        super._init(0.0, 'Spotlify');

        this._settings = settings;
        this._onOpenPrefs = onOpenPrefs;
        this._onExit = onExit;

        const box = new St.BoxLayout({
            style_class: 'panel-status-indicators-box spotlify-indicator-box',
        });

        this._icon = new St.Icon({
            icon_name: 'audio-x-generic-symbolic',
            style_class: 'system-status-icon',
        });
        box.add_child(this._icon);
        this.add_child(box);

        this._buildMenu();
    }

    _buildMenu() {
        // Toggle OSD Visibility Switch
        this._visibleSwitch = new PopupMenu.PopupSwitchMenuItem(
            'Show Lyrics OSD',
            this._settings.get_boolean('osd-visible')
        );
        this._visibleSwitch.connect('toggled', (item, state) => {
            this._settings.set_boolean('osd-visible', state);
        });
        this.menu.addMenuItem(this._visibleSwitch);

        // Toggle Always on Top Switch
        this._alwaysOnTopSwitch = new PopupMenu.PopupSwitchMenuItem(
            'Always on Top',
            this._settings.get_boolean('always-on-top')
        );
        this._alwaysOnTopSwitch.connect('toggled', (item, state) => {
            this._settings.set_boolean('always-on-top', state);
        });
        this.menu.addMenuItem(this._alwaysOnTopSwitch);

        // Keep switches synchronized with settings changes
        this._settingsChangeId = this._settings.connect('changed::osd-visible', () => {
            this._visibleSwitch.setToggleState(this._settings.get_boolean('osd-visible'));
        });
        this._alwaysOnTopChangeId = this._settings.connect('changed::always-on-top', () => {
            this._alwaysOnTopSwitch.setToggleState(this._settings.get_boolean('always-on-top'));
        });

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Quick Sync Offset Submenu
        this._offsetSection = new PopupMenu.PopupSubMenuMenuItem('Lyrics Sync Offset');

        const offsetMinus = new PopupMenu.PopupMenuItem('Advance -250 ms');
        offsetMinus.connect('activate', () => {
            const cur = this._settings.get_int('sync-offset');
            this._settings.set_int('sync-offset', cur - 250);
        });
        this._offsetSection.menu.addMenuItem(offsetMinus);

        const offsetPlus = new PopupMenu.PopupMenuItem('Delay +250 ms');
        offsetPlus.connect('activate', () => {
            const cur = this._settings.get_int('sync-offset');
            this._settings.set_int('sync-offset', cur + 250);
        });
        this._offsetSection.menu.addMenuItem(offsetPlus);

        const offsetReset = new PopupMenu.PopupMenuItem('Reset Offset (0 ms)');
        offsetReset.connect('activate', () => {
            this._settings.set_int('sync-offset', 0);
        });
        this._offsetSection.menu.addMenuItem(offsetReset);

        this.menu.addMenuItem(this._offsetSection);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Open Preferences
        const prefsItem = new PopupMenu.PopupMenuItem('Spotlify Settings...');
        prefsItem.connect('activate', () => {
            if (this._onOpenPrefs) {
                this._onOpenPrefs();
            }
        });
        this.menu.addMenuItem(prefsItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        // Exit Spotlify
        const exitItem = new PopupMenu.PopupMenuItem('Exit');
        exitItem.connect('activate', () => {
            if (this._onExit) {
                this._onExit();
            }
        });
        this.menu.addMenuItem(exitItem);
    }

    setTrack(_title, _artist) {
        // Track title header in menu removed per user preference
    }

    destroy() {
        if (this._settingsChangeId && this._settings) {
            try { this._settings.disconnect(this._settingsChangeId); } catch (e) {}
            this._settingsChangeId = null;
        }
        if (this._alwaysOnTopChangeId && this._settings) {
            try { this._settings.disconnect(this._alwaysOnTopChangeId); } catch (e) {}
            this._alwaysOnTopChangeId = null;
        }
        this._settings = null;
        this._onOpenPrefs = null;
        this._onExit = null;
        super.destroy();
    }
});

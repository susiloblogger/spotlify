import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export const EXTENSION_UUID = 'spotlify@jenova';
export const AUTOSTART_DESKTOP_FILENAME = 'spotlify.desktop';

export class AutostartManager {
    static _overridePath = null;

    static setOverridePath(path) {
        this._overridePath = path;
    }

    static getAutostartDir() {
        if (this._overridePath) {
            return GLib.path_get_dirname(this._overridePath);
        }
        return GLib.build_filenamev([GLib.get_user_config_dir(), 'autostart']);
    }

    static getAutostartFilePath() {
        if (this._overridePath) {
            return this._overridePath;
        }
        return GLib.build_filenamev([this.getAutostartDir(), AUTOSTART_DESKTOP_FILENAME]);
    }

    static generateDesktopEntry() {
        return [
            '[Desktop Entry]',
            'Type=Application',
            'Name=Spotlify',
            'Comment=Realtime Synced Spotify Lyrics for GNOME Shell',
            `Exec=gnome-extensions enable ${EXTENSION_UUID}`,
            'Hidden=false',
            'NoDisplay=false',
            'X-GNOME-Autostart-enabled=true',
            '',
        ].join('\n');
    }

    static isAutostartEnabled() {
        try {
            const file = Gio.File.new_for_path(this.getAutostartFilePath());
            if (!file.query_exists(null)) {
                return false;
            }
            const [ok, contents] = file.load_contents(null);
            if (!ok) {
                return false;
            }
            const text = new TextDecoder('utf-8').decode(contents);
            if (text.includes('X-GNOME-Autostart-enabled=false')) {
                return false;
            }
            return true;
        } catch (e) {
            console.error(`[Spotlify] Error checking autostart status: ${e.message}`);
            return false;
        }
    }

    static setAutostart(enabled) {
        try {
            const filePath = this.getAutostartFilePath();
            const file = Gio.File.new_for_path(filePath);

            if (enabled) {
                const autostartDir = this.getAutostartDir();
                GLib.mkdir_with_parents(autostartDir, 0o755);

                const desktopContent = this.generateDesktopEntry();
                const bytes = new GLib.Bytes(new TextEncoder().encode(desktopContent));
                file.replace_contents_bytes_async(
                    bytes,
                    null,
                    false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                    null,
                    (source, res) => {
                        try {
                            source.replace_contents_finish(res);
                        } catch (err) {
                            console.error(`[Spotlify] Failed to write autostart file: ${err.message}`);
                        }
                    }
                );
            } else {
                if (file.query_exists(null)) {
                    file.delete_async(GLib.PRIORITY_DEFAULT, null, (source, res) => {
                        try {
                            source.delete_finish(res);
                        } catch (err) {
                            console.error(`[Spotlify] Failed to remove autostart file: ${err.message}`);
                        }
                    });
                }
            }
        } catch (e) {
            console.error(`[Spotlify] Failed to set autostart: ${e.message}`);
        }
    }

    static setAutostartSync(enabled) {
        try {
            const filePath = this.getAutostartFilePath();
            const file = Gio.File.new_for_path(filePath);

            if (enabled) {
                const autostartDir = this.getAutostartDir();
                GLib.mkdir_with_parents(autostartDir, 0o755);

                const desktopContent = this.generateDesktopEntry();
                file.replace_contents(
                    new TextEncoder().encode(desktopContent),
                    null,
                    false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                    null
                );
            } else {
                if (file.query_exists(null)) {
                    file.delete(null);
                }
            }
            return true;
        } catch (e) {
            console.error(`[Spotlify] Failed to set autostart sync: ${e.message}`);
            return false;
        }
    }

    static syncWithSettings(settings) {
        if (!settings) return;
        const shouldAutostart = settings.get_boolean('autostart-on-login');
        this.setAutostart(shouldAutostart);
    }
}

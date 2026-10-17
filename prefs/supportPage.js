import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

export class SupportPage {
    static _createLinkRow(title, subtitle, url, iconName = 'applications-internet-symbolic') {
        const row = new Adw.ActionRow({
            title: title,
            subtitle: subtitle || url,
        });

        const btn = new Gtk.Button({
            icon_name: iconName,
            valign: Gtk.Align.CENTER,
            tooltip_text: `Open ${url}`,
        });

        btn.connect('clicked', () => {
            const launcher = new Gtk.UriLauncher({ uri: url });
            launcher.launch(null, null, null);
        });

        row.add_suffix(btn);
        row.set_activatable_widget(btn);
        return row;
    }

    static build(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Support & About',
            icon_name: 'help-about-symbolic',
        });

        // Group 1: Donations & Support
        const donateGroup = new Adw.PreferencesGroup({
            title: 'Support the Developer ❤',
            description: 'If you enjoy using Spotlify, consider supporting the continuation of this project:',
        });

        donateGroup.add(this._createLinkRow('Saweria', 'Support via QRIS / GoPay / OVO / DANA', 'https://saweria.co/susiloblogger', 'starred-symbolic'));
        donateGroup.add(this._createLinkRow('Ko-fi', 'Support via Ko-fi', 'https://ko-fi.com/susiloblogger', 'starred-symbolic'));
        donateGroup.add(this._createLinkRow('GitHub Sponsors', 'Sponsor the developer on GitHub', 'https://github.com/sponsors/susiloblogger', 'starred-symbolic'));

        page.add(donateGroup);

        // Group 2: Project Information
        const aboutGroup = new Adw.PreferencesGroup({
            title: 'Project Information',
        });

        const versionRow = new Adw.ActionRow({
            title: 'Extension Version',
            subtitle: 'Spotlify v1.0.0 (GPL-2.0-or-later License)',
        });
        aboutGroup.add(versionRow);

        aboutGroup.add(this._createLinkRow('GitHub Repository', 'https://github.com/susiloblogger/spotlify', 'https://github.com/susiloblogger/spotlify'));
        aboutGroup.add(this._createLinkRow('Report an Issue / Bug', 'Open an issue on GitHub', 'https://github.com/jenova/spotlify/issues'));

        page.add(aboutGroup);

        // Group 3: Data Sources & Attribution
        const sourceGroup = new Adw.PreferencesGroup({
            title: 'Lyric Providers',
            description: 'Synchronized lyrics are retrieved legally from public APIs:',
        });

        sourceGroup.add(this._createLinkRow('LRCLIB', 'Community-driven open synchronized lyrics provider', 'https://lrclib.net'));
        sourceGroup.add(this._createLinkRow('NetEase Cloud Music', 'International fallback lyrics provider', 'https://music.163.com'));

        page.add(sourceGroup);

        // Group 4: Maintenance
        const cacheGroup = new Adw.PreferencesGroup({
            title: 'Maintenance',
        });

        const clearCacheRow = new Adw.ActionRow({
            title: 'Clear Local Lyrics Cache',
            subtitle: 'Delete all cached lyrics stored in ~/.cache/spotlify/',
        });

        const clearBtn = new Gtk.Button({
            label: 'Clear Cache',
            valign: Gtk.Align.CENTER,
        });

        clearBtn.connect('clicked', () => {
            try {
                const cacheDir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'spotlify']);
                const dir = Gio.File.new_for_path(cacheDir);
                if (dir.query_exists(null)) {
                    const enumerator = dir.enumerate_children('standard::name', Gio.FileQueryInfoFlags.NONE, null);
                    let info;
                    while ((info = enumerator.next_file(null)) !== null) {
                        const child = dir.get_child(info.get_name());
                        child.delete(null);
                    }
                }
                clearBtn.set_label('Cleared!');
                clearBtn.set_sensitive(false);
            } catch (e) {
                console.error(`[Spotlify] Error clearing cache: ${e.message}`);
            }
        });

        clearCacheRow.add_suffix(clearBtn);
        clearCacheRow.set_activatable_widget(clearBtn);
        cacheGroup.add(clearCacheRow);

        page.add(cacheGroup);
        return page;
    }
}

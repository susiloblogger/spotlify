import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';

export class BehaviorPage {
    static build(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Behavior',
            icon_name: 'emblem-system-symbolic',
        });

        // Group 1: Sync & Lyrics Sources
        const syncGroup = new Adw.PreferencesGroup({
            title: 'Synchronization & Sources',
        });

        const offsetRow = new Adw.SpinRow({
            title: 'Global Sync Offset',
            subtitle: 'Adjust lyric timing in milliseconds (+ advance / - delay)',
            adjustment: new Gtk.Adjustment({
                lower: -5000,
                upper: 5000,
                step_increment: 50,
                page_increment: 250,
                value: settings.get_int('sync-offset'),
            }),
        });
        offsetRow.connect('notify::value', () => {
            settings.set_int('sync-offset', Math.round(offsetRow.get_value()));
        });
        syncGroup.add(offsetRow);

        const animRow = new Adw.SpinRow({
            title: 'Line Animation Duration (ms)',
            subtitle: 'Transition animation duration between lines (0 to disable)',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 1000,
                step_increment: 50,
                page_increment: 100,
                value: settings.get_int('animation-duration'),
            }),
        });
        animRow.connect('notify::value', () => {
            settings.set_int('animation-duration', Math.round(animRow.get_value()));
        });
        syncGroup.add(animRow);

        const neteaseRow = new Adw.SwitchRow({
            title: 'Enable NetEase Music Fallback',
            subtitle: 'Query NetEase Cloud Music if lyrics are not found on LRCLIB',
            active: settings.get_boolean('enable-netease'),
        });
        neteaseRow.connect('notify::active', () => {
            settings.set_boolean('enable-netease', neteaseRow.get_active());
        });
        syncGroup.add(neteaseRow);

        const unsyncedRow = new Adw.SwitchRow({
            title: 'Show Unsynchronized Lyrics',
            subtitle: 'Display plain lyrics when time-synced (LRC) lyrics are unavailable',
            active: settings.get_boolean('show-unsynced-lyrics'),
        });
        unsyncedRow.connect('notify::active', () => {
            settings.set_boolean('show-unsynced-lyrics', unsyncedRow.get_active());
        });
        syncGroup.add(unsyncedRow);

        page.add(syncGroup);

        // Group 2: Automatic Visibility
        const autoGroup = new Adw.PreferencesGroup({
            title: 'Automatic Visibility',
        });

        const pauseRow = new Adw.SwitchRow({
            title: 'Hide When Spotify is Paused',
            active: settings.get_boolean('hide-when-paused'),
        });
        pauseRow.connect('notify::active', () => {
            settings.set_boolean('hide-when-paused', pauseRow.get_active());
        });
        autoGroup.add(pauseRow);

        const noLyricsRow = new Adw.SwitchRow({
            title: 'Hide When No Lyrics Found',
            active: settings.get_boolean('hide-when-no-lyrics'),
        });
        noLyricsRow.connect('notify::active', () => {
            settings.set_boolean('hide-when-no-lyrics', noLyricsRow.get_active());
        });
        autoGroup.add(noLyricsRow);

        const fullRow = new Adw.SwitchRow({
            title: 'Hide During Fullscreen Applications',
            active: settings.get_boolean('hide-in-fullscreen'),
        });
        fullRow.connect('notify::active', () => {
            settings.set_boolean('hide-in-fullscreen', fullRow.get_active());
        });
        autoGroup.add(fullRow);

        const indicatorRow = new Adw.SwitchRow({
            title: 'Show Top Bar Status Indicator',
            subtitle: 'Quick access to toggle OSD visibility and adjust timing offset',
            active: settings.get_boolean('show-panel-indicator'),
        });
        indicatorRow.connect('notify::active', () => {
            settings.set_boolean('show-panel-indicator', indicatorRow.get_active());
        });
        autoGroup.add(indicatorRow);

        const alwaysOnTopRow = new Adw.SwitchRow({
            title: 'Always on Top',
            subtitle: 'Keep the OSD overlay floating above all other windows',
            active: settings.get_boolean('always-on-top'),
        });
        alwaysOnTopRow.connect('notify::active', () => {
            settings.set_boolean('always-on-top', alwaysOnTopRow.get_active());
        });
        autoGroup.add(alwaysOnTopRow);

        page.add(autoGroup);
        return page;
    }
}

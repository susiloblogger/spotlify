import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';

export class AppearancePage {
    static build(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Appearance',
            icon_name: 'view-paged-symbolic',
        });

        // Group 1: Display Mode
        const modeGroup = new Adw.PreferencesGroup({
            title: 'Display Mode',
            description: 'Configure the number of lyric lines displayed on the OSD',
        });

        const modeRow = new Adw.ComboRow({
            title: 'Line Count',
            model: Gtk.StringList.new(['1 Line (Active only)', '2 Lines (Active + Next)', '3 Lines (Previous, Active, Next)']),
        });

        const modes = ['single', 'double', 'triple'];
        const currentMode = settings.get_string('display-mode') || 'triple';
        const currentIdx = Math.max(0, modes.indexOf(currentMode));
        modeRow.set_selected(currentIdx !== -1 ? currentIdx : 2);

        modeRow.connect('notify::selected', () => {
            settings.set_string('display-mode', modes[modeRow.get_selected()]);
        });
        modeGroup.add(modeRow);

        const alignRow = new Adw.ComboRow({
            title: 'Text Alignment',
            model: Gtk.StringList.new(['Align Left', 'Align Center', 'Align Right']),
        });
        const aligns = ['left', 'center', 'right'];
        const currentAlign = settings.get_string('text-align') || 'center';
        alignRow.set_selected(Math.max(0, aligns.indexOf(currentAlign)));
        alignRow.connect('notify::selected', () => {
            settings.set_string('text-align', aligns[alignRow.get_selected()]);
        });
        modeGroup.add(alignRow);
        page.add(modeGroup);

        // Group 2: Typography
        const fontGroup = new Adw.PreferencesGroup({
            title: 'Typography & Fonts',
        });

        const fontSizeRow = new Adw.SpinRow({
            title: 'Active Text Size',
            subtitle: 'Font size of the active lyric line (pt)',
            adjustment: new Gtk.Adjustment({
                lower: 8,
                upper: 64,
                step_increment: 1,
                page_increment: 4,
                value: settings.get_int('font-size'),
            }),
        });
        fontSizeRow.connect('notify::value', () => {
            settings.set_int('font-size', Math.round(fontSizeRow.get_value()));
        });
        fontGroup.add(fontSizeRow);

        const fontBoldRow = new Adw.SwitchRow({
            title: 'Bold Active Text',
            active: settings.get_boolean('font-bold'),
        });
        fontBoldRow.connect('notify::active', () => {
            settings.set_boolean('font-bold', fontBoldRow.get_active());
        });
        fontGroup.add(fontBoldRow);

        const textShadowRow = new Adw.SwitchRow({
            title: 'Text Shadow',
            subtitle: 'Improves readability over bright or busy wallpapers',
            active: settings.get_boolean('text-shadow'),
        });
        textShadowRow.connect('notify::active', () => {
            settings.set_boolean('text-shadow', textShadowRow.get_active());
        });
        fontGroup.add(textShadowRow);

        page.add(fontGroup);
        return page;
    }
}

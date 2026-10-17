import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';

export class PositionPage {
    static build(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Position & Layout',
            icon_name: 'view-fullscreen-symbolic',
        });

        const posGroup = new Adw.PreferencesGroup({
            title: 'Screen Placement',
            description: 'Select screen anchor preset and pixel offsets for the OSD overlay',
        });

        const presets = [
            'top-left', 'top-center', 'top-right',
            'middle-left', 'center', 'middle-right',
            'bottom-left', 'bottom-center', 'bottom-right',
            'custom',
        ];

        const presetLabels = [
            'Top Left', 'Top Center', 'Top Right',
            'Middle Left', 'Center', 'Middle Right',
            'Bottom Left', 'Bottom Center (Default)', 'Bottom Right',
            'Custom Position',
        ];

        const presetRow = new Adw.ComboRow({
            title: 'Anchor Preset',
            model: Gtk.StringList.new(presetLabels),
        });

        const currentPreset = settings.get_string('position-preset') || 'bottom-center';
        const currentIdx = Math.max(0, presets.indexOf(currentPreset));
        presetRow.set_selected(currentIdx !== -1 ? currentIdx : 7);

        presetRow.connect('notify::selected', () => {
            settings.set_string('position-preset', presets[presetRow.get_selected()]);
        });
        posGroup.add(presetRow);

        const offsetXRow = new Adw.SpinRow({
            title: 'Horizontal Offset (X)',
            subtitle: 'Shift right (+) or left (-)',
            adjustment: new Gtk.Adjustment({
                lower: -2000,
                upper: 2000,
                step_increment: 10,
                page_increment: 50,
                value: settings.get_int('offset-x'),
            }),
        });
        offsetXRow.connect('notify::value', () => {
            settings.set_int('offset-x', Math.round(offsetXRow.get_value()));
        });
        posGroup.add(offsetXRow);

        const offsetYRow = new Adw.SpinRow({
            title: 'Vertical Offset (Y)',
            subtitle: 'Shift down (+) or up (-)',
            adjustment: new Gtk.Adjustment({
                lower: -2000,
                upper: 2000,
                step_increment: 10,
                page_increment: 50,
                value: settings.get_int('offset-y'),
            }),
        });
        offsetYRow.connect('notify::value', () => {
            settings.set_int('offset-y', Math.round(offsetYRow.get_value()));
        });
        posGroup.add(offsetYRow);

        const monitorRow = new Adw.SpinRow({
            title: 'Monitor Index',
            subtitle: '-1 for primary monitor, or 0, 1, ... for specific monitor',
            adjustment: new Gtk.Adjustment({
                lower: -1,
                upper: 8,
                step_increment: 1,
                page_increment: 1,
                value: settings.get_int('monitor-index'),
            }),
        });
        monitorRow.connect('notify::value', () => {
            settings.set_int('monitor-index', Math.round(monitorRow.get_value()));
        });
        posGroup.add(monitorRow);

        const maxWidthRow = new Adw.SpinRow({
            title: 'Maximum OSD Width',
            subtitle: 'Limit lyrics box width to prevent clipping (px)',
            adjustment: new Gtk.Adjustment({
                lower: 300,
                upper: 2560,
                step_increment: 50,
                page_increment: 100,
                value: settings.get_int('max-width'),
            }),
        });
        maxWidthRow.connect('notify::value', () => {
            settings.set_int('max-width', Math.round(maxWidthRow.get_value()));
        });
        posGroup.add(maxWidthRow);

        page.add(posGroup);
        return page;
    }
}

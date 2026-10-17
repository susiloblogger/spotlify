import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import Gdk from 'gi://Gdk?version=4.0';

export class ColorsPage {
    static _createColorButton(initialCssColor, onColorChanged) {
        const dialog = new Gtk.ColorDialog({
            title: 'Select Color',
            with_alpha: true,
        });

        const btn = new Gtk.ColorDialogButton({
            dialog: dialog,
            valign: Gtk.Align.CENTER,
        });

        const rgba = new Gdk.RGBA();
        if (rgba.parse(initialCssColor)) {
            btn.set_rgba(rgba);
        }

        btn.connect('notify::rgba', () => {
            const c = btn.get_rgba();
            const r = Math.round(c.red * 255);
            const g = Math.round(c.green * 255);
            const b = Math.round(c.blue * 255);
            const a = parseFloat(c.alpha.toFixed(2));
            const cssString = `rgba(${r}, ${g}, ${b}, ${a})`;
            onColorChanged(cssString);
        });

        return btn;
    }

    static build(settings) {
        const page = new Adw.PreferencesPage({
            title: 'Colors & Gradient',
            icon_name: 'color-select-symbolic',
        });

        // Group 1: Lyric Colors
        const textGroup = new Adw.PreferencesGroup({
            title: 'Lyric Colors',
            description: 'Customize colors for active and inactive lyric lines',
        });

        const activeColorRow = new Adw.ActionRow({
            title: 'Active Line Color',
            subtitle: 'Color of the currently playing lyric line',
        });
        const activeBtn = this._createColorButton(settings.get_string('active-color'), (color) => {
            settings.set_string('active-color', color);
        });
        activeColorRow.add_suffix(activeBtn);
        activeColorRow.set_activatable_widget(activeBtn);
        textGroup.add(activeColorRow);

        const inactiveColorRow = new Adw.ActionRow({
            title: 'Inactive Line Color',
            subtitle: 'Color of preceding and upcoming lyric lines',
        });
        const inactiveBtn = this._createColorButton(settings.get_string('inactive-color'), (color) => {
            settings.set_string('inactive-color', color);
        });
        inactiveColorRow.add_suffix(inactiveBtn);
        inactiveColorRow.set_activatable_widget(inactiveBtn);
        textGroup.add(inactiveColorRow);

        page.add(textGroup);

        // Group 2: OSD Background Gradient
        const gradGroup = new Adw.PreferencesGroup({
            title: 'OSD Background Gradient',
            description: 'Customize gradient direction, colors, and container styling',
        });

        const gradDirRow = new Adw.ComboRow({
            title: 'Gradient Direction',
            model: Gtk.StringList.new(['Solid (No Gradient)', 'Vertical (Top to Bottom)', 'Horizontal (Left to Right)', 'Radial']),
        });
        const dirs = ['none', 'vertical', 'horizontal', 'radial'];
        const currentDir = settings.get_string('gradient-direction') || 'horizontal';
        gradDirRow.set_selected(Math.max(0, dirs.indexOf(currentDir)));
        gradDirRow.connect('notify::selected', () => {
            settings.set_string('gradient-direction', dirs[gradDirRow.get_selected()]);
        });
        gradGroup.add(gradDirRow);

        const gradStartRow = new Adw.ActionRow({
            title: 'Gradient Start Color',
        });
        const startBtn = this._createColorButton(settings.get_string('gradient-start'), (color) => {
            settings.set_string('gradient-start', color);
        });
        gradStartRow.add_suffix(startBtn);
        gradStartRow.set_activatable_widget(startBtn);
        gradGroup.add(gradStartRow);

        const gradEndRow = new Adw.ActionRow({
            title: 'Gradient End Color',
        });
        const endBtn = this._createColorButton(settings.get_string('gradient-end'), (color) => {
            settings.set_string('gradient-end', color);
        });
        gradEndRow.add_suffix(endBtn);
        gradEndRow.set_activatable_widget(endBtn);
        gradGroup.add(gradEndRow);

        const radiusRow = new Adw.SpinRow({
            title: 'Corner Radius',
            subtitle: 'Corner curvature of the OSD container (px)',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 2,
                page_increment: 6,
                value: settings.get_int('border-radius'),
            }),
        });
        radiusRow.connect('notify::value', () => {
            settings.set_int('border-radius', Math.round(radiusRow.get_value()));
        });
        gradGroup.add(radiusRow);

        const paddingRow = new Adw.SpinRow({
            title: 'Container Padding',
            subtitle: 'Inner spacing between lyrics and card edges (px)',
            adjustment: new Gtk.Adjustment({
                lower: 4,
                upper: 50,
                step_increment: 2,
                page_increment: 6,
                value: settings.get_int('padding'),
            }),
        });
        paddingRow.connect('notify::value', () => {
            settings.set_int('padding', Math.round(paddingRow.get_value()));
        });
        gradGroup.add(paddingRow);

        page.add(gradGroup);
        return page;
    }
}

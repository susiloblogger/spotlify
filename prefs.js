import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { AppearancePage } from './prefs/appearancePage.js';
import { ColorsPage } from './prefs/colorsPage.js';
import { PositionPage } from './prefs/positionPage.js';
import { BehaviorPage } from './prefs/behaviorPage.js';
import { SupportPage } from './prefs/supportPage.js';

export default class SpotlifyPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        window.add(AppearancePage.build(settings));
        window.add(ColorsPage.build(settings));
        window.add(PositionPage.build(settings));
        window.add(BehaviorPage.build(settings));
        window.add(SupportPage.build(settings));

        window.set_default_size(720, 680);
    }
}

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import { AutostartManager, EXTENSION_UUID } from '../lib/autostartManager.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running AutostartManager tests...');

// 1. Test generateDesktopEntry
const entry = AutostartManager.generateDesktopEntry();
assert(entry.includes('[Desktop Entry]'), 'Must include [Desktop Entry] section');
assert(entry.includes('Type=Application'), 'Type must be Application');
assert(entry.includes('Name=Spotlify'), 'Name must be Spotlify');
assert(entry.includes(`Exec=gnome-extensions enable ${EXTENSION_UUID}`), 'Exec must enable extension');
assert(entry.includes('X-GNOME-Autostart-enabled=true'), 'Must be autostart enabled');

// 2. Test Override Path and Directory
const testDir = GLib.build_filenamev([GLib.get_tmp_dir(), `spotlify_test_autostart_${Date.now()}`]);
const testFilePath = GLib.build_filenamev([testDir, 'spotlify.desktop']);

AutostartManager.setOverridePath(testFilePath);
assert(AutostartManager.getAutostartFilePath() === testFilePath, 'Override file path should match');
assert(AutostartManager.getAutostartDir() === testDir, 'Override dir should match');

// Initially should not be enabled
assert(!AutostartManager.isAutostartEnabled(), 'Should not be enabled when file does not exist');

// 3. Test Synchronous Creation (setAutostartSync)
const syncSuccess = AutostartManager.setAutostartSync(true);
assert(syncSuccess === true, 'setAutostartSync(true) should return true');
assert(AutostartManager.isAutostartEnabled() === true, 'isAutostartEnabled should be true after creation');

const createdFile = Gio.File.new_for_path(testFilePath);
assert(createdFile.query_exists(null) === true, 'File must exist on disk');

const [readOk, contentBytes] = createdFile.load_contents(null);
assert(readOk === true, 'File should be readable');
const contentStr = new TextDecoder('utf-8').decode(contentBytes);
assert(contentStr.includes(`Exec=gnome-extensions enable ${EXTENSION_UUID}`), 'File content must match');

// 4. Test Disable recognition
createdFile.replace_contents(
    new TextEncoder().encode('[Desktop Entry]\nX-GNOME-Autostart-enabled=false\n'),
    null,
    false,
    Gio.FileCreateFlags.REPLACE_DESTINATION,
    null
);
assert(AutostartManager.isAutostartEnabled() === false, 'Should be false when X-GNOME-Autostart-enabled=false');

// 5. Test Synchronous Removal (setAutostartSync(false))
AutostartManager.setAutostartSync(false);
assert(!createdFile.query_exists(null), 'File should be removed on setAutostartSync(false)');
assert(AutostartManager.isAutostartEnabled() === false, 'Should be false after deletion');

// 6. Test Asynchronous operations (setAutostart(true))
AutostartManager.setAutostart(true);

const loop = new GLib.MainLoop(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    loop.quit();
    return GLib.SOURCE_REMOVE;
});
loop.run();

assert(createdFile.query_exists(null) === true, 'File should be created asynchronously');
assert(AutostartManager.isAutostartEnabled() === true, 'isAutostartEnabled should be true');

// 7. Test Asynchronous removal (setAutostart(false))
AutostartManager.setAutostart(false);

const loop2 = new GLib.MainLoop(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    loop2.quit();
    return GLib.SOURCE_REMOVE;
});
loop2.run();

assert(!createdFile.query_exists(null), 'File should be removed asynchronously');

// 8. Test syncWithSettings mock
const mockSettings = {
    _map: new Map(),
    get_boolean(key) {
        return this._map.get(key) ?? false;
    },
    set_boolean(key, val) {
        this._map.set(key, val);
    },
};

mockSettings.set_boolean('autostart-on-login', true);
AutostartManager.syncWithSettings(mockSettings);

const loop3 = new GLib.MainLoop(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    loop3.quit();
    return GLib.SOURCE_REMOVE;
});
loop3.run();

assert(createdFile.query_exists(null) === true, 'syncWithSettings(true) should create file');

mockSettings.set_boolean('autostart-on-login', false);
AutostartManager.syncWithSettings(mockSettings);

const loop4 = new GLib.MainLoop(null, false);
GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
    loop4.quit();
    return GLib.SOURCE_REMOVE;
});
loop4.run();

assert(!createdFile.query_exists(null), 'syncWithSettings(false) should delete file');

// Clean up override and test directory
AutostartManager.setOverridePath(null);
try {
    const dirFile = Gio.File.new_for_path(testDir);
    dirFile.delete(null);
} catch (e) {}

console.log('✓ All AutostartManager tests passed successfully!');

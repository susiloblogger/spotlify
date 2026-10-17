import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { CoverArtLoader } from '../lib/coverArtLoader.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running CoverArtLoader tests...');

const loader = new CoverArtLoader();

// Test empty/null artUrl
assert(await loader.loadArtPath(null) === null, 'null URL should return null');
assert(await loader.loadArtPath('') === null, 'empty URL should return null');

// Test invalid scheme
assert(await loader.loadArtPath('ftp://example.com/art.jpg') === null, 'ftp URL should return null');

// Test file:// scheme with non-existent file
assert(await loader.loadArtPath('file:///tmp/spotlify_non_existent.jpg') === null, 'non-existent file URL should return null');

// Test file:// scheme with real temporary file
const tmpPath = '/tmp/spotlify_test_art.jpg';
const tmpFile = Gio.File.new_for_path(tmpPath);
tmpFile.replace_contents('test_art_data', null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);

const localResult = await loader.loadArtPath(`file://${tmpPath}`);
assert(localResult === tmpPath, 'file:// URI should return absolute path');

tmpFile.delete(null);

// Test cleanCache method
const cleanupResult = loader.cleanCache({ maxFiles: 50, maxAgeDays: 14 });
assert(typeof cleanupResult.scanned === 'number', 'cleanCache should report scanned count');
assert(typeof cleanupResult.deleted === 'number', 'cleanCache should report deleted count');

loader.destroy();

console.log('✓ All CoverArtLoader tests passed successfully!');

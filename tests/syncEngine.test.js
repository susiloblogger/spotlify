import { SyncEngine } from '../lib/syncEngine.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running SyncEngine tests...');

const engine = new SyncEngine();
const lines = [
    { time: 5000, text: 'First line' },
    { time: 10000, text: 'Second line' },
    { time: 15000, text: 'Third line' },
];

engine.setLyrics(lines);

// Test before first line (intro)
assert(engine.findActiveIndex(2000) === -1, 'Position 2000 should be index -1 (intro)');

// Test exact first line
assert(engine.findActiveIndex(5000) === 0, 'Position 5000 should be index 0');

// Test within first line
assert(engine.findActiveIndex(7500) === 0, 'Position 7500 should be index 0');

// Test exact second line
assert(engine.findActiveIndex(10000) === 1, 'Position 10000 should be index 1');

// Test within second line
assert(engine.findActiveIndex(12000) === 1, 'Position 12000 should be index 1');

// Test exact third line
assert(engine.findActiveIndex(15000) === 2, 'Position 15000 should be index 2');

// Test after last line
assert(engine.findActiveIndex(20000) === 2, 'Position 20000 should be index 2');

// Test onLineChanged callback with nextNextText
let captured = null;
engine.onLineChanged = (data) => {
    captured = data;
};

// Simulate position at first line
engine.setPositionGetter(() => 5000);
engine.update();
assert(captured !== null, 'onLineChanged should be triggered');
assert(captured.currentText === 'First line', 'currentText should be First line');
assert(captured.nextText === 'Second line', 'nextText should be Second line');
assert(captured.nextNextText === 'Third line', 'nextNextText should be Third line');

console.log('✓ All SyncEngine tests passed successfully!');

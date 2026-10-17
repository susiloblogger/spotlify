import { LrcParser } from '../lib/lrcParser.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running LrcParser tests...');

// Test 1: Basic timestamps
const sample1 = `
[00:05.50]First line
[00:12.800]Second line
[01:02.00]Third line
`;
const res1 = LrcParser.parse(sample1);
assert(res1.length === 3, 'Sample 1 length should be 3');
assert(res1[0].time === 5500, `Line 1 time should be 5500ms, got ${res1[0].time}`);
assert(res1[0].text === 'First line', 'Line 1 text mismatch');
assert(res1[1].time === 12800, `Line 2 time should be 12800ms, got ${res1[1].time}`);
assert(res1[2].time === 62000, `Line 3 time should be 62000ms, got ${res1[2].time}`);

// Test 2: Multiple timestamps on one line
const sample2 = `
[00:10.00][00:20.00]Repeated chorus
`;
const res2 = LrcParser.parse(sample2);
assert(res2.length === 2, 'Sample 2 length should be 2');
assert(res2[0].time === 10000, 'Timestamp 1 should be 10000');
assert(res2[1].time === 20000, 'Timestamp 2 should be 20000');
assert(res2[0].text === 'Repeated chorus', 'Text 1 mismatch');
assert(res2[1].text === 'Repeated chorus', 'Text 2 mismatch');

// Test 3: Offset tag
const sample3 = `
[offset:500]
[00:04.00]Line with offset
`;
const res3 = LrcParser.parse(sample3);
assert(res3[0].time === 4500, `Time with offset should be 4500, got ${res3[0].time}`);

// Test 4: Empty line / instrumental note
const sample4 = `
[00:15.00]
`;
const res4 = LrcParser.parse(sample4);
assert(res4[0].text === '♪', `Empty line should be mapped to ♪, got ${res4[0].text}`);

// Test 5: Metadata header tags ignored
const sample5 = `
[ti:Song Title]
[ar:Artist Name]
[al:Album Name]
[00:02.00]Hello world
`;
const res5 = LrcParser.parse(sample5);
assert(res5.length === 1, `Metadata tags should be ignored, length was ${res5.length}`);
assert(res5[0].text === 'Hello world', 'Text mismatch');

console.log('✓ All LrcParser tests passed successfully!');

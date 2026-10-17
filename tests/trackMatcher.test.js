import { TrackMatcher } from '../lib/lyrics/trackMatcher.js';

function assert(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

console.log('Running TrackMatcher tests...');

// Test cleanTitle
assert(TrackMatcher.cleanTitle('Bohemian Rhapsody - Remastered 2011') === 'Bohemian Rhapsody', 'Remastered should be cleaned');
assert(TrackMatcher.cleanTitle('Stay (feat. Justin Bieber)') === 'Stay', 'Feat in parentheses should be cleaned');
assert(TrackMatcher.cleanTitle('Feels Like Heaven (with Chaka Khan)') === 'Feels Like Heaven', 'With in parentheses should be cleaned');
assert(TrackMatcher.cleanTitle('Something - feat. Somebody') === 'Something', 'Feat with dash should be cleaned');
assert(TrackMatcher.cleanTitle('Hotel California - Live On MTV, 1994') === 'Hotel California', 'Live should be cleaned');
assert(TrackMatcher.cleanTitle('Blinding Lights [Radio Edit]') === 'Blinding Lights', 'Radio edit should be cleaned');

// Test normalize
assert(TrackMatcher.normalize('Héllo, World! 123') === 'hello world 123', 'Normalize should remove diacritics and punctuation');

// Test scoreCandidate
const track = {
    title: 'Starboy (feat. Daft Punk)',
    artist: 'The Weeknd',
    durationSec: 230,
};

const goodCandidate = {
    trackName: 'Starboy',
    artistName: 'The Weeknd',
    duration: 230,
};

const badDurationCand = {
    trackName: 'Starboy',
    artistName: 'The Weeknd',
    duration: 250, // 20s difference -> disqualified
};

const wrongTitleCand = {
    trackName: 'Blinding Lights',
    artistName: 'The Weeknd',
    duration: 230,
};

const score1 = TrackMatcher.scoreCandidate(track, goodCandidate);
assert(score1 >= 80, `Good candidate should have high score, got ${score1}`);

const score2 = TrackMatcher.scoreCandidate(track, badDurationCand);
assert(score2 === 0, `Candidate with >3s duration drift should be disqualified, got ${score2}`);

const score3 = TrackMatcher.scoreCandidate(track, wrongTitleCand);
assert(score3 === 0, `Candidate with wrong title should be disqualified, got ${score3}`);

const scoreFeels = TrackMatcher.scoreCandidate(
    { title: 'Feels Like Heaven (with Chaka Khan)', artist: 'Peter Cetera', durationSec: 289 },
    { trackName: 'Feels Like Heaven', artistName: 'Peter Cetera', duration: 290 }
);
assert(scoreFeels >= 80, `Feels Like Heaven should score >= 80, got ${scoreFeels}`);

console.log('✓ All TrackMatcher tests passed successfully!');

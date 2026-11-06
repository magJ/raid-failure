const test = require('node:test');
const assert = require('node:assert/strict');

const {
    calculateRaid5SuccessChance,
    calculateRaid5FailureChance,
    calculateRaid6SuccessChance,
    calculateRaid6FailureChance,
    probabilityOfNoUre,
    probabilityOfAtLeastOneUre,
    raid6StripeSuccessChance,
    raid6StripeFailureChance
} = require('../javascripts/raidcalc.js');

test('zero bits read means no chance of a URE', () => {
    assert.equal(probabilityOfNoUre(0, 14), 1);
    assert.equal(probabilityOfAtLeastOneUre(0, 14), 0);
});

test('probability of no URE decreases as read volume increases', () => {
    const small = probabilityOfNoUre(1e12, 14);
    const large = probabilityOfNoUre(2e12, 14);
    assert.ok(small > large && large > 0);
});

test('RAID 5 success decreases as the number of disks increases', () => {
    const five = calculateRaid5SuccessChance(5, 1000, 14);
    const ten = calculateRaid5SuccessChance(10, 1000, 14);
    assert.ok(five > ten);
});

test('RAID 5 success and failure probabilities sum to one', () => {
    const success = calculateRaid5SuccessChance(6, 4000, 14);
    const failure = calculateRaid5FailureChance(6, 4000, 14);
    assert.ok(Math.abs(success + failure - 1) < 1e-12);
});

test('RAID 5 failure probability remains available for very low URE rates', () => {
    assert.ok(calculateRaid5FailureChance(3, 500, 17) > 0);
});

test('RAID 6 stripe tolerates one additional unreadable chunk', () => {
    const success = raid6StripeSuccessChance(5, 256 * 1024, 14);
    assert.ok(success <= 1 && success > 0.999999);
});

test('RAID 6 stripe failure requires at least two unreadable chunks', () => {
    const failure = raid6StripeFailureChance(5, 256 * 1024, 14);
    assert.ok(failure > 0 && failure < 1e-10);
});

test('RAID 6 success improves with a lower URE probability', () => {
    const weaker = calculateRaid6SuccessChance(8, 4000, 14, 256);
    const stronger = calculateRaid6SuccessChance(8, 4000, 15, 256);
    assert.ok(stronger > weaker);
});

test('RAID 6 success decreases as chunk size increases', () => {
    const small = calculateRaid6SuccessChance(8, 4000, 14, 64);
    const large = calculateRaid6SuccessChance(8, 4000, 14, 1024);
    assert.ok(small > large);
});

test('RAID 6 success and failure probabilities sum to one', () => {
    const success = calculateRaid6SuccessChance(6, 4000, 14, 256);
    const failure = calculateRaid6FailureChance(6, 4000, 14, 256);
    assert.ok(Math.abs(success + failure - 1) < 1e-12);
});

test('RAID 6 requires at least four drives', () => {
    assert.throws(
        () => calculateRaid6SuccessChance(3, 4000, 14, 256),
        /at least 4 drives/
    );
});

test('RAID 6 rejects invalid stripe unit sizes', () => {
    assert.throws(
        () => calculateRaid6SuccessChance(6, 4000, 14, 0),
        /greater than zero/
    );
});

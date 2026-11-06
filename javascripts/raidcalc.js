/*
 * Simplified RAID rebuild model.
 * Assumes independent, constant per-bit URE probability.
 * One member disk has already failed.
 */
if (typeof window !== 'undefined' && window.jQuery) {
    $('#failchanceform').on('change', processRaidForm);
    $('#raidtype').on('change', updateStripeUnitVisibility);
    updateStripeUnitVisibility();
    processRaidForm();
}

function processRaidForm() {
    var type = $('#raidtype').val();
    var size = Number($('#drivesize').val());
    var count = Number($('#drivecount').val());
    var ure = Number($('#ureaverage').val());
    var stripeUnitKB = Number($('#stripeunit').val());

    if (!Number.isInteger(count) || count < 3) {
        showValidationError('RAID 5 requires at least 3 drives.');
        return;
    }
    if (type === 'RAID 6' && count < 4) {
        showValidationError('RAID 6 requires at least 4 drives.');
        return;
    }

    var success;
    if (type === 'RAID 5') {
        success = calculateRaid5SuccessChance(count, size, ure);
    } else if (type === 'RAID 6') {
        success = calculateRaid6SuccessChance(count, size, ure, stripeUnitKB);
    } else {
        showValidationError('Unsupported RAID level.');
        return;
    }

    $('#resultspan').text(formatPercent(success * 100));
    $('#resultdetails').text(
        'Modeled probability of an unrecoverable rebuild: ' +
        formatPercent((1 - success) * 100) +
        '. This is not the probability of every kind of array or data loss.'
    );
}

function showValidationError(message) {
    $('#resultspan').text(message);
    $('#resultdetails').text('');
}

function updateStripeUnitVisibility() {
    $('#stripeunitgroup').toggle($('#raidtype').val() === 'RAID 6');
}

function calculateRaid5SuccessChance(diskCount, diskSizeGB, ureExponent) {
    validateCommonInputs(diskCount, diskSizeGB, ureExponent);
    var bitsToRead = (diskCount - 1) * diskSizeGB * 1000000000 * 8;
    return probabilityOfNoUre(bitsToRead, ureExponent);
}

function calculateRaid6SuccessChance(diskCount, diskSizeGB, ureExponent, stripeUnitKB) {
    validateCommonInputs(diskCount, diskSizeGB, ureExponent);
    if (!Number.isInteger(diskCount) || diskCount < 4) {
        throw new RangeError('RAID 6 requires at least 4 drives.');
    }
    if (!Number.isFinite(stripeUnitKB) || stripeUnitKB <= 0) {
        throw new RangeError('Stripe unit size must be greater than zero.');
    }

    var survivingDisks = diskCount - 1;
    var diskBytes = diskSizeGB * 1000000000;
    var chunkBytes = stripeUnitKB * 1024;
    var fullStripeCount = Math.floor(diskBytes / chunkBytes);
    var remainderBytes = diskBytes - fullStripeCount * chunkBytes;

    var fullStripeSuccess = raid6StripeSuccessChance(
        survivingDisks, chunkBytes, ureExponent
    );
    var logSuccess = fullStripeCount * Math.log(fullStripeSuccess);

    if (remainderBytes > 0) {
        var lastStripeSuccess = raid6StripeSuccessChance(
            survivingDisks, remainderBytes, ureExponent
        );
        logSuccess += Math.log(lastStripeSuccess);
    }
    return Math.exp(logSuccess);
}

function raid6StripeSuccessChance(survivingDisks, chunkBytes, ureExponent) {
    var chunkUreChance = probabilityOfAtLeastOneUre(chunkBytes * 8, ureExponent);
    var noUre = Math.pow(1 - chunkUreChance, survivingDisks);
    var exactlyOneUre = survivingDisks * chunkUreChance *
        Math.pow(1 - chunkUreChance, survivingDisks - 1);
    return noUre + exactlyOneUre;
}

function probabilityOfNoUre(bitCount, ureExponent) {
    var p = Math.pow(10, -ureExponent);
    return Math.exp(bitCount * Math.log1p(-p));
}

function probabilityOfAtLeastOneUre(bitCount, ureExponent) {
    var p = Math.pow(10, -ureExponent);
    return -Math.expm1(bitCount * Math.log1p(-p));
}

function validateCommonInputs(diskCount, diskSizeGB, ureExponent) {
    if (!Number.isInteger(diskCount) || diskCount < 3) {
        throw new RangeError('At least 3 drives are required.');
    }
    if (!Number.isFinite(diskSizeGB) || diskSizeGB <= 0) {
        throw new RangeError('Disk size must be greater than zero.');
    }
    if (!Number.isFinite(ureExponent) || ureExponent <= 0) {
        throw new RangeError('URE exponent must be greater than zero.');
    }
}

function formatPercent(value) {
    if (value === 0) return '0%';
    if (value < 0.01) return value.toExponential(3) + '%';
    return value.toFixed(2) + '%';
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateRaid5SuccessChance,
        calculateRaid6SuccessChance,
        probabilityOfNoUre,
        probabilityOfAtLeastOneUre,
        raid6StripeSuccessChance
    };
}

# Mathematical model and assumptions

This calculator estimates rebuild success for RAID 5 or RAID 6 after one
member disk has already failed. It is a simplified probability model, not
a prediction for a particular controller, filesystem, or disk population.

## URE input

The selected value is modeled as a constant independent per-bit error
probability p = 10^-n. Vendor UBER/URE specifications are not a promise
that errors are uniformly distributed or independent in real drives.

For B bits read:

    P(no URE) = (1 - p)^B = exp(B * ln(1 - p))

The implementation uses log1p and expm1 to preserve floating-point precision.

## RAID 5

After one disk has failed, all blocks on the remaining N - 1 disks are read
during a full rebuild. Any additional unrecoverable read error makes its
stripe unrecoverable under this model.

    B = (N - 1) * disk_size_bytes * 8
    P(success) = (1 - p)^B

## RAID 6

After one disk has failed, RAID 6 can tolerate one additional unavailable
chunk in each stripe. The modeled rebuild fails only if at least two of the
remaining disks have an unreadable chunk in the same stripe.

For a chunk containing C bits, let q = 1 - (1 - p)^C. With M = N - 1
surviving disks, the probability that a stripe has zero or exactly one
unreadable chunk is:

    P(stripe succeeds) = (1 - q)^M + M * q * (1 - q)^(M - 1)

The total success probability is the product over all stripes. A final
partial chunk is modeled separately if disk size is not a multiple of
the selected chunk size.

The stripe unit is the per-disk data chunk size, not the full stripe width.
Implementations differ; enter the actual configured value.

## Important limitations

- Only one already-failed disk is modeled.
- URE events are assumed independent between bits, chunks, disks, and stripes.
- Correlated media defects and shared environmental or manufacturing causes
  are not modeled.
- Additional disk failures during rebuild and rebuild duration are not modeled.
- The model does not know which blocks contain live data or whether an
  implementation can avoid reading unused regions.
- RAID implementations can have different recovery behavior and metadata layouts.
- A modeled rebuild failure means a data stripe cannot be reconstructed under
  these assumptions; it is not automatically equivalent to total array loss.

Use backups and independent redundancy. This estimate is not a guarantee
of data safety.

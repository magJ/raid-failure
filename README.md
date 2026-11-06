raid-failure
============

https://alvolalex.github.io/raid-failure/

A browser-based calculator estimating RAID 5 and RAID 6 rebuild success
under a simplified independent URE model.

## Model

- RAID 5: after one disk has failed, any additional URE during the full read
  prevents reconstruction of the affected stripe.
- RAID 6: after one disk has failed, one additional unreadable chunk per stripe
  is tolerated; two or more unreadable chunks in the same stripe are not.
- URE events are modeled as independent with a constant per-bit probability.

See [the mathematical model and its limitations](docs/mathematical-model.md).

## Tests

Requires Node.js 18 or newer:

    npm test

This calculator is an educational estimate, not a guarantee of data safety.
It does not model additional drive failures, correlated errors, rebuild time,
or controller-specific recovery behavior.

Original project author: [magJ](https://github.com/magJ).

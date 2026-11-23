# Changelog

## 2.0.0

### Breaking changes

- The package has an `exports` map, so deep imports from `dist/` no longer work.

### Fixes

- Each function received the same results array that the next step built on, so a function that changed it changed the results. Each function now gets its own copy.
- Building the results with `reduce` copied the whole array at every step, which made long lists slow. Both functions are now plain loops.

### Other changes

- Functions can return plain values as well as promises.
- `sequential` is a named export as well as the default export, and the `SequentialTask`, `SequentialAllSettledTask`, `Fulfilled` and `Rejected` types are exported.
- Ships ES modules and CommonJS, with TypeScript types for both. Built with tsup and tested with Vitest. CI runs on GitHub Actions, and releases are published from GitHub with npm provenance.

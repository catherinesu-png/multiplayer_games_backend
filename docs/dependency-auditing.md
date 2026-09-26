# Dependency auditing

Run the workspace audit periodically:

```sh
pnpm dependencies:audit
```

The audit combines `pnpm outdated -r` with `pnpm why` for direct and transitive packages. Direct production and development dependencies are selected in each workspace `package.json`; transitive dependencies should be upgraded through their parent package rather than pinned with an override unless compatibility has been verified.

For an individual dependency, use:

```sh
pnpm why <package>
```

Warnings from transitive dependencies are retained when the parent upgrade would require an unrelated major migration or introduce application risk. Such warnings should be recorded in the dependency cleanup change and revisited when the parent package is upgraded.

## Current compatibility exceptions

- ESLint remains on the latest 9.x release because `eslint-config-next@16.3.6` currently depends on `eslint-plugin-react@7.37.5`, `eslint-plugin-import@2.32.0`, and `eslint-plugin-jsx-a11y@6.10.2`. Their published peer ranges stop at ESLint 9, and `eslint-plugin-react@7.37.5` fails at runtime with ESLint 10. No compatible plugin release is currently available.
- `cron-parser@4.9.0` is introduced by `bullmq@5.81.5`. BullMQ 6 uses cron-parser 5, but is a major parent upgrade and has not been adopted without an application compatibility review.
- `glob@10.5.0` is introduced by `@vitest/coverage-v8@3.2.7` through `test-exclude@7.0.2`. The current coverage package is coupled to Vitest 3; moving to the newer glob requires a Vitest 5 upgrade, which is outside this cleanup's compatibility scope.
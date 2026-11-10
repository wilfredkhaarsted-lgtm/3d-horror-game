# Tests

## Test promises, not incidental output

- Assert semantic content and behavior, not minified filenames or generated
  coordinates.
- Pure application rules belong in unit tests. Inject browser or clock
  boundaries when needed rather than adding runtime test hooks.
- Rendering, asset loading, browser errors, and responsive behavior belong in
  the real-browser harness against the production build.
- Exercise the exact condition claimed: root hosting is not evidence that a
  project-site prefix works.
- Keep worker pools within the scheduler's supplied CPU and browser allowance.
  Resource ownership and failure scheduling are tested alongside the runner.

Read the relevant test or script for its current assertions and invocation.
Do not duplicate per-suite or per-shot inventories here.

## A check that inspects nothing passes

Any check that discovers the set it iterates must prove discovery succeeded.

- Assert that the discovered set is not empty.
- Include what was discovered in a failure message.
- Cross-check identity through a second source when practical.
- Make the check fail deliberately once and read the failure before trusting it.

This applies to DOM queries, globs, parsed configuration, generated reports,
and browser coverage. A broken discovery step can otherwise agree perfectly
with every assertion made against an empty result.

## Browser evidence

The screenshot command requires a fresh build and owned browser profiles.
It fails explicitly when the build is missing or older than its inputs.
Each screenshot must represent a page whose heading, stylesheet, module assets,
viewport, and browser error stream were checked.

The contact sheet is review evidence, not a visual approval. Inspect the
images after the last code change; do not substitute an old or edited image.
See [code maintenance](code.md#attaching-screenshots) for the author workflow.

## Before calling a test change complete

1. Run the narrow existing check that covers the changed behavior.
2. Demonstrate that a meaningful fault makes the check fail.
3. Run `npm run verify`.

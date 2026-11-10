# Let the author attach the screenshots

Passing browser assertions does not mean a page looks right. A visible change
needs current images that a reviewer can inspect.

CI keeps read-only repository permission and uploads screenshot artifacts.
It does not process contributor-controlled artifacts in a second privileged
job to post images into a PR. That convenience adds a security-critical
artifact-handling boundary for little benefit.

The author attaches the current contact sheet, following
[code maintenance](../code.md#attaching-screenshots). One sheet reduces the
friction of attaching many individual images. CI's artifact lets reviewers
compare that claim against the branch's real run when necessary.

An author can still attach stale or edited evidence. That accepted risk is
smaller than giving a screenshot-publishing pipeline write access.

# A check explains its own environment, rather than failing as something else

Browser checks exercise a built app using a browser they own. A missing or
stale build must be reported before DOM assertions begin; otherwise the error
describes something other than the current source.

The launcher never attaches to an existing browser. OS-assigned ports and
run-owned profiles avoid collisions between worktrees. An explicit debugging
port is checked for occupancy before launch. Missing tools name the required
program and installation route.

Reusable modules are safe to import; only direct script invocation runs the
check. Servers, profiles, and browser processes are cleaned up on both success
and failure. A known environment problem should explain itself at the boundary
that recognizes it, not become an unrelated downstream failure.

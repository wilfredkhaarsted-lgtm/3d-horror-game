# Copilot instructions

This repository is a TypeScript/Vite static web app template. The initial
application is an accessible hello-world page; generated repositories own their
product requirements.

## Always true

- `npm run verify` is the definition of done. Run it; never weaken a check to
  make it pass.
- Keep the production build path-agnostic: the same output must work at the
  server root and beneath a repository-name prefix.
- Preserve browser zoom, semantic HTML, and accessible responsive behavior.
- Do not introduce runtime dependencies or external network services without
  an explicit product requirement.
- Local development supports Windows PowerShell and Linux; CI runs on Ubuntu.
  Keep shell-specific setup in [`docs/code.md`](../docs/code.md).
- Nothing in `docs/` is loaded automatically. Read only the topics the task
  needs.

## Which detail to read

| Read | When you are |
| --- | --- |
| [`docs/code.md`](../docs/code.md) | Changing code, scripts, checks, or workflows |
| [`docs/documentation.md`](../docs/documentation.md) | Writing or reorganizing Markdown |
| [`docs/tests.md`](../docs/tests.md) | Writing or interpreting tests and browser checks |

Every code change needs the code guide; every Markdown change needs the
documentation guide. Keep each rule in one topic file. Link rather than repeat.

[`docs/decisions/`](../docs/decisions/README.md) holds on-demand rationale for
current choices that are easy to mistake for oversights. Read a record only
when its decision is in question.

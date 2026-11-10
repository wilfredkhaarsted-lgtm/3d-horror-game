# Repository rules

`main.json` is the reviewable source for branch protection that otherwise lives
only in the GitHub settings UI. Read the JSON for the current rules rather than
maintaining a prose copy here.

The policy keeps mechanical verification strict without pretending a solo
maintainer can supply independent human approval. See
[`Require no approving review on main`](<../../docs/decisions/Require no approving review on main.md>).

## Applying a change

1. Edit `main.json` and review the diff.
2. List the repository rulesets to find the live ruleset id.
3. Update that ruleset from the checked-in JSON.
4. Fetch the live ruleset and compare it with the intended change.

```powershell
gh api repos/OWNER/REPO/rulesets
gh api --method PUT repos/OWNER/REPO/rulesets/<id> --input .github/rulesets/main.json
gh api repos/OWNER/REPO/rulesets/<id>
```

To create the ruleset when none exists:

```powershell
gh api --method POST repos/OWNER/REPO/rulesets --input .github/rulesets/main.json
```

The required check context must match the workflow job name. A rename on either
side requires the other to change in the same pull request.

Generated repositories do not inherit live rulesets. Substitute their owner
and repository in these commands and apply the policy only after initial
publication. These commands require repository administration access; the CI
and deployment workflow tokens deliberately do not have it.

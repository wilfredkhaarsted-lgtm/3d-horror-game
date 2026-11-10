# Your first web app

This template gives you a simple web page to explore and change. You do not
need to know Git or GitHub to get started. GitHub is where your project lives;
the Copilot App is where you can open and work on it.

[Create your own copy](https://github.com/jbj/typescript-static-template/generate)

## Start in the Copilot App

1. On GitHub, choose **Create your own copy** (or **Use this template**) and
   create a repository for your project.
2. Open that new repository in the Copilot App.
3. Install the current Node.js LTS version from
   [nodejs.org](https://nodejs.org/en/download/) on your Windows laptop. Choose
   the Windows installer and accept its defaults. Node.js is the tool that runs
   this project. If the Copilot App was open during installation, reopen its
   terminal.
4. In the Copilot App terminal, run these commands:

   ```powershell
   npm ci
   npm run dev
   ```

   `npm ci` sets up the tools for this project. You only need it the first time
   (or after the project's tools change). `npm run dev` starts your web page on
   your laptop. Open the address printed in the terminal, usually
   `http://localhost:5173/`. Leave the command running while you work; press
   **Ctrl+C** in the terminal when you are done.

5. To make a game, open the Copilot App chat for your repository and paste this
   prompt. Copilot can edit the project files for you:

   ```text
   Build a complete, fun browser game called Star Catcher in this project. Make
   the changes in the files; don't just tell me how.

   The player moves a basket at the bottom of the screen to catch falling stars.
   Use the left/right arrow keys and A/D keys on a keyboard, and add big on-screen
   left/right buttons that work on a touchscreen. Catching a star adds a point.
   A falling rock ends the game. Show the score, a clear game-over message, and
   a button to play again.

   Use the project's existing TypeScript and Vite setup. Do not add packages,
   call online services, or depend on images or sounds from the internet. Draw
   the game with CSS or simple shapes. Make it work on a phone-sized screen and
   a laptop, keep browser zoom working, use readable colors and text, and make
   buttons usable by keyboard as well as touch.

   When you're done, run the project's checks. If full verification cannot
   finish because Google Chrome isn't installed, explain that; don't let it
   stop me from trying the game. Start the local preview if you can, try playing
   the game, and fix any problems you find. Tell me what you changed, how to
   play, and whether the checks and preview worked.
   ```

6. Keep `npm run dev` running while you play. Open the address it printed in a
   browser; Microsoft Edge is fine. When you want to stop the page, press
   **Ctrl+C** in the terminal.

You do not need to know how to code or use Git to ask Copilot to make the game.
The project has no application services to set up.

## When you are ready for more

Run `npm run verify` to check the project, or `npm run build` to make its
publishable files. Full local verification also needs Google Chrome; you can
still make and play the game without it. GitHub runs checks when you open or
update a pull request, or push changes to `main`. See the
[code guide](docs/code.md#local-and-ci-environments) for Chrome setup. The
normal checks run on Linux even if you are working on Windows; maintainers can
manually run Windows verification to check Windows too.

## For repository maintainers

GitHub templates copy files, **not live repository settings**.

1. Rename the package with `npm pkg set name=your-app`, then update the lockfile
   with `npm install --package-lock-only`. Update the repository-specific
   examples in the [ruleset instructions](.github/rulesets/README.md), the path
   example in `vite.config.ts`, and the owner in `.github/CODEOWNERS`.
2. Update the [working agreement](.github/copilot-instructions.md) and selected
   [documentation topics](docs/) for your app. Keep the original MIT copyright
   notice when retaining this code; add your own attribution where appropriate.
3. Enable GitHub Actions and select **Settings → Pages → Source → GitHub
   Actions**. An administrator may instead configure it with:

   ```powershell
   gh api --method POST repos/OWNER/REPO/pages -f build_type=workflow
   # If Pages already exists:
   gh api --method PUT repos/OWNER/REPO/pages -f build_type=workflow
   ```

4. Push the initial app to `main` and wait for **CI / Verify** to succeed. Run
   **Deploy** manually once if its completion trigger was not yet present on
   the default branch. Manual deployment also requires successful push CI for
   that exact `main` commit.
5. Apply and read back the checked-in
   [main ruleset](.github/rulesets/README.md) after initial publication. Its
   required check is `Verify`; it requires no human approval for a solo
   maintainer. Review CODEOWNERS and the policy before using them in a team.

Publishing deploys the exact successful `main` push commit to GitHub Pages; it
is not a tagged release or a committed build branch. The workflow token cannot
configure Pages or branch rules. The relative Vite base supports any
repository name without rebuilding for another URL prefix.

## Working agreement

Start with [AGENTS.md](AGENTS.md), which points to the
[working agreement](.github/copilot-instructions.md). It routes contributors
to focused [documentation topics](docs/) and on-demand
[decision records](docs/decisions/README.md).

## Attribution

Derived from [jbj/toddler-puzzle](https://github.com/jbj/toddler-puzzle) at
`4758f2f2d61fb455ca071bd33f95b11f37f7428d`, without importing its Git history.
The original [MIT license and copyright](LICENSE) are retained.

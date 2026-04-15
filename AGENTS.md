# Zorola Agent Context

## Project Summary

Zorola is an internal automation tool for processing publisher proof images posted in a Zalo group. The target workflow is:

1. Open Zalo Web.
2. Collect new proof images from a configured group.
3. Group related images into publisher submissions.
4. Extract bank account numbers from the images.
5. Write every detected image to Google Sheets in Zalo display order as an audit log.

The current codebase is only at the first prototype stage: collecting images from Zalo Web into local storage.

## Current Status

As of 2026-04-15:

- GitHub remote: `git@github.com:huynguyen0257/zorola.git`
- Main branch: `main`
- Implemented:
  - Node/TypeScript project scaffold.
  - Playwright-based Zalo Web collector prototype.
  - Local image storage using SHA-256 filenames.
  - JSON checkpoint for downloaded image hashes.
  - Basic browser environment detection for SSH/Linux without `$DISPLAY`.
  - Diagnostic output when no Zalo image candidates are found.
- Not implemented yet:
  - Reliable Zalo DOM selectors.
  - Automatic group search/opening.
  - Cluster/submission grouping.
  - AI/OCR account extraction.
  - Google Sheets writer.
  - SQLite checkpoint/database.
  - `.command` double-click runner for non-technical users.

## Important Links

- Project plan: [docs/plans/zorola-project-plan.md](docs/plans/zorola-project-plan.md)
- Daily action log: [docs/daily/2026-04-15.md](docs/daily/2026-04-15.md)
- User-facing setup/readme: [README.md](README.md)

## Commands

Install dependencies:

```bash
npm install
```

Run tests:

```bash
npm test
```

Typecheck:

```bash
npx tsc --noEmit
```

Run the current Zalo image collector prototype:

```bash
npm run zalo:collect
```

## Local Files And Generated Data

These are intentionally ignored by git:

- `node_modules/`
- `data/`
- `config/app.local.json`

Generated runtime data:

- Collected images: `data/images/collected/`
- Download checkpoint: `data/checkpoint.json`
- Debug artifacts when no images are found: `data/debug/<timestamp>/`

## Current Debugging Focus

The latest Mac local run opened Zalo Web correctly but found zero image candidates:

```text
Tong candidate: 0
Anh moi da luu: 0
Anh da co trong checkpoint, bo qua: 0
```

The next step is to pull the latest code on the Mac, rerun `npm run zalo:collect`, and inspect `data/debug/<timestamp>/report.json` plus `page.png` if candidate count is still zero. Do not guess new selectors without looking at these artifacts.

## Engineering Notes

- Prefer small, testable modules.
- Keep Zalo-specific selector assumptions inside `src/zalo/`.
- Keep generated data and local config out of git.
- Use TDD for pure logic such as candidate filtering, checkpointing, clustering, validation, and Sheet row formatting.
- Browser automation behavior requires manual verification against real Zalo Web because the DOM is not under our control.
- Every future batch pipeline step must preserve Zalo display order.
- The final product must treat Google Sheets as an audit log, not only a list of accepted account numbers.


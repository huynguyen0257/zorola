# Zorola Agent Instructions

This file is for AI agents working in this repo. Do not use it as user-facing setup documentation and do not duplicate daily action history here.

## What This Project Is

Zorola is an internal automation tool for processing publisher proof images posted in a Zalo group. The intended end-to-end workflow is:

1. Collect proof images from Zalo Web.
2. Group related images into publisher submissions.
3. Extract bank account numbers from the images.
4. Validate uncertain or conflicting results.
5. Write every detected image to Google Sheets in Zalo display order as an audit log.

The product direction, milestones, and acceptance criteria live in the plan docs. The implementation history and next action live in the daily docs.

## Required Reading Order

When opening this repo in a new session, read in this order:

1. [README.md](README.md)
   - Use this only for user-facing setup, install, and run instructions.
   - Do not copy setup commands into this file.

2. Latest project plan under [docs/plans/](docs/plans/)
   - Use the plan to understand target output, milestone order, and acceptance criteria.
   - Follow the plan unless the user gives a newer instruction.
   - If implementation diverges from the plan, update the relevant plan file or add a note in the daily log.

3. Latest daily action file under [docs/daily/](docs/daily/)
   - Use daily logs to understand what happened before, what was tried, what failed, and what should happen next.
   - Continue from the latest daily "next step" instead of restarting analysis from scratch.
   - Add a new daily log or update the current one when meaningful work is done.

## Current Development Environment Constraint

Code changes are usually made from an Ubuntu server workspace over SSH. That server does not provide a normal GUI session for opening Chrome/Zalo Web.

Because the current collector prototype needs a visible browser for Zalo login and group inspection:

- Make code changes on the Ubuntu server.
- Run tests and typecheck on the Ubuntu server.
- Commit and push changes to GitHub.
- Tell the user to pull the latest code on macOS.
- The user should run Zalo Web collection on macOS, where Chrome can open with a GUI.

Do not assume headed Playwright can run successfully on the Ubuntu SSH server unless a GUI, VNC, or X server has been explicitly configured.

## Documentation Responsibilities

Keep documentation split by purpose:

- `AGENTS.md`: instructions for AI agents only.
- `README.md`: human setup and run instructions.
- `docs/plans/`: project plan, milestone order, desired output, acceptance criteria.
- `docs/daily/`: chronological action history, debugging notes, next-day starting point.

Do not store daily action history or setup commands in `AGENTS.md`.

## Engineering Notes

- Prefer small, testable modules.
- Keep Zalo-specific selector assumptions inside `src/zalo/`.
- Keep generated data and local config out of git.
- Use TDD for pure logic such as candidate filtering, checkpointing, clustering, validation, and Sheet row formatting.
- Browser automation behavior requires manual verification against real Zalo Web because the DOM is not under our control.
- Every future batch pipeline step must preserve Zalo display order.
- The final product must treat Google Sheets as an audit log, not only a list of accepted account numbers.


# Zorola Project Plan

> **For agentic workers:** Start by reading [AGENTS.md](../../AGENTS.md), then this plan, then the latest file under `docs/daily/`. Continue from the latest daily action item instead of restarting from scratch.

**Goal:** Automate collection and processing of bank-account proof images sent by publishers in a Zalo group.

**Architecture:** The system starts as a macOS command-line tool that controls Zalo Web with Playwright, saves every detected image locally, and later processes images through clustering, account extraction, validation, and Google Sheets audit logging. The first milestone is to reliably collect images from Zalo Web.

**Tech Stack:** Node.js, TypeScript, Playwright, Vitest, local filesystem storage now; later SQLite, AI vision/OCR, and Google Sheets API.

---

## Business Workflow

Publishers send proof images to a Zalo group for bank-account opening campaigns. A publisher submission usually contains 3-4 images. Some images do not contain an account number. If multiple images in the same submission contain an account number, those numbers should match.

The operator currently opens each image manually, reads the bank account number, and copies it into Google Sheets. The automation must reduce this manual work while keeping an audit trail that is easy to compare back to Zalo.

## Core Requirements

1. Collect images from Zalo Web without changing publisher behavior.
2. Run first as a macOS command-line tool.
3. Preserve Zalo display order from old to new.
4. Save all collected images locally before downstream processing.
5. Treat Google Sheets as an audit log: every detected Zalo image candidate must produce one Sheet row.
6. Group nearby images from the same publisher into clusters/submissions.
7. Extract only bank account numbers, with high accuracy.
8. Mark uncertain cases as `needs_review`; never guess unclear digits.
9. Keep enough metadata to debug and reconcile with Zalo.
10. Later wrap the command-line tool in a `.command` file for non-technical use.

## Milestone 1: Zalo Image Collection Prototype

Status: in progress.

Implemented:

- Project scaffold.
- Playwright launch using persistent browser profile.
- Manual login/manual group opening flow.
- Chat scroll simulation.
- Candidate scanning for `<img>` and CSS `background-image`.
- Local image saving with SHA-256 filename.
- JSON checkpoint of image hashes.
- Debug artifact generation when zero candidates are found.

Need next:

- Run latest collector on macOS.
- Inspect `data/debug/<timestamp>/report.json` and `page.png` if zero candidates remain.
- Adjust Zalo candidate detection based on real DOM evidence.
- Confirm at least one real Zalo image is saved to `data/images/collected/`.

Acceptance criteria:

- On a macOS machine with Chrome/Zalo Web, `npm run zalo:collect` can save visible group images into `data/images/collected/`.
- Re-running does not save the same image hash as a new image.
- If no candidates are found, debug artifacts are created.

## Milestone 2: Reliable Zalo Collector

Status: not started.

Planned work:

- Add automatic group search/opening by `groupName`.
- Add better scan-window handling.
- Detect message/image order from DOM.
- Record source metadata: sender, source time if available, Zalo display order, candidate ID.
- Separate rescan duplicates from new Zalo events.
- Add dry-run summary output.

Acceptance criteria:

- Collector can open the configured group after login.
- Collector returns candidates in Zalo display order.
- Collector can scan a bounded history window without manual DOM inspection.

## Milestone 3: Cluster Grouping

Status: not started.

Planned work:

- Group image candidates into clusters by sender, proximity, and order.
- Add cluster metadata:
  - `cluster_id`
  - `cluster_order`
  - `cluster_size`
  - `cluster_status`
  - `cluster_account_number`
- Keep one row per image even when images are grouped into one submission.

Acceptance criteria:

- Consecutive images from the same sender within a short time window are assigned to the same cluster.
- Cluster order matches Zalo order.
- Cluster logic is covered by unit tests.

## Milestone 4: Account Extraction And Validation

Status: not started.

Planned work:

- Add AI vision/OCR extractor.
- Require structured output:

```json
{
  "account_number": "digits only or empty",
  "confidence": 0.0,
  "ambiguity_reason": ""
}
```

- Add validation:
  - digits only
  - reasonable length
  - not date/time
  - not amount
  - not phone number if detectable
  - no guessing unclear digits
- Add statuses:
  - `accepted`
  - `needs_review`
  - `duplicate`
  - `failed`

Acceptance criteria:

- Extractor can process saved images from disk.
- Validation is unit-tested.
- Unclear images are marked `needs_review`, not accepted.

## Milestone 5: Google Sheets Audit Log

Status: not started.

Planned Sheet columns:

```text
batch_id
zalo_order
cluster_id
cluster_order
cluster_size
source_time
sender
status
account_number
suggested_account_number
confidence
cluster_account_number
cluster_status
duplicate_type
duplicate_of
source_image_hash
source_candidate_id
source_image_path
note
created_at
```

Rules:

- Every detected image candidate creates one Sheet row.
- Rows are written in Zalo display order.
- `accepted`, `needs_review`, `duplicate`, and `failed` are all written.
- Rescan duplicates should not create new Sheet rows.
- Business duplicates should create rows with `status = duplicate`.

Acceptance criteria:

- Batch writes append rows in order.
- Retry does not duplicate already-written audit rows.
- Failed candidates still produce an audit row when possible.

## Milestone 6: Durable Checkpoint And Batch State

Status: not started.

Planned work:

- Replace JSON checkpoint with SQLite.
- Store batches, image candidates, dedup keys, and Sheet row mapping.
- Update checkpoint only after local DB and Sheet write are successful.

Acceptance criteria:

- Interrupted batches can be resumed safely.
- Previously written audit rows are not duplicated.
- Batch summary can be reconstructed from local DB.

## Milestone 7: Operator-Friendly Runner

Status: not started.

Planned work:

- Add `Run Zalo Processor.command`.
- Add clear error messages.
- Add setup instructions for a second macOS machine.
- Keep the same underlying CLI logic.

Acceptance criteria:

- Non-technical operator can double-click a file to run the tool after setup.
- Logs remain available for debugging.


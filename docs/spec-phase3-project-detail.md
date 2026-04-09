# Spec: Phase 3 — Project detail + evidence links

## Purpose

Let users open a **single project** and see **why it exists**: provenance rows (`evidence_links`) with deep links back to the **session** (and message or artifact anchor).

## User outcome

- `/projects/:projectId` shows project fields and a list of evidence.
- Each evidence row links to `/sessions/:sessionId` with `#message-…` or `#artifact-…` when applicable so the reader can jump to source.
- **Session reader** applies the same highlight ring + scroll as chunk deep links when the URL has a `#message-` / `#artifact-` fragment (unless `?chunk=` or in-session `q=` search is active; chunk and search take precedence).
- Project list entries navigate to this detail page.

## Non-goals

- Editing project fields or merging duplicates.
- Loading full message text on the detail page (excerpt only).

## Acceptance criteria

- Unknown project id shows a clear not-found state with link back to `/projects`.
- Evidence sorted by `created_at` descending (repository default).

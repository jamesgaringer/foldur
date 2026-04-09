# Build log: Home library stats — projects, themes, open recommendations

**Date:** 2026-04-04
**Phase:** Phase 3 (small UX slice)

## What shipped

- **`LibraryStats`** extended with `projectCount`, `themeCount`, `openRecommendationsCount` (`getLibraryStats` in `packages/db/src/repositories/stats.ts`).
- **`LibraryStatsBar`** shows three extra tiles on Home (and anywhere else using the bar).

## Files

- `packages/db/src/repositories/stats.ts`
- `apps/desktop/src/components/LibraryStatsBar.tsx`

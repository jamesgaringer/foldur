import { createTitleStubExtractionProvider } from "@foldur/core";

/** Default on-device extraction: deterministic title + first user message (no ML, no network). */
export const defaultExtractionProvider = createTitleStubExtractionProvider();

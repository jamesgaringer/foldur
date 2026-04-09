import { z } from "zod";
import { PipelineRunStatus } from "../enums.js";

export const PipelineRunSchema = z.object({
  id: z.string(),
  import_batch_id: z.string().nullable(),
  stage: z.string(),
  status: PipelineRunStatus,
  started_at: z.string(),
  completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  metadata_json: z.string().nullable(),
  created_at: z.string(),
});

export type PipelineRun = z.infer<typeof PipelineRunSchema>;

export const NewPipelineRunSchema = PipelineRunSchema.omit({
  id: true,
  created_at: true,
});
export type NewPipelineRun = z.infer<typeof NewPipelineRunSchema>;

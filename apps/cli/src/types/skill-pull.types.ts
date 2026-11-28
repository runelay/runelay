import type { SkillTargetId } from "@/types/context.types";

export type SkillPullOutcome = "created" | "updated" | "unchanged" | "local" | "failed";

export interface SkillPullResult {
  slug: string;
  outcome: SkillPullOutcome;
  message?: string;
}

export interface SkillTargetPullSummary {
  id: SkillTargetId;
  agent: string;
  path: string;
  results: SkillPullResult[];
}

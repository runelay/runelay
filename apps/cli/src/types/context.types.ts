import type { ContextClient } from "@runelay/shared";

export type SkillTargetId =
  | "claude"
  | "agents"
  | "codex"
  | "cursor"
  | "grok"
  | "gemini"
  | "antigravity"
  | "opencode"
  | "custom";

export interface AgentDirectory {
  agent: string;
  path: string;
}

export interface SkillTarget extends AgentDirectory {
  id: SkillTargetId;
  detect?: readonly string[];
}

export interface InstructionFile extends AgentDirectory {
  slug: string;
}

export interface InstructionTarget {
  id: string;
  name: string;
  detect: string;
  file: string;
  client: ContextClient;
}

export interface InstructionTargetDirs {
  configHome?: string;
  kimiHome?: string;
}

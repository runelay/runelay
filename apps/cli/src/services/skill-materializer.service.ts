import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import {
  attemptSync,
  fail,
  ok,
  type Result,
  SKILL_EXPORT_LIMIT,
  type SkillExportView,
  type SkillListItemView,
} from "@runelay/shared";
import { cliEnv } from "@/config/env";
import { SKILL_MARKER_FILE, SKILLS_TARGET_DIR } from "@/constants/cli.constants";
import { SKILL_ENTRY_FILE, SKILL_TARGETS } from "@/constants/context.constants";
import { chunk } from "@/lib/chunk";
import { exportSkills, listEnabledSkills } from "@/services/runelay-api.service";
import type { Connection } from "@/types/config.types";
import type { SkillTarget } from "@/types/context.types";
import type { SkillTargetPullSummary } from "@/types/skill-pull.types";

export interface SkillMaterializeDeps {
  listEnabledSkills: (connection: Connection) => Promise<Result<SkillListItemView[]>>;
  exportSkills: (connection: Connection, slugs: string[]) => Promise<Result<SkillExportView[]>>;
}

export interface ResolveSkillTargetsOptions {
  customDir?: string;
  agents?: readonly string[];
  targets?: readonly SkillTarget[];
  fallbackDir?: string;
  dirExists?: (path: string) => boolean;
}

export interface MaterializeSkillsOptions extends ResolveSkillTargetsOptions {
  deps?: SkillMaterializeDeps;
}

const DEFAULT_DEPS: SkillMaterializeDeps = {
  listEnabledSkills,
  exportSkills,
};

const markerOf = (directory: string) => {
  const marker = join(directory, SKILL_MARKER_FILE);
  return existsSync(marker) ? readFileSync(marker, "utf8").trim() : null;
};

const insideOf = (root: string, path: string) => {
  const target = resolve(root, path);
  return target.startsWith(`${resolve(root)}${sep}`) ? target : null;
};

const entryOf = ({ name, description, body }: SkillExportView) =>
  `---\nname: ${JSON.stringify(name)}\ndescription: ${JSON.stringify(description)}\n---\n\n${body.trim()}\n`;

const replaceFolder = (target: string, skill: SkillExportView) =>
  attemptSync(() => {
    const staging = `${target}.runelay-tmp`;
    rmSync(staging, { recursive: true, force: true });
    mkdirSync(staging, { recursive: true });
    writeFileSync(join(staging, SKILL_ENTRY_FILE), entryOf(skill));
    for (const file of skill.files) {
      if (file.path === SKILL_ENTRY_FILE || file.path === SKILL_MARKER_FILE) continue;
      const path = insideOf(staging, file.path);
      if (!path) continue;
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content);
    }
    writeFileSync(join(staging, SKILL_MARKER_FILE), `${skill.updatedAt}\n`);
    rmSync(target, { recursive: true, force: true });
    renameSync(staging, target);
    return null;
  }, "STORAGE_FAILED");

export const resolveSkillTargets = ({
  customDir = cliEnv.RUNELAY_SKILLS_DIR,
  agents,
  targets = SKILL_TARGETS,
  fallbackDir = SKILLS_TARGET_DIR,
  dirExists = existsSync,
}: ResolveSkillTargetsOptions = {}): Result<SkillTarget[]> => {
  if (customDir) return ok([{ id: "custom", agent: "Custom", path: customDir }]);
  if (agents && agents.length > 0) {
    const byId = new Map(targets.map((target) => [target.id as string, target]));
    const unknown = agents.filter((agent) => !byId.has(agent));
    if (unknown.length > 0) {
      const valid = [...byId.keys()].join(", ");
      return fail("INVALID_INPUT", `Unknown agent: ${unknown.join(", ")}. Use: ${valid}`);
    }
    const unique = [...new Set(agents)].flatMap((agent) => {
      const found = byId.get(agent);
      return found ? [found] : [];
    });
    return ok(unique);
  }
  const detected = targets.filter((target) => {
    const probes = target.detect ?? [dirname(target.path)];
    return probes.some((probe) => dirExists(probe));
  });
  if (detected.length > 0) return ok(detected);
  return ok([{ id: "claude", agent: "Claude Code", path: fallbackDir }]);
};

interface PendingTargetWrite {
  targetIndex: number;
  targetPath: string;
  exists: boolean;
}

export const materializeSkills = async (
  connection: Connection,
  options: MaterializeSkillsOptions = {},
): Promise<Result<SkillTargetPullSummary[]>> => {
  const targets = resolveSkillTargets(options);
  if (targets.error) return targets;
  const deps = options.deps ?? DEFAULT_DEPS;

  const skills = await deps.listEnabledSkills(connection);
  if (skills.error) return skills;

  for (const target of targets.data) {
    const created = attemptSync(() => mkdirSync(target.path, { recursive: true }), "STORAGE_FAILED");
    if (created.error) return created;
  }

  const summaries: SkillTargetPullSummary[] = targets.data.map((target) => ({
    id: target.id,
    agent: target.agent,
    path: target.path,
    results: [],
  }));

  const pendingBySlug = new Map<string, PendingTargetWrite[]>();

  for (const skill of skills.data) {
    targets.data.forEach((target, targetIndex) => {
      const targetPath = insideOf(target.path, skill.slug);
      if (!targetPath) {
        summaries[targetIndex]?.results.push({ slug: skill.slug, outcome: "failed", message: "invalid folder name" });
        return;
      }
      const exists = existsSync(targetPath);
      const marker = exists ? markerOf(targetPath) : null;
      if (exists && marker === null) {
        summaries[targetIndex]?.results.push({ slug: skill.slug, outcome: "local" });
        return;
      }
      if (marker === skill.updatedAt) {
        summaries[targetIndex]?.results.push({ slug: skill.slug, outcome: "unchanged" });
        return;
      }
      const entries = pendingBySlug.get(skill.slug) ?? [];
      entries.push({ targetIndex, targetPath, exists });
      pendingBySlug.set(skill.slug, entries);
    });
  }

  const pendingSlugs = [...pendingBySlug.keys()];
  for (const batch of chunk(pendingSlugs, SKILL_EXPORT_LIMIT)) {
    const exported = await deps.exportSkills(connection, batch);
    if (exported.error) {
      for (const slug of batch) {
        for (const { targetIndex } of pendingBySlug.get(slug) ?? []) {
          summaries[targetIndex]?.results.push({ slug, outcome: "failed", message: exported.error.message });
        }
      }
      continue;
    }
    const bySlug = new Map(exported.data.map((skill) => [skill.slug, skill]));
    for (const slug of batch) {
      const full = bySlug.get(slug);
      for (const { targetIndex, targetPath, exists } of pendingBySlug.get(slug) ?? []) {
        if (!full) {
          summaries[targetIndex]?.results.push({
            slug,
            outcome: "failed",
            message: "skill is no longer on the server",
          });
          continue;
        }
        const written = replaceFolder(targetPath, full);
        summaries[targetIndex]?.results.push(
          written.error
            ? { slug, outcome: "failed", message: written.error.message }
            : { slug, outcome: exists ? "updated" : "created" },
        );
      }
    }
  }

  return ok(summaries);
};

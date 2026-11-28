import { fail, ok, type Result } from "@runelay/shared";
import { cliEnv } from "@/config/env";
import { INSTRUCTION_TARGETS, SKILL_TARGETS } from "@/constants/context.constants";
import { plural, shortPath } from "@/lib/format";
import { dim } from "@/lib/terminal";
import { formatRow, printCard, startStep } from "@/lib/ui";
import { writeBriefs } from "@/services/brief-writer.service";
import { resolveConnection } from "@/services/config.service";
import { fetchBrief } from "@/services/runelay-api.service";
import { materializeSkills } from "@/services/skill-materializer.service";
import type { Connection } from "@/types/config.types";
import type { SkillPullOutcome } from "@/types/skill-pull.types";

export interface PullOptions {
  agents?: string[];
  customDir?: string;
}

const VALID_SKILL_AGENTS = new Set<string>(SKILL_TARGETS.map((target) => target.id));

export const parsePullOptions = (args: string[]): Result<PullOptions> => {
  const agents: string[] = [];
  let customDir: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg === "--agents" || arg === "-a") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) return fail("INVALID_INPUT", "Provide agent names after --agents.");
      agents.push(
        ...value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      index += 1;
      continue;
    }
    if (arg.startsWith("--agents=")) {
      agents.push(
        ...arg
          .slice("--agents=".length)
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      );
      continue;
    }
    if (arg === "--skills-dir") {
      const value = args[index + 1];
      if (!value || value.startsWith("-")) return fail("INVALID_INPUT", "Provide a path after --skills-dir.");
      customDir = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--skills-dir=")) {
      customDir = arg.slice("--skills-dir=".length);
      continue;
    }
    return fail("INVALID_INPUT", `Unknown option: ${arg}`);
  }
  if (agents.length > 0) {
    const unknown = agents.filter((agent) => !VALID_SKILL_AGENTS.has(agent));
    if (unknown.length > 0) {
      return fail("INVALID_INPUT", `Unknown agent: ${unknown.join(", ")}. Use: ${[...VALID_SKILL_AGENTS].join(", ")}`);
    }
  }
  return ok({ agents: agents.length ? [...new Set(agents)] : undefined, customDir });
};

export const writeInstructionBriefs = async (connection: Connection, selectedAgents?: readonly string[]) => {
  const step = startStep("Writing the runelay rule to your agents");
  const allowed = selectedAgents ? new Set(selectedAgents) : null;
  const targets = allowed ? INSTRUCTION_TARGETS.filter((target) => allowed.has(target.id)) : INSTRUCTION_TARGETS;
  const outcomes = await writeBriefs((client) => fetchBrief(connection, client), targets);
  const home = cliEnv.RUNELAY_HOME;
  for (const { target, status, message, pinnedCount } of outcomes) {
    const file = shortPath(target.file, home);
    if (status === "skipped") continue;
    if (status === "failed") step.row(formatRow({ tone: "error", name: target.name, message: message ?? "failed" }));
    else
      step.row(
        formatRow({
          tone: status === "written" ? "ok" : "skip",
          name: target.name,
          message: `${file} ${status === "written" ? "updated" : "already up to date"} ${dim(`· ${plural(pinnedCount, "pinned rule", "pinned rules")}`)}`,
        }),
      );
  }
  const written = outcomes.filter(({ status }) => status === "written").length;
  const current = outcomes.filter(({ status }) => status === "written" || status === "unchanged").length;
  const failed = outcomes.filter(({ status }) => status === "failed").length;
  if (failed) {
    process.exitCode = 1;
    step.warn(`${current} up to date, ${failed} failed`);
  } else if (!current) step.skip("no agent with a global instructions file");
  else step.done(`${plural(current, "agent", "agents")} · ${written} updated`);
  return { written, current, failed };
};

const OUTCOME_LABELS: Record<SkillPullOutcome, string> = {
  created: "new",
  updated: "updated",
  unchanged: "unchanged",
  local: "already local",
  failed: "failed",
};

const pullSkills = async (connection: Connection, options: PullOptions = {}) => {
  const step = startStep("Fetching skills");
  const pulled = await materializeSkills(connection, options);
  if (pulled.error) {
    process.exitCode = 1;
    step.fail(pulled.error.message);
    return { counts: new Map<SkillPullOutcome, number>(), failed: 1 };
  }
  const home = cliEnv.RUNELAY_HOME;
  const counts = new Map<SkillPullOutcome, number>();
  let totalFailures = 0;
  for (const target of pulled.data) {
    const targetCounts = new Map<SkillPullOutcome, number>();
    for (const result of target.results) {
      targetCounts.set(result.outcome, (targetCounts.get(result.outcome) ?? 0) + 1);
      counts.set(result.outcome, (counts.get(result.outcome) ?? 0) + 1);
    }
    const line = [...targetCounts].map(([outcome, total]) => `${total} ${OUTCOME_LABELS[outcome]}`).join(" · ");
    const targetFailures = target.results.filter((result) => result.outcome === "failed");
    totalFailures += targetFailures.length;
    const changed = (targetCounts.get("created") ?? 0) + (targetCounts.get("updated") ?? 0) > 0;
    step.row(
      formatRow({
        tone: targetFailures.length ? "warn" : changed ? "ok" : "skip",
        name: target.agent,
        message: `${shortPath(target.path, home)} ${dim(`· ${line || "no active skills on the server"}`)}`,
      }),
    );
    for (const failed of targetFailures)
      step.row(formatRow({ tone: "error", name: failed.slug, message: failed.message ?? "failed" }));
  }
  const summary = [...counts].map(([outcome, total]) => `${total} ${OUTCOME_LABELS[outcome]}`).join(" · ");
  const targetLabel = plural(pulled.data.length, "target", "targets");
  if (totalFailures) {
    process.exitCode = 1;
    step.warn(`${targetLabel} · ${summary}`);
  } else step.done(summary ? `${targetLabel} · ${summary}` : "no active skills on the server");
  return { counts, failed: totalFailures };
};

export const describeSkillCounts = (counts: Map<SkillPullOutcome, number>) =>
  (["created", "updated", "unchanged"] as const)
    .map((outcome) => `${counts.get(outcome) ?? 0} ${OUTCOME_LABELS[outcome]}`)
    .join(" · ");

export const runPull = async (connection: Connection, options: PullOptions = {}) => {
  const briefs = await writeInstructionBriefs(connection, options.agents);
  const skills = await pullSkills(connection, options);
  return { files: briefs.current, counts: skills.counts, warnings: briefs.failed + skills.failed };
};

export const pullCommand = async (args: string[] = []): Promise<Result<null>> => {
  const parsed = parsePullOptions(args);
  if (parsed.error) return parsed;
  const connection = resolveConnection();
  if (connection.error) return connection;
  const pulled = await runPull(connection.data, parsed.data);
  printCard({
    title: "Pulled",
    stats: [
      ["Instructions", `${plural(pulled.files, "agent", "agents")} with the runelay rule`],
      ["Skills", describeSkillCounts(pulled.counts)],
      ["Warnings", String(pulled.warnings)],
    ],
    next: "runelay doctor",
  });
  return ok(null);
};

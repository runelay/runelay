import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fail, ok, type SkillExportView, type SkillListItemView } from "@runelay/shared";
import { parsePullOptions } from "@/commands/pull.command";
import { SKILL_MARKER_FILE } from "@/constants/cli.constants";
import { skillTargetsFor } from "@/constants/context.constants";
import type { Connection } from "@/types/config.types";
import { materializeSkills, resolveSkillTargets, type SkillMaterializeDeps } from "../skill-materializer.service";

const tempDirs: string[] = [];

const makeTempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), "runelay-skills-test-"));
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  while (tempDirs.length) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

const CONNECTION: Connection = { url: "http://localhost:4312", apiKey: "rnl_test", fromEnv: true };

describe("resolveSkillTargets", () => {
  test("auto-detects installed agent root directories and skips absent ones", () => {
    const home = makeTempDir();
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".cursor"), { recursive: true });
    mkdirSync(join(home, ".agents"), { recursive: true });
    mkdirSync(join(home, ".gemini", "antigravity"), { recursive: true });

    const targets = skillTargetsFor(home);
    const resolved = resolveSkillTargets({
      customDir: undefined,
      targets,
      fallbackDir: join(home, ".claude", "skills"),
    });
    expect(resolved.error).toBeNull();
    expect(resolved.data?.map((item) => item.id)).toEqual(["claude", "agents", "cursor", "gemini", "antigravity"]);
  });

  test("falls back to default claude dir when no agent exists", () => {
    const home = makeTempDir();
    const targets = skillTargetsFor(home);
    const resolved = resolveSkillTargets({
      customDir: undefined,
      targets,
      fallbackDir: join(home, ".claude", "skills"),
    });
    expect(resolved.error).toBeNull();
    expect(resolved.data?.map((item) => item.id)).toEqual(["claude"]);
  });

  test("respects customDir, explicit agents filter, and rejects unknown agents", () => {
    const home = makeTempDir();
    const targets = skillTargetsFor(home);
    const custom = resolveSkillTargets({ customDir: join(home, "custom-skills"), targets });
    expect(custom.data).toEqual([{ id: "custom", agent: "Custom", path: join(home, "custom-skills") }]);

    const explicit = resolveSkillTargets({
      customDir: undefined,
      agents: ["gemini", "antigravity", "gemini"],
      targets,
    });
    expect(explicit.data?.map((item) => item.id)).toEqual(["gemini", "antigravity"]);

    const invalid = resolveSkillTargets({ customDir: undefined, agents: ["unknown"], targets });
    expect(invalid.error?.code).toBe("INVALID_INPUT");
  });
});

describe("parsePullOptions", () => {
  test("parses --agents, -a, --skills-dir and rejects unknown flags or agents", () => {
    expect(parsePullOptions(["--agents", "claude,antigravity", "-a", "opencode"])).toEqual(
      ok({ agents: ["claude", "antigravity", "opencode"], customDir: undefined }),
    );
    expect(parsePullOptions(["--agents=cursor,agents", "--skills-dir=/tmp/skills"])).toEqual(
      ok({ agents: ["cursor", "agents"], customDir: "/tmp/skills" }),
    );
    expect(parsePullOptions(["--skills-dir", "/tmp/custom"])).toEqual(
      ok({ agents: undefined, customDir: "/tmp/custom" }),
    );
    expect(parsePullOptions(["--agents", "nope"]).error?.code).toBe("INVALID_INPUT");
    expect(parsePullOptions(["--unknown"]).error?.code).toBe("INVALID_INPUT");
  });
});

describe("materializeSkills", () => {
  test("propagates skills across all target agents, exports once, and preserves local folders per target", async () => {
    const home = makeTempDir();
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".cursor"), { recursive: true });
    mkdirSync(join(home, ".gemini", "config"), { recursive: true });

    const cursorLocalDir = join(home, ".cursor", "skills", "pr");
    mkdirSync(cursorLocalDir, { recursive: true });
    writeFileSync(join(cursorLocalDir, "SKILL.md"), "# custom local cursor skill\n");

    const listItem: SkillListItemView = {
      slug: "pr",
      name: "pr",
      description: "PR template",
      enabled: true,
      fileCount: 1,
      updatedAt: "2026-11-18T12:00:00.000Z",
    };

    const exportedSkill: SkillExportView = {
      ...listItem,
      body: "Use this PR template.",
      files: [{ path: "examples/body.md", content: "Example body\n" }],
      createdAt: "2026-11-18T10:00:00.000Z",
    };

    let exportCalls = 0;
    const deps: SkillMaterializeDeps = {
      listEnabledSkills: async () => ok([listItem]),
      exportSkills: async (_conn, slugs) => {
        exportCalls += 1;
        expect(slugs).toEqual(["pr"]);
        return ok([exportedSkill]);
      },
    };

    const targets = skillTargetsFor(home).filter((target) => ["claude", "cursor", "antigravity"].includes(target.id));

    const firstRun = await materializeSkills(CONNECTION, { customDir: undefined, targets, deps });
    expect(firstRun.error).toBeNull();
    expect(firstRun.data?.map((summary) => [summary.id, summary.results[0]?.outcome])).toEqual([
      ["claude", "created"],
      ["cursor", "local"],
      ["antigravity", "created"],
    ]);
    expect(exportCalls).toBe(1);

    expect(existsSync(join(home, ".claude", "skills", "pr", "SKILL.md"))).toBe(true);
    expect(existsSync(join(home, ".gemini", "config", "skills", "pr", "examples", "body.md"))).toBe(true);
    expect(readFileSync(join(home, ".claude", "skills", "pr", SKILL_MARKER_FILE), "utf8").trim()).toBe(
      "2026-11-18T12:00:00.000Z",
    );
    expect(readFileSync(join(cursorLocalDir, "SKILL.md"), "utf8")).toBe("# custom local cursor skill\n");

    const secondRun = await materializeSkills(CONNECTION, { customDir: undefined, targets, deps });
    expect(secondRun.error).toBeNull();
    expect(secondRun.data?.map((summary) => [summary.id, summary.results[0]?.outcome])).toEqual([
      ["claude", "unchanged"],
      ["cursor", "local"],
      ["antigravity", "unchanged"],
    ]);
    expect(exportCalls).toBe(1);
  });

  test("records failure per target when exportSkills fails", async () => {
    const home = makeTempDir();
    mkdirSync(join(home, ".claude"), { recursive: true });
    mkdirSync(join(home, ".gemini", "config"), { recursive: true });

    const listItem: SkillListItemView = {
      slug: "tdd",
      name: "tdd",
      description: "TDD",
      enabled: true,
      fileCount: 0,
      updatedAt: "2026-11-18T12:00:00.000Z",
    };

    const deps: SkillMaterializeDeps = {
      listEnabledSkills: async () => ok([listItem]),
      exportSkills: async () => fail("UPSTREAM_FAILED", "server offline"),
    };

    const targets = skillTargetsFor(home).filter((target) => ["claude", "antigravity"].includes(target.id));
    const result = await materializeSkills(CONNECTION, { customDir: undefined, targets, deps });
    expect(result.error).toBeNull();
    expect(
      result.data?.map((summary) => [summary.id, summary.results[0]?.outcome, summary.results[0]?.message]),
    ).toEqual([
      ["claude", "failed", "server offline"],
      ["antigravity", "failed", "server offline"],
    ]);
  });
});

import type { ContextClient } from "@runelay/shared";
import { cliEnv } from "@/config/env";
import type {
  AgentDirectory,
  InstructionFile,
  InstructionTarget,
  InstructionTargetDirs,
  SkillTarget,
} from "@/types/context.types";

const HOME = cliEnv.RUNELAY_HOME;

const OPENCODE_DIR = `${cliEnv.XDG_CONFIG_HOME ?? `${HOME}/.config`}/opencode`;

export const CLAUDE_PROJECTS_DIR = `${HOME}/.claude/projects`;

export const CURRENT_PROJECT_MEMORY_DIR = `${CLAUDE_PROJECTS_DIR}/${process.cwd().replaceAll("/", "-")}/memory`;

export const skillTargetsFor = (home: string, dirs: Pick<InstructionTargetDirs, "configHome"> = {}): SkillTarget[] => {
  const configHome = dirs.configHome ?? `${home}/.config`;
  return [
    { id: "claude", agent: "Claude Code", path: `${home}/.claude/skills` },
    { id: "agents", agent: "Agents (universal)", path: `${home}/.agents/skills` },
    { id: "codex", agent: "Codex", path: `${home}/.codex/skills` },
    { id: "cursor", agent: "Cursor", path: `${home}/.cursor/skills` },
    { id: "grok", agent: "Grok", path: `${home}/.grok/skills` },
    { id: "gemini", agent: "Gemini", path: `${home}/.gemini/skills` },
    {
      id: "antigravity",
      agent: "Antigravity",
      path: `${home}/.gemini/config/skills`,
      detect: [`${home}/.gemini/config`, `${home}/.gemini/antigravity`],
    },
    { id: "opencode", agent: "OpenCode", path: `${configHome}/opencode/skills` },
  ];
};

export const SKILL_TARGETS: SkillTarget[] = skillTargetsFor(HOME, {
  configHome: cliEnv.XDG_CONFIG_HOME,
});

const deduplicateDirectories = (entries: AgentDirectory[]): AgentDirectory[] => {
  const seen = new Set<string>();
  return entries.filter(({ path }) => {
    if (seen.has(path)) return false;
    seen.add(path);
    return true;
  });
};

export const SKILL_SOURCES: AgentDirectory[] = cliEnv.RUNELAY_SKILLS_DIR
  ? [{ agent: "Custom", path: cliEnv.RUNELAY_SKILLS_DIR }]
  : deduplicateDirectories([
      ...SKILL_TARGETS.map(({ agent, path }) => ({ agent, path })),
      { agent: "Cursor", path: `${HOME}/.cursor/skills-cursor` },
      { agent: "Antigravity", path: `${HOME}/.gemini/antigravity-cli/skills` },
    ]);

export const EXTRA_MEMORY_SOURCES: AgentDirectory[] = [{ agent: "Codex", path: `${HOME}/.codex/memories` }];

export const INSTRUCTION_SOURCES: InstructionFile[] = [
  { agent: "Claude Code", path: `${HOME}/.claude/CLAUDE.md`, slug: "instrucoes-globais-claude-code" },
  { agent: "Codex", path: `${HOME}/.codex/AGENTS.md`, slug: "instrucoes-globais-codex" },
  { agent: "Grok", path: `${HOME}/.grok/AGENTS.md`, slug: "instrucoes-globais-grok" },
  { agent: "Gemini", path: `${HOME}/.gemini/GEMINI.md`, slug: "instrucoes-globais-gemini" },
  { agent: "OpenCode", path: `${OPENCODE_DIR}/AGENTS.md`, slug: "instrucoes-globais-opencode" },
  { agent: "Agents (home)", path: `${HOME}/AGENTS.md`, slug: "instrucoes-globais-agents-home" },
];

export const MEMORY_INDEX_FILE = "MEMORY.md";

export const PINNED_SECTION = "## Regras de ouro";

export const SKILL_ENTRY_FILE = "SKILL.md";

export const SKILL_FILE_MAX_BYTES = 200 * 1024;

export const SKILL_FILES_MAX = 200;

export const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", ".venv", "__pycache__", "dist", "build"]);

export const BINARY_EXTENSIONS =
  /\.(png|jpe?g|gif|webp|ico|icns|pdf|zip|gz|tgz|tar|woff2?|ttf|otf|mp3|mp4|mov|wav|webm|sqlite|db|wasm|so|dylib|exe|bin|psd|fig|sketch|heic|pyc|class|jar|DS_Store)$/i;

export const MEMORY_BATCH_SIZE = 200;

export const SKILL_BATCH_SIZE = 20;

export const LIMITS = {
  memoryName: 200,
  memoryDescription: 400,
  memoryBody: 100_000,
  skillName: 200,
  skillDescription: 2000,
  skillBody: 200_000,
  filePath: 300,
};

export const CONTEXT_START_MARKER = "<!-- runelay:start -->";

export const CONTEXT_END_MARKER = "<!-- runelay:end -->";

export const RUNELAY_TOOLS = [
  "search_context",
  "read_memory",
  "write_memory",
  "read_skill",
  "read_skill_file",
  "write_skill",
  "write_skill_file",
  "import_memory",
  "search_tools",
  "list_connections",
] as const;

const MEMORY_RULES = [
  "runelay is your memory.",
  "Before answering anything about the user, their projects or their preferences, call the runelay `search_context` tool first, then open what matters with `read_memory` or `read_skill`.",
  "Save new facts with `write_memory`; when a similar memory already exists, update that slug instead of creating a new one.",
  "Save skills only with `write_skill`.",
  "Never look for memory in local transcripts, chat history, session logs or memory files on disk.",
].join(" ");

const CLAUDE_TOOL_SEARCH =
  "The runelay MCP tools are deferred; load them at the start of the session with `ToolSearch select:mcp__runelay__search_context,mcp__runelay__read_memory,mcp__runelay__write_memory,mcp__runelay__write_skill`.";

export const briefLeadFor = (client: ContextClient) =>
  `**runelay first:** ${client === "claude" ? `${CLAUDE_TOOL_SEARCH} ` : ""}${MEMORY_RULES}`;

export const instructionTargetsFor = (home: string, dirs: InstructionTargetDirs = {}): InstructionTarget[] => {
  const configHome = dirs.configHome ?? `${home}/.config`;
  const kimi = dirs.kimiHome ?? `${home}/.kimi-code`;
  return [
    {
      id: "claude",
      name: "Claude Code",
      detect: `${home}/.claude`,
      file: `${home}/.claude/CLAUDE.md`,
      client: "claude",
    },
    { id: "codex", name: "Codex", detect: `${home}/.codex`, file: `${home}/.codex/AGENTS.md`, client: "codex" },
    { id: "grok", name: "Grok", detect: `${home}/.grok`, file: `${home}/.grok/AGENTS.md`, client: "grok" },
    { id: "gemini", name: "Gemini", detect: `${home}/.gemini`, file: `${home}/.gemini/GEMINI.md`, client: "codex" },
    {
      id: "opencode",
      name: "OpenCode",
      detect: `${configHome}/opencode`,
      file: `${configHome}/opencode/AGENTS.md`,
      client: "codex",
    },
    { id: "kimi", name: "Kimi Code", detect: kimi, file: `${kimi}/AGENTS.md`, client: "codex" },
    { id: "hermes", name: "Hermes Agent", detect: `${home}/.hermes`, file: `${home}/.hermes/SOUL.md`, client: "codex" },
    {
      id: "openclaw",
      name: "OpenClaw",
      detect: `${home}/.openclaw`,
      file: `${home}/.openclaw/workspace/AGENTS.md`,
      client: "codex",
    },
  ];
};

export const INSTRUCTION_TARGETS = instructionTargetsFor(HOME, {
  configHome: cliEnv.XDG_CONFIG_HOME,
  kimiHome: cliEnv.KIMI_CODE_HOME,
});

export const MANUAL_INSTRUCTION_STEPS: { agent: string; detect: string; step: string }[] = [
  {
    agent: "Cursor",
    detect: `${HOME}/.cursor`,
    step: "paste the runelay rule in Settings > Rules > User Rules",
  },
];

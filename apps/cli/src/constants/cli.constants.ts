import { join } from "node:path";
import { cliEnv } from "@/config/env";

export const CONFIG_DIR = join(cliEnv.XDG_CONFIG_HOME || join(cliEnv.RUNELAY_HOME, ".config"), "runelay");

export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

export const PUSH_STATE_FILE = join(CONFIG_DIR, "state.json");

export const SERVER_ENV_FILE = join(cliEnv.RUNELAY_HOME, "runelay", ".env");

export const DESKTOP_DISCOVERY_FILE = join(cliEnv.RUNELAY_HOME, ".runelay", "desktop.json");

export const LOCAL_SERVER_URL = "http://localhost:4312";

export const HEALTH_TIMEOUT_MS = 2500;

export const SKILL_MARKER_FILE = ".runelay";

export const SKILLS_TARGET_DIR = join(cliEnv.RUNELAY_HOME, ".claude", "skills");

export const SKILL_PAGE_SIZE = 100;

export const AGENT_KEY_NAME_MAX = 64;

export const NO_BROWSER_FLAG = "--no-browser";

export interface CommandGuide {
  usage: string;
  summary: string;
  details?: string;
}

export const COMMAND_GUIDE = {
  setup: {
    usage: "setup [url]",
    summary: "Set up everything in one go: login, connect, migrate, pull and doctor",
    details: "--no-browser prints the sign-in link instead of opening it, --verbose shows every detail",
  },
  login: { usage: "login [url]", summary: "Sign in through the browser and save this computer's key" },
  connect: {
    usage: "connect",
    summary: "Register the runelay MCP in Claude Code, Codex, Cursor, Grok and more",
    details: "and turn off native memory where the agent has it",
  },
  migrate: {
    usage: "migrate",
    summary: "Bring everything from your agents at once, accounts already connected",
    details: "--yes skips the confirmation, --replace leaves only runelay in the agents",
  },
  push: { usage: "push", summary: "Send memories, skills and instructions from your local agents" },
  pull: {
    usage: "pull",
    summary: "Write the runelay rule to every agent's global instructions and fetch new skills",
    details: "--agents claude,codex,cursor,grok,gemini,antigravity,opencode,agents | --skills-dir <path>",
  },
  skills: {
    usage: "skills add <source>",
    summary: "Add a skill from GitHub, skills.sh or a local file",
    details: "--skill <name or path> picks a skill, --list shows what's available",
  },
  sync: {
    usage: "sync",
    summary: "push, then pull",
    details: "accepts the same --agents and --skills-dir flags as pull",
  },
  status: { usage: "status", summary: "Show the server, your account and what is stored in it" },
  doctor: { usage: "doctor", summary: "Check that your agents use only runelay for memory and skills" },
  open: { usage: "open", summary: "Open the runelay dashboard in the browser" },
  import: { usage: "import", summary: "Turn the MCP servers configured in your agents into connections" },
  logout: { usage: "logout", summary: "Revoke this computer's key and clear the config" },
  sponsor: { usage: "sponsor", summary: "Support runelay on GitHub Sponsors" },
  help: { usage: "help", summary: "Show this help (or <command> --help)" },
} as const satisfies Record<string, CommandGuide>;

export type GuideName = keyof typeof COMMAND_GUIDE;

export const COMMAND_GROUPS: { title: string; commands: GuideName[] }[] = [
  { title: "Get started", commands: ["setup", "login", "connect", "migrate"] },
  { title: "Daily", commands: ["push", "pull", "sync", "skills", "status", "doctor"] },
  { title: "Other", commands: ["open", "import", "logout", "sponsor", "help"] },
];

export const COMMAND_ALIASES = {
  "import-context": "push",
  "sync-context": "pull",
  "install-clients": "connect",
} as const;

export const GLOBAL_FLAGS: [string, string][] = [
  ["--json", "print the result as one JSON object on stdout (setup, migrate, push, connect, doctor)"],
  ["--no-motion", "turn off animations (also NO_COLOR, CI or RUNELAY_NO_MOTION=1)"],
  ["--verbose", "show error details"],
  ["-v, --version", "print the CLI version"],
  ["-h, --help", "show this help"],
];

export const HELP_INTRO = "Your memories, skills and connections, the same in every agent.";

export const HELP_USAGE = "runelay [command] [flags]   run it alone to open the menu";

export const HELP_FOOTER = "In CI, RUNELAY_URL and RUNELAY_API_KEY override the saved config.";

export const SPONSOR_URL = "https://github.com/sponsors/Andsu-dev";

export const SPONSOR_PROMPT = "Enjoying runelay? Sponsor:";

export const BANNER_COMMANDS = ["setup", "connect", "migrate", "doctor"];

export const HELP_NAMES = ["help", "--help", "-h"];

export const VERSION_NAMES = ["version", "--version", "-v"];

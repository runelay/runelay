import type { MessageKey } from "@/lib/i18n";
import { CLIENT_SNIPPETS } from "@/modules/api-keys/constants/client-snippets.constants";
import type { SetupStepDefinition, SetupStepId } from "@/modules/setup/types/setup.types";

export const SETUP_STEPS: SetupStepDefinition[] = [
  {
    id: "desktop",
    title: "setup.steps.desktop.title",
    description: "setup.steps.desktop.description",
    doneSummary: "setup.steps.desktop.doneSummary",
    skip: "setup.skip",
  },
  {
    id: "agents",
    title: "setup.steps.agents.title",
    description: "setup.steps.agents.description",
    doneSummary: "setup.steps.agents.doneSummary",
    skip: "setup.skip",
  },
  {
    id: "accounts",
    title: "setup.steps.accounts.title",
    description: "setup.steps.accounts.description",
    doneSummary: "setup.steps.accounts.doneSummary",
    skip: "setup.later",
  },
];

export const DESKTOP_VARIANT_STEPS: SetupStepId[] = ["agents", "accounts"];

export const SETUP_COMMAND = (origin: string) =>
  `curl -fsSL runelay.com/cli | sh && ~/.runelay/bin/runelay setup ${origin}`;

export const AGENT_POLL_MS = 3000;

export const AGENT_KEY_SEPARATOR = " · ";

export const DEFAULT_PROMPT_AGENT = "Cursor";

export const TIMELINE_EASE = [0.22, 1, 0.36, 1] as const;

export const DESKTOP_KEY_NAME = "runelay desktop";

export const DESKTOP_AUTO_STEPS: SetupStepId[] = ["desktop", "agents"];

export const DESKTOP_RETRY_CHECKS = ["leftover_memories", "skills"];

export const GUIDES_URL = "https://runelay.com/guides/";

const snippetLogo = (client: string) => CLIENT_SNIPPETS.find((snippet) => snippet.client === client)?.logo ?? null;

const singleLogo = (path: string) => ({ light: path, dark: path });

export const AGENT_LOGOS: Record<string, { light: string; dark: string; scale?: number } | null> = {
  claude: snippetLogo("Claude Code"),
  codex: snippetLogo("Codex"),
  grok: snippetLogo("Grok"),
  cursor: snippetLogo("Cursor"),
  gemini: snippetLogo("Gemini"),
  antigravity: snippetLogo("Antigravity"),
  opencode: snippetLogo("OpenCode"),
  kimi: singleLogo("/logos/kimi.png"),
  hermes: singleLogo("/logos/hermes.png"),
  openclaw: singleLogo("/logos/openclaw.png"),
  mausbot: singleLogo("/logos/mausbot.png"),
};

export const DESKTOP_ERROR_MESSAGES: Record<string, MessageKey> = {
  unsupported: "setup.desktop.errors.unsupported",
  missing_key: "setup.desktop.errors.missingKey",
  cli_failed: "setup.desktop.errors.cliFailed",
  UNAUTHORIZED: "setup.desktop.errors.unauthorized",
  RATE_LIMITED: "setup.desktop.errors.rateLimited",
  CONNECTION_FAILED: "setup.desktop.errors.unreachable",
  UPSTREAM_FAILED: "setup.desktop.errors.unreachable",
};

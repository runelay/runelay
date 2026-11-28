import { CLIENT_SNIPPETS } from "@/modules/api-keys/constants/client-snippets.constants";

const logoOf = (client: string) => CLIENT_SNIPPETS.find((snippet) => snippet.client === client)?.logo ?? null;

export const AGENT_LOGO_MATCHERS = [
  { pattern: /claude/i, logo: logoOf("Claude Code") },
  { pattern: /codex|openai|chatgpt/i, logo: logoOf("Codex") },
  { pattern: /grok/i, logo: logoOf("Grok") },
  { pattern: /cursor/i, logo: logoOf("Cursor") },
  { pattern: /gemini/i, logo: logoOf("Gemini") },
  { pattern: /antigravity/i, logo: logoOf("Antigravity") },
  { pattern: /opencode/i, logo: logoOf("OpenCode") },
];

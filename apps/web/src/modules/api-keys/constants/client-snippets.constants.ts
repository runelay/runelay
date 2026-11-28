import { SETUP_COMMAND } from "@/modules/setup/constants/setup.constants";

export const CLIENT_SNIPPETS = [
  {
    client: "Claude Code",
    logo: { light: "/logos/claude-ai-icon.svg", dark: "/logos/claude-ai-icon.svg" },
    file: "terminal",
    build: (url: string, key: string) =>
      `claude mcp add --scope user --transport http runelay ${url} --header "Authorization: Bearer ${key}"`,
  },
  {
    client: "Codex",
    logo: { light: "/logos/openai.svg", dark: "/logos/openai_dark.svg", scale: 1.3 },
    file: "~/.codex/config.toml",
    build: (url: string, key: string) =>
      `[mcp_servers.runelay]\nurl = "${url}"\nhttp_headers = { Authorization = "Bearer ${key}" }`,
  },
  {
    client: "Grok",
    logo: { light: "/logos/grok-light.svg", dark: "/logos/grok-dark.svg" },
    file: "~/.grok/config.toml",
    build: (url: string, key: string) =>
      `[mcp_servers.runelay]\nurl = "${url}"\nheaders = { Authorization = "Bearer ${key}" }`,
  },
  {
    client: "Cursor",
    logo: { light: "/logos/cursor_light.svg", dark: "/logos/cursor_dark.svg" },
    file: "~/.cursor/mcp.json",
    build: (url: string, key: string) =>
      JSON.stringify({ mcpServers: { runelay: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2),
  },
  {
    client: "Gemini",
    logo: { light: "/logos/gemini.svg", dark: "/logos/gemini.svg" },
    file: "~/.gemini/settings.json",
    build: (url: string, key: string) =>
      JSON.stringify(
        { mcpServers: { runelay: { url, type: "http", headers: { Authorization: `Bearer ${key}` } } } },
        null,
        2,
      ),
  },
  {
    client: "Antigravity",
    logo: { light: "/logos/antigravity.svg", dark: "/logos/antigravity.svg" },
    file: "~/.gemini/config/mcp_config.json",
    build: (url: string, key: string) =>
      JSON.stringify(
        { mcpServers: { runelay: { serverUrl: url, headers: { Authorization: `Bearer ${key}` } } } },
        null,
        2,
      ),
  },
  {
    client: "OpenCode",
    logo: { light: "/logos/opencode.png", dark: "/logos/opencode.png" },
    file: "~/.config/opencode/opencode.json",
    build: (url: string, key: string) =>
      JSON.stringify(
        {
          mcp: {
            runelay: { type: "remote", url, enabled: true, oauth: false, headers: { Authorization: `Bearer ${key}` } },
          },
        },
        null,
        2,
      ),
  },
  {
    client: "Todos de uma vez",
    labelKey: "apiKeys.snippets.allClients",
    logo: null,
    file: "no seu computador",
    fileKey: "apiKeys.snippets.allClientsFile",
    build: (_url: string, _key: string) => SETUP_COMMAND(window.location.origin),
  },
] as const;

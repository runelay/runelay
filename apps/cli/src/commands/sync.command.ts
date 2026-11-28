import { ok, type Result } from "@runelay/shared";
import { describeSkillCounts, parsePullOptions, runPull } from "@/commands/pull.command";
import { describePushCounts, runPush } from "@/commands/push.command";
import { plural } from "@/lib/format";
import { printCard } from "@/lib/ui";
import { resolveConnection } from "@/services/config.service";

export const syncCommand = async (args: string[] = []): Promise<Result<null>> => {
  const parsed = parsePullOptions(args);
  if (parsed.error) return parsed;
  const connection = resolveConnection();
  if (connection.error) return connection;
  const pushed = await runPush(connection.data);
  if (pushed.error) return pushed;
  const pulled = await runPull(connection.data, parsed.data);
  printCard({
    title: "Synced",
    stats: [
      ["Memories", describePushCounts(pushed.data.memories)],
      ["Skills sent", describePushCounts(pushed.data.skills)],
      ["Skills pulled", describeSkillCounts(pulled.counts)],
      ["Instructions", `${plural(pulled.files, "file", "files")} updated`],
      ["Warnings", String(pulled.warnings)],
    ],
    next: pulled.warnings ? "runelay doctor" : "runelay status",
  });
  return ok(null);
};

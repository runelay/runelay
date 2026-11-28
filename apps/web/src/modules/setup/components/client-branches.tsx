import { Key01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/action/button";
import { CommandBlock } from "@/components/ui/display/command-block";
import { translateError, useT } from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { apiKeysQuery, createApiKey } from "@/modules/api-keys/api/api-keys.api";
import { CLIENT_SNIPPETS } from "@/modules/api-keys/constants/client-snippets.constants";
import { setRecentKey } from "@/modules/api-keys/stores/recent-key.store";
import { MCP_PATH } from "@/modules/settings/constants/settings.constants";
import { TIMELINE_EASE } from "@/modules/setup/constants/setup.constants";
import { ClientChip } from "./client-chip";

const FORK = "M1 0 C1 14, 8 20, 24 20";

const MANUAL_SNIPPETS = CLIENT_SNIPPETS.filter((snippet) => !("labelKey" in snippet));

export function ClientBranches() {
  const t = useT();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const url = `${window.location.origin}${MCP_PATH}`;
  const labelOf = (snippet: (typeof CLIENT_SNIPPETS)[number]) =>
    "labelKey" in snippet ? t(snippet.labelKey) : snippet.client;
  const active = MANUAL_SNIPPETS.find((snippet) => snippet.client === selected);

  const create = useMutation({
    mutationFn: ({ name }: { client: string; name: string }) => createApiKey({ name }),
    onSuccess: (created, { client }) => {
      setKeys((current) => ({ ...current, [client]: created.key }));
      setRecentKey(created.key);
      return queryClient.invalidateQueries({ queryKey: apiKeysQuery.queryKey });
    },
    onError: (error) => toast(translateError(error), "error"),
  });

  const generate = (snippet: (typeof CLIENT_SNIPPETS)[number]) =>
    create.mutate({ client: snippet.client, name: labelOf(snippet) });

  const select = (snippet: (typeof CLIENT_SNIPPETS)[number]) => {
    setSelected(snippet.client);
    const pending = create.isPending && create.variables?.client === snippet.client;
    if (!keys[snippet.client] && !pending) generate(snippet);
  };

  const activeKey = active ? keys[active.client] : undefined;
  const activePending = Boolean(active) && create.isPending && create.variables?.client === active?.client;

  return (
    <div className="relative pl-8">
      <svg aria-hidden viewBox="0 0 26 22" className="absolute top-0 left-0 h-[22px] w-[26px] overflow-visible">
        <motion.path
          d={FORK}
          fill="none"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, ease: TIMELINE_EASE, delay: 0.1 }}
          className="stroke-foreground/40"
        />
      </svg>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {MANUAL_SNIPPETS.map((snippet, order) => (
            <ClientChip
              key={snippet.client}
              client={labelOf(snippet)}
              logo={snippet.logo}
              order={order}
              selected={selected === snippet.client}
              onSelect={() => select(snippet)}
            />
          ))}
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {active && (
            <motion.div
              key={active.client}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
              transition={{ duration: 0.35, ease: TIMELINE_EASE }}
              className="flex flex-col gap-1.5"
            >
              <span className="text-xs text-muted-foreground">
                {"fileKey" in active ? t(active.fileKey) : active.file}
              </span>
              {activeKey ? (
                <>
                  <CommandBlock
                    value={active.build(url, activeKey)}
                    secret={activeKey}
                    label={t("setup.copyClientConfig", { client: labelOf(active) })}
                  />
                  <span className="text-xs text-pretty text-muted-foreground">
                    {t("setup.agentKey.onceNote", { client: labelOf(active) })}{" "}
                    <Link to="/api-keys" className="font-medium text-foreground underline-offset-4 hover:underline">
                      {t("setup.desktop.manual.keysLink")}
                    </Link>
                    .
                  </span>
                </>
              ) : (
                <Button
                  size="sm"
                  className="cursor-pointer self-start"
                  loading={activePending}
                  loadingText={t("setup.agentKey.creating", { client: labelOf(active) })}
                  onClick={() => generate(active)}
                >
                  <HugeiconsIcon icon={Key01Icon} strokeWidth={1.6} />
                  {t("setup.agentKey.create", { client: labelOf(active) })}
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

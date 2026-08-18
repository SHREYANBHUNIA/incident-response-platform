import { z } from "zod";
import { getConfig, setConfig } from "../db";
import { publicProcedure, router } from "../_core/trpc";

export const configRouter = router({
  slack: publicProcedure.query(async () => {
    const value = await getConfig("slack_webhook_url");
    return { configured: Boolean(value?.value), masked: value?.value ? `${value.value.slice(0, 24)}…` : null };
  }),
  setSlackWebhook: publicProcedure.input(z.object({ webhookUrl: z.string().url().or(z.literal("")) })).mutation(async ({ input }) => {
    await setConfig("slack_webhook_url", input.webhookUrl.trim() || null);
    return { configured: Boolean(input.webhookUrl.trim()) };
  }),
});

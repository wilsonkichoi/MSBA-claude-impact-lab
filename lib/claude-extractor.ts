/**
 * SERVER ONLY. Imported exclusively by app/api routes.
 * Reads ANTHROPIC_API_KEY from the server environment; never sent to the browser.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { EXTRACTION_SYSTEM_PROMPT, modelOutputSchema, type ModelExtractor } from "./notice-extraction";

/** Optional override for another extraction task (Pencil's program re-check). Omitted → HomeStay's notice task. */
export type SdkExtractionTask = { systemPrompt: string; schema: z.ZodType; wrap: (text: string) => string };

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5";

export function getClaudeExtractor(task?: SdkExtractionTask): ModelExtractor | null {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_ANTHROPIC_MODEL;
  const client = new Anthropic({ apiKey, maxRetries: 1 });

  return async (text, signal) => {
    const message = await client.messages.parse(
      {
        model,
        max_tokens: 2048,
        system: task?.systemPrompt ?? EXTRACTION_SYSTEM_PROMPT,
        messages: [{ role: "user", content: task ? task.wrap(text) : `<notice>\n${text}\n</notice>` }],
        output_config: { format: zodOutputFormat(task?.schema ?? modelOutputSchema) },
      },
      { signal },
    );
    if (message.parsed_output == null) throw new Error("No structured output returned");
    return message.parsed_output;
  };
}

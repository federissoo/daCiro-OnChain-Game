import Anthropic from "@anthropic-ai/sdk";
import { parseEther } from "viem";
import { Message } from "../session-store";
import { PROMPTS } from "../prompts";
import { getVaultBalance } from "./blockchain";
import { logSession } from "./logger";

const USE_CHEAP_MODELS = process.env.USE_CHEAP_MODELS === "true";
const IS_PROD = process.env.NODE_ENV === "production" && !USE_CHEAP_MODELS;

const BASE_CIRO_MODEL = IS_PROD
  ? "claude-haiku-4-5-20251001"
  : "claude-3-haiku-20240307";

const PREMIUM_CIRO_MODEL = "claude-sonnet-4-6-20251001";
const SONNET_THRESHOLD = parseEther("0.1");

const JUDGE_MODEL = IS_PROD
  ? "claude-haiku-4-5-20251001"
  : "claude-3-haiku-20240307";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role === "player" ? "user" : "assistant",
    content: m.text,
  }));
}

async function getCiroModel(): Promise<string> {
  try {
    const vaultBalance = await getVaultBalance();
    if (vaultBalance >= SONNET_THRESHOLD) {
      return PREMIUM_CIRO_MODEL;
    }
  } catch (error) {
    console.error("Failed to read vault balance for model selection:", error);
  }

  return BASE_CIRO_MODEL;
}

export async function judgeSurrender(messages: Message[], lang: "it" | "en" = "it") {
  const conversation = messages
    .map((m) => `${m.role === "player" ? "GIOCATORE" : "CIRO"}: ${m.text}`)
    .join("\n");

  const content =
    lang === "en"
      ? `Analyze this conversation and return the JSON:\n\n${conversation}`
      : `Analizza questa conversazione e restituisci il JSON:\n\n${conversation}`;

  const response = await client.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 60,
    system: PROMPTS[lang].JUDGE_PROMPT,
    messages: [{ role: "user", content }],
  });

  const textBlock = response.content[0];
  if (textBlock.type === "text") {
    try {
      const match = textBlock.text.match(/\{[\s\S]*?\}/);
      const parsed = match ? JSON.parse(match[0]) : JSON.parse(textBlock.text);

      return {
        ...parsed,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      };
    } catch (e) {
      console.error("JSON parse error on:", textBlock.text);
      return { surrender: 0, reason: "Error parsing JSON", inputTokens: 0, outputTokens: 0 };
    }
  }

  return { surrender: 0, reason: "No text response", inputTokens: 0, outputTokens: 0 };
}

export async function streamCiroResponse(
  messages: Message[],
  lang: "it" | "en" = "it",
  onToken: (token: string) => void,
) {
  const stream = client.messages.stream({
    model: await getCiroModel(),
    max_tokens: 200,
    system: PROMPTS[lang].CIRO_PROMPT,
    messages: toAnthropicMessages(messages),
  });

  let fullResponse = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      fullResponse += event.delta.text;
      onToken(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();

  return {
    text: fullResponse,
    inputTokens: finalMessage.usage.input_tokens,
    outputTokens: finalMessage.usage.output_tokens,
  };
}

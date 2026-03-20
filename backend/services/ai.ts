import Anthropic from "@anthropic-ai/sdk";
import { Message } from "../session-store";
import { PROMPTS } from "../prompts";

const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages.map(m => ({
        role: m.role === "player" ? "user" : "assistant",
        content: m.text
    }));
}

export async function judgeSurrender(messages: Message[], lang: 'it' | 'en' = 'it') {
    // costruiamo la conversazione come testo da analizzare
    const conversation = messages
        .map(m => `${m.role === "player" ? "GIOCATORE" : "CIRO"}: ${m.text}`)
        .join("\n");

    const content = lang === 'en' 
        ? `Analyze this conversation and return the JSON:\n\n${conversation}`
        : `Analizza questa conversazione e restituisci il JSON:\n\n${conversation}`;

    const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 60,
        system: PROMPTS[lang].JUDGE_PROMPT,
        messages: [
            {
                role: "user",
                content
            }
        ],
    });

    const textBlock = response.content[0];
    if (textBlock.type === "text") {
        try {
            const match = textBlock.text.match(/\{[\s\S]*?\}/);
            if (match) {
                return JSON.parse(match[0]);
            }
            return JSON.parse(textBlock.text);
        } catch (e) {
            console.error("JSON parse error on:", textBlock.text);
            return { surrender: 0, reason: "Error parsing JSON" };
        }
    }

    return { surrender: 0, reason: "No text response" };
}

export async function streamCiroResponse(messages: Message[], lang: 'it' | 'en' = 'it', onToken: (token: string) => void) {
    const stream = client.messages.stream({
        model: "claude-sonnet-4-20250514",
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

    return fullResponse;
}

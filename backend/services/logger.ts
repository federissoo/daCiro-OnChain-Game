import { appendFileSync } from "fs";

export function logSession(
    sessionId: string,
    tokensIn: number,
    tokensOut: number
) {
    const line = `[${new Date().toISOString()}] session=${sessionId} in=${tokensIn} out=${tokensOut}\n`;
    appendFileSync("session-logs.txt", line);
}

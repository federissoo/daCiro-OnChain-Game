import { appendFileSync } from "fs";

export function logSession(
    sessionId: string,
    tokensIn: number,
    tokensOut: number
) {
    const line = `[${new Date().toISOString()}] session=${sessionId} in=${tokensIn} out=${tokensOut}`;
    console.log(line);
    appendFileSync("session-logs.txt", line + "\n");
}

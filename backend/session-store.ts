export type Message = {
    role: "player" | "bot";
    text: string;
}

export type Session = {
    sessionId: string,
    playerName: string,
    surrenderScore: number,
    surrenderHistory: number[],
    messages: Message[],
    startedAt: Date,
    status: "playing" | "won" | "lost",
}

const sessions: Map<string, Session> = new Map();

export function createSession(playerName: string): Session {
    const session: Session = {
        sessionId: crypto.randomUUID(),
        playerName,
        surrenderScore: 0,
        surrenderHistory: [],
        messages: [],
        startedAt: new Date(),
        status: "playing",
    };
    sessions.set(session.sessionId, session);
    return session;
}

export function getSession(sessionId: string): Session | undefined {
    return sessions.get(sessionId);
}

export function updateSession(sessionId: string, session: Partial<Session>): void {
    if (!sessions.has(sessionId)) {
        throw new Error("Session not found");
    }
    sessions.set(sessionId, { ...sessions.get(sessionId)!, ...session });
}

export function deleteSession(sessionId: string): void {
    sessions.delete(sessionId);
}

export function isExpired(session: Session): boolean {
    const now = Date.now();
    const sessionDuration = now - session.startedAt.getTime();
    return sessionDuration > 1000 * 90;
}

export function isSurrendered(session: Session): boolean {
    return session.surrenderScore >= 100;
}

export function computeSurrenderScore(history: number[]): number {
    if (history.length === 0) return 0;
    const sum = history.reduce((a, b) => a + b, 0);
    return Math.round(sum / history.length);
}
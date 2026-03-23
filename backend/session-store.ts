export type Message = {
    role: "player" | "bot";
    text: string;
}

export type Session = {
    sessionId: string,
    playerName: string,
    lang: 'it' | 'en',
    surrenderScore: number,
    surrenderHistory: number[],
    messages: Message[],
    startedAt: Date,
    status: "playing" | "won" | "lost",
}

const sessions: Map<string, Session> = new Map();
const usedTxHashes: Set<string> = new Set();

// Anti-abuse: max number of player messages allowed per session
export const MAX_MESSAGES_PER_SESSION = 20;
// Anti-abuse: max length (characters) of a single player message
export const MAX_MESSAGE_LENGTH = 500;

export function isTxHashUsed(txHash: string): boolean {
    return usedTxHashes.has(txHash);
}

export function markTxHashAsUsed(txHash: string): void {
    usedTxHashes.add(txHash);
}

export function createSession(playerName: string, lang: 'it' | 'en' = 'it'): Session {
    const session: Session = {
        sessionId: crypto.randomUUID(),
        playerName,
        lang,
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
    if (history.some(score => score >= 100)) return 100;
    
    // Il "danno" primario è la tua frase migliore assoluta
    const maxScore = Math.max(...history);
    
    // Un bonus per lo sfinimento psicologico (20% della media globale dei tuoi tentativi)
    const sum = history.reduce((acc, score) => acc + score, 0);
    const average = sum / history.length;
    
    // Punteggio = Danno massimo + Logoramento (cappato a 100)
    return Math.min(100, Math.round(maxScore + (average * 0.2)));
}
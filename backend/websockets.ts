import { WebSocketServer, WebSocket } from "ws";
import { getSession, updateSession, isExpired, isSurrendered, computeSurrenderScore } from "./session-store";
import { streamCiroResponse, judgeSurrender } from "./services/ai";

export const sessionWss = new WebSocketServer({ noServer: true });

sessionWss.on("connection", (ws, req) => {
  // ws = la connessione con questo specifico giocatore
  // req = la richiesta HTTP iniziale (contiene l'URL con il sessionId)

  const sessionId = req.url?.split("/")[2];
  if (!sessionId) {
    ws.close();
    return;
  }

  const timer = setInterval(() => {
    const session = getSession(sessionId);
    if (!session) {
      clearInterval(timer);
      return;
    }

    if (isExpired(session)) {
      ws.send(JSON.stringify({ type: "EXPIRED" }));
      ws.close();
      clearInterval(timer);
    }
  }, 1000);

  // ascolti i messaggi in arrivo dal giocatore
  ws.on("message", async (raw) => {
    console.log("---");
    console.log("1. WebSocket received message:", raw.toString());
    const parsed = JSON.parse(raw.toString());

    const session = getSession(sessionId);
    if (!session) {
      console.log("1a. ERROR: No session found for sessionId:", sessionId);
      return;
    }
    console.log("2. Session found:", session.sessionId);

    if (isExpired(session) || isSurrendered(session)) {
      console.log("2a. Session expired or already surrendered");
      return;
    }

    const messages = [...session.messages, { role: "player" as const, text: parsed.text }];
    updateSession(sessionId, { messages });
    console.log("3. Session updated with player message, total messages:", messages.length);

    try {
      console.log("4. Calling streamCiroResponse...");
      const responseText = await streamCiroResponse(messages, (token) => {
        ws.send(JSON.stringify({ type: "TOKEN", text: token }));
      });
      console.log("5. streamCiroResponse finished, text length:", responseText.length);

      const updatedMessages = [...messages, { role: "bot" as const, text: responseText }];
      updateSession(sessionId, { messages: updatedMessages });
      console.log("6. Session updated with bot message, calling judgeSurrender...");

      const judgment = await judgeSurrender(updatedMessages);
      console.log("Judgment:", judgment);
      console.log("Surrender score:", judgment.surrender);

      const freshSession = getSession(sessionId);
      if (!freshSession) return;

      const newSurrenderHistory = [...freshSession.surrenderHistory, judgment.surrender];
      const newScore = computeSurrenderScore(newSurrenderHistory);

      updateSession(sessionId, {
        surrenderScore: newScore,
        surrenderHistory: newSurrenderHistory
      });

      ws.send(JSON.stringify({
        type: "SURRENDER",
        score: newScore,
        reason: judgment.reason
      }));

      if (newScore >= 100) {
        updateSession(sessionId, { status: "won" });
        ws.send(JSON.stringify({ type: "WIN" }));
        ws.close();
      }

    } catch (error) {
      console.error("Error during message processing:", error);
      ws.send(JSON.stringify({ type: "ERROR", message: "Errore durante l'elaborazione" }));
    }
  });

  ws.on("close", () => {
    clearInterval(timer);
  });
});
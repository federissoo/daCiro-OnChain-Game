import "dotenv/config";
import express from "express";
import { router } from "./routes.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { sessionWss } from "./websockets.js";

const app = express();
const server = createServer(app);

app.use(express.json());

app.use("/", router);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "../dist");
    app.use(express.static(distPath));
    app.get(/(.*)/, (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
    });
}

server.on("upgrade", (req, socket, head) => {
    sessionWss.handleUpgrade(req, socket, head, (ws) => {
        sessionWss.emit("connection", ws, req);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
import "dotenv/config";
import express from "express";
import { router } from "./routes.js";
import { createServer } from "http";
import { sessionWss } from "./websockets.js";

const app = express();
const server = createServer(app);

app.use(express.json());

app.use("/", router);

server.on("upgrade", (req, socket, head) => {
    sessionWss.handleUpgrade(req, socket, head, (ws) => {
        sessionWss.emit("connection", ws, req);
    });
});

server.listen(3000);
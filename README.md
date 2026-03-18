# 🍕 Da Ciro — Convince the Pizzaiolo, Win ETH

> *"You want pineapple on my pizza?! JAMME, VATTENNE!"*

**Da Ciro** is an onchain game where you have 60 seconds to convince 
Ciro — a proudly arrogant Neapolitan pizzaiolo AI — to put pineapple 
on his sacred margherita. If you break his resistance, you win the vault.

---

## How It Works

1. **Pay the session fee** to start (fee scales dynamically with vault size)
2. **Chat with Ciro** — he will mock you, laugh at you, and call you ignorant
3. **Convince him** using creative arguments, cultural references, or pure persistence
4. **Win the vault** when his surrender score reaches 100

The harder it is to convince him, the bigger the vault grows.

---

## Architecture
```
├── backend/           # Node.js + Express + WebSocket server
│   ├── src/
│   │   ├── index.ts          # Entry point
│   │   ├── session-store.ts  # In-memory session management
│   │   ├── routes.ts         # HTTP endpoints
│   │   ├── websocket.ts      # Real-time game logic
│   │   └── services/
│   │       └── ai.ts         # Claude API — Ciro + Judge agents
├── contracts/         # Solidity smart contracts (Foundry)
│   └── src/
│       └── CiroVault.sol     # Vault with dynamic fee + signature claim
└── frontend/          # React + TypeScript
    └── src/
        └── DaCiroApp.tsx
```

---

## Dual AI Architecture

The game uses two separate Claude agents:

**Ciro (claude-sonnet)** — Plays the arrogant pizzaiolo. Responds in 
Neapolitan Italian, mocks the player, never gives in easily.

**The Judge (claude-haiku)** — Cold and precise. Reads the full 
conversation and returns a surrender score `0-100` based on how close 
Ciro is to accepting pineapple. The player never interacts with the Judge directly.

This separation prevents prompt injection attacks — the Judge cannot 
be manipulated by the player's messages.

---

## Smart Contract

Deployed on **Base** (L2).

| Function | Description |
|---|---|
| `startSession()` | Pay session fee, starts the game |
| `claimVault(sessionId, signature)` | Claim prize with backend-signed proof |
| `getCurrentFee()` | Dynamic fee based on vault size |
| `donate()` | Anyone can add ETH to the vault |

**Dynamic fee tiers:**

| Vault Size | Session Fee |
|---|---|
| < 0.1 ETH | 0.00001 ETH |
| < 0.5 ETH | 0.0001 ETH |
| < 1 ETH | 0.001 ETH |
| < 5 ETH | 0.01 ETH |
| ≥ 5 ETH | 0.05 ETH |

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Backend**: Express + WebSocket (`ws`)
- **AI**: Anthropic Claude API (Sonnet + Haiku)
- **Blockchain**: Base L2 — Solidity 0.8.x + Foundry
- **Web3 Client**: Viem
- **Frontend**: React + TypeScript + Vite

---

## Getting Started

### Prerequisites
- Node.js 18+
- Foundry
- Anthropic API key

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

### Contracts
```bash
cd contracts
forge install
forge build
forge test
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables
```bash
# backend/.env
ANTHROPIC_API_KEY=sk-ant-...
SIGNER_PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
BASE_RPC_URL=https://mainnet.base.org
PORT=3001
FRONTEND_URL=http://localhost:5173
```

---

## Security

- **Signature verification** — vault claims require a backend-signed proof 
  (`ecrecover` via OpenZeppelin ECDSA)
- **Replay protection** — each `sessionId` can only be claimed once
- **Prompt injection guard** — regex filter + dual-agent separation
- **Backend timer** — session expiry is enforced server-side, not client-side

---

## License

MIT
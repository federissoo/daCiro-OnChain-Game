# 🍕 Da Ciro — Convince the Pizzaiolo, Win ETH

> *"You want pineapple on my pizza?! JAMME, VATTENNE! I am the king of the oven, and you come here with this... this heresy?"*

**Da Ciro** is an onchain game where you have 60 seconds to convince 
Ciro — a proudly arrogant, boastful and mocking Neapolitan pizzaiolo AI — to put pineapple 
on his sacred margherita. If you break his resistance, you win the vault.

---

## How It Works

1. **Pay the session fee** to start (fee scales dynamically with vault size)
2. **Chat with Ciro** — he will mock you, laugh at you, and call you ignorant in both **Italian** and **English**
3. **Convince him** using creative arguments, cultural references, or pure persistence
4. **Win the vault** when his surrender score reaches 100

The harder it is to convince him, the bigger the vault grows.

---

## Architecture

```
├── backend/           # Node.js + WebSocket server
│   ├── prompts/       # AI Prompts (it.ts, en.ts) - Internationalization
│   ├── services/      # AI services (Claude API — Ciro + Judge agents)
│   ├── index.ts       # Entry point
│   ├── routes.ts      # HTTP routes
│   ├── session-store.ts # Session management
│   └── websockets.ts  # Real-time game logic
├── contracts/         # Solidity smart contracts (Foundry)
│   ├── src/
│   │   └── SimpleVault.sol # Vault with dynamic fee + signature claim
│   └── test/          # Foundry tests
├── src/               # Frontend (React + Vite)
│   ├── main.tsx       # Entry point
│   ├── DaCiroApp.tsx  # Main Application
│   └── index.css      # Styles
├── package.json       # Frontend dependencies (root)
├── vite.config.ts     # Vite config
└── index.html         # HTML entry point (root)
```

---

## Dual AI Architecture

The game uses two separate Claude agents:

**Ciro (claude-3-5-sonnet)** — Plays the arrogant, boastful pizzaiolo. He mocks the player, speaks with a strong Neapolitan attitude, and never gives in easily. Now supports multiple languages.

**The Judge (claude-3-5-haiku)** — Cold and precise. Reads the full 
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
- **Backend**: Node.js + WebSocket (`ws`)
- **AI**: Anthropic Claude API (Sonnet 3.5 + Haiku 3.5)
- **Blockchain**: Base L2 — Solidity 0.8.x + Foundry
- **Web3 Client**: Viem / Wagmi
- **Frontend**: React + TypeScript + Vite
- **Localization**: Multi-language support (IT/EN)

---

## Getting Started

### Prerequisites
- Node.js 18+
- Foundry
- Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone <repo-url>
cd daCiro
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

3. **Contracts Setup**
```bash
cd contracts
forge install
forge build
forge test
```

4. **Frontend Setup (Root)**
```bash
# From the root directory
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
- **Replay protection** — each `sessionId` and signature can only be used once
- **Prompt injection guard** — dual-agent separation + Judge validation
- **Backend timer** — session expiry is enforced server-side, not client-side

---

## License

MIT
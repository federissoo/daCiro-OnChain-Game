# 🍕 Da Ciro — Convince the Pizzaiolo, Win ETH

> *"You want pineapple on my pizza?! JAMME, VATTENNE! I am the king of the oven, and you come here with this... this heresy?"*

**Da Ciro** is an onchain game where you have 60 seconds to convince 
Ciro — a proudly arrogant, boastful and mocking Neapolitan pizzaiolo AI — to put pineapple 
on his sacred margherita. If you break his resistance, you win the vault.

---

## How It Works

1. **Pay the session fee** to start (fee scales dynamically with vault size)
2. **Chat with Ciro** — he will mock you and laugh at you
3. **Convince him** using creative arguments, cultural references, or pure persistence
4. **Win the vault** when his surrender score reaches 100

The harder it is to convince him, the bigger the vault grows.

---

## AI model strategy

**Testnet & Local Development:**
To keep costs low during testing and development, the game runs on **Claude 3 Haiku** for both agents when not in production environment.

**Production:**
The project launches with **Claude Haiku 4.5 for both Ciro and the Judge** — 
profitable from the second fee tier (vault > 0.01 ETH). The first tier 
operates at a small loss by design, keeping the entry barrier as low as 
possible to maximize early player volume.

Once the vault reaches **0.1 ETH**, Ciro is **manually upgraded** to 
**Claude Sonnet 4.6**, making him significantly more creative. The Judge always runs on Haiku regardless of 
vault size — its task (returning a structured JSON score) does not benefit 
meaningfully from a more capable model.

Token usage estimates are based on real gameplay sessions and logged 
per-session to `session-logs.txt` for ongoing calibration.

---

## Economics & Sustainability

Da Ciro uses a dynamic session fee that scales automatically with the 
vault size. Fees are split 70/30 — 70% grows the vault (increasing the 
prize and attracting more players), 30% covers operational costs 
(primarily Claude API calls).

**Fee tiers:**

| Vault Size | Session Fee (~USD) |
|---|---|
| < 0.01 ETH | ~$0.025 |
| < 0.05 ETH | ~$0.125 |
| < 0.1 ETH  | ~$0.25  |
| < 0.5 ETH  | ~$2.50  |
| < 0.75 ETH | ~$6.25  |
| < 1 ETH    | ~$12.50 |
| ≥ 1 ETH    | ~$25    |

**API cost per session** (~10,000 input tokens / ~1,000 output tokens):

| Setup | Input | Output | Total |
|---|---|---|---|
| Haiku 4.5 + Haiku 4.5 | $0.010 | $0.005 | **$0.015** |
| Haiku 4.5 + Sonnet 4.6 | $0.030 | $0.015 | **$0.045** |

**Profitability by tier:**

| Vault | Fee | Dev 30% | Haiku+Haiku | Margin | Haiku+Sonnet | Margin |
|---|---|---|---|---|---|---|
| < 0.01 ETH | $0.025 | $0.0075 | $0.015 | **-$0.007** | $0.045 | **-$0.037** |
| < 0.05 ETH | $0.125 | $0.0375 | $0.015 | **+$0.022** | $0.045 | **-$0.007** |
| < 0.1 ETH | $0.25 | $0.075 | $0.015 | **+$0.060** | $0.045 | **+$0.030** |
| < 0.5 ETH | $2.50 | $0.75 | $0.015 | **+$0.735** | $0.045 | **+$0.705** |
| < 0.75 ETH | $6.25 | $1.875 | $0.015 | **+$1.860** | $0.045 | **+$1.830** |
| < 1 ETH | $12.50 | $3.75 | $0.015 | **+$3.735** | $0.045 | **+$3.705** |
| ≥ 1 ETH | $25 | $7.50 | $0.015 | **+$7.485** | $0.045 | **+$7.455** |

---

## Architecture

```
├── backend/           # Node.js + WebSocket server
│   ├── prompts/       # AI Prompts (it.ts, en.ts) - Internationalization
│   ├── services/      # AI services
│   │   ├── ai.ts      # Claude API logic (Ciro + Judge)
│   │   └── logger.ts  # Session token logging
│   ├── index.ts       # Entry point
│   ├── routes.ts      # HTTP routes
│   ├── session-store.ts # Session management
│   ├── session-logs.txt # Token usage logs
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

## Smart Contract

Deployed on **Base** (L2).

| Function | Description |
|---|---|
| `startSession()` | Pay session fee, starts the game |
| `claimVault(sessionId, signature)` | Claim prize with backend-signed proof |
| `getCurrentFee()` | Dynamic fee based on vault size |
| `donate()` | Anyone can add ETH to the vault |

**Dynamic fee tiers:**
*(Fee tiers are based on vault size. See the "Economics & Sustainability" section for detailed scaling.)*

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Backend**: Node.js + WebSocket (`ws`)
- **AI**: Anthropic Claude API (Haiku 4.5 and Sonnet 4.6 depending on tier)
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

The project uses two separate environment files to separate concerns between the backend and the smart contracts.

### 1. Backend / Root (`.env`)
```bash
ANTHROPIC_API_KEY=sk-ant-...     # API key for Claude 
NODE_ENV=development             # 'development' or 'production'
PORT=3000                        # Backend server port
FRONTEND_URL=http://localhost:5173 

# Note: The following are required by the backend to sign claims
SIGNER_PRIVATE_KEY=0x...         # MUST match the contracts signer
CONTRACT_ADDRESS=0x...           # The deployed SimpleVault address
```

### 2. Smart Contracts (`contracts/.env`)
```bash
PRIVATE_KEY=0x...                # Deployer private key
ADDRESS=0x...                    # Deployer public address 
CONTRACT_ADDRESS=0x...           # Deployed vault address
BASE_RPC_URL=https://...         # L2 RPC URL
BASESCAN_API_KEY=...             # For contract verification on BaseScan
SIGNER_PRIVATE_KEY=0x...         # For generating signatures during testing
SIGNER_ADDRESS=0x...
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
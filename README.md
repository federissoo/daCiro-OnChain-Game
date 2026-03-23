# 🍕 Da Ciro — Convince the Pizzaiolo, Win ETH

> *"You want pineapple on my pizza?! JAMME, VATTENNE! I am the king of the oven, and you come here with this... this heresy?"*

<p align="center">
  <img src="assets/ciro.png" width="150" alt="Ciro Esposito">
</p>

**Da Ciro** is an onchain game where you have 90 seconds to convince 
Ciro — a proudly arrogant, boastful and mocking Neapolitan pizzaiolo AI — to put pineapple 
on his sacred margherita. If you break his resistance, you win the vault.

🎮 **[Play the Live Demo on Base Sepolia](https://daciro-onchain-game-production.up.railway.app/)**

---

## How It Works

1. **Pay the session fee** to start (fee scales dynamically with vault size)
2. **Chat with Ciro** — he will mock you and laugh at you
3. **Convince him** using creative arguments, cultural references, or pure persistence
4. **Win the vault** when his surrender score hits 100

**The Math Behind the Surrender Score:**
Ciro's psychological armor tracks your *persistence*. The final score isn't a simple average of your phrases. It is calculated as your **Best Argument (High-Watermark)** plus a **Persistence Bonus** (20% of your global average effort). 
A single brilliant sentence (100) shatters his armor and instantly wins the game.

The harder it is to convince him overall, the bigger the vault grows for the next player.

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
- **AI**: Anthropic Claude API (Haiku 3, Haiku 4.5 and Sonnet 4.6 depending on tier)
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
cd daCiro-OnChain-Game
```

2. **Backend & Frontend Setup (Root)**
```bash
# Install all dependencies (Backend + Frontend)
npm install

# Create environment file
cp .env.example .env   # fill in your keys (Anthropic, RPC, etc.)

# Start the application
npm run dev            # Starts both Backend and Frontend concurrently
```

3. **Contracts Setup**
```bash
cd contracts
forge install
forge build
forge test
```

---

## Environment Variables

Da Ciro is configured as a unified monorepo. You only need **two** `.env` files (one for the Application, and one exclusively for the Smart Contracts tooling).

### 1. Unified App (`/.env`)
Create an `.env` file at the exact root of the project to hold both Node.js (Backend) and Vite (Frontend) variables:
```bash
# ----- BACKEND -----
ANTHROPIC_API_KEY=sk-ant-...     # API key for Claude 
NODE_ENV=development             # 'development' or 'production' (Production serves the React build)
PORT=3000                        
CONTRACT_ADDRESS=0x...           
BASE_RPC_URL=https://...         
SIGNER_PRIVATE_KEY=0x...         # Critical: private key used by the backend to sign your win 

# ----- FRONTEND (VITE) -----
VITE_CONTRACT_ADDRESS=0xC5...                  
VITE_BASE_SEPOLIA_CHAIN_ID=84532             
VITE_BASE_RPC_URL=https://...                
VITE_WALLET_CONNECT_PROJECT_ID=...           
```

### 2. Smart Contracts (`contracts/.env`)
Only required for developers wanting to re-deploy or run `forge test`:
```bash
PRIVATE_KEY=0x...                # Deployer private key
ADDRESS=0x...                    
CONTRACT_ADDRESS=0xC5...           
BASE_RPC_URL=https://...         
BASESCAN_API_KEY=...             # For contract verification on BaseScan
SIGNER_PRIVATE_KEY=0x...         # Signature mock for forge tests
```

---

## Security

- **Signature verification** — vault claims require a backend-signed proof 
  (`ecrecover` via OpenZeppelin ECDSA)
- **Replay protection (Sessions)** — each `sessionId` and signature can only be used once for claiming the vault.
- **Replay protection (Transactions)** — the backend actively tracks used `txHash` to prevent an attacker from repeatedly starting thousands of games with a single fee payment.
- **Prompt injection guard** — dual-agent separation + Judge validation
- **Backend timer** — session expiry is enforced server-side, not client-side
- **Message limit** — each session is capped at 20 player messages; the WebSocket is closed if exceeded
- **Message length limit** — player messages are capped at 500 characters; longer inputs are rejected before reaching the AI

---

## Contribution

Contributions are welcome! Please read [CONTRIBUTING.md](file:///Users/federisso/Desktop/daCiro%20-%20OnChain%20game/CONTRIBUTING.md) for details on how to get started.

---
  
## License

MIT

# Contributing to Da Ciro 🍕

First off, thank you for considering contributing to Da Ciro! It's people like you that make the open-source community such a fantastic place to learn, inspire, and create.

This document provides a set of guidelines and instructions for contributing to the project.

## How Can I Contribute?

There are many ways you can contribute to Da Ciro, whether you have a background in Smart Contracts, React, AI Prompt Engineering, or Game Design.

### 🐛 Bug Reports & Feature Requests
If you find a bug or have an idea for a cool new feature (e.g., a new trait for Ciro, UI improvements, gas optimizations), please **open an issue** on GitHub. 
Provide as much detail as possible, including steps to reproduce bugs.

### 💻 Code Contributions (Pull Requests)
If you directly want to submit code changes, PRs are always welcome! 

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally: `git clone https://github.com/your-username/daCiro-OnChain-Game.git`
3. **Create a new branch** for your feature or bugfix: `git checkout -b feature/my-awesome-feature`
4. **Make your changes**.
5. **Commit your changes** with a descriptive message: `git commit -m "Add my awesome feature"`
6. **Push to the branch**: `git push origin feature/my-awesome-feature`
7. **Submit a Pull Request** against the `main` branch.

## Setting Up Your Development Environment

Da Ciro is a unified monorepo. Here's exactly how to spin it up locally.

### 1. Prerequisites
- **Node.js** (v18+)
- **Foundry** (for smart contracts testing and compilation).
- A free **Anthropic API key**.

### 2. Environment Variables
You need two `.env` files. One in the root directory (for the Application) and one inside the `contracts/` directory (for Foundry). For a quick start, you can copy the provided example files:

**Root `/` (`.env`)**
```bash
cp .env.example .env
```
*(Then fill in your `ANTHROPIC_API_KEY`, etc.)*

**Contracts directory `/contracts` (`.env`)**
```bash
cd contracts
cp .env.example .env
```
*(Then fill in your `PRIVATE_KEY`, etc.)*

To run both the React frontend and the Express backend simultaneously with hot-reloading:
```bash
# From the root directory
npm install
npm run dev
```
The game will be available at `http://localhost:5173`.

### 4. Smart Contract Setup & Tests
If you modify `SimpleVault.sol`, make sure all tests pass before submitting a PR:
```bash
cd contracts
forge install
forge build
forge test
```

## Pull Request Guidelines

- Ensure any new logic is thoroughly commented.
- If you modify the Smart Contract, make sure `forge test` passes and write new tests if necessary.
- If you tweak the **AI Prompts** (`backend/prompts/it.ts` or `en.ts`), try to maintain Ciro's tone of voice and always verify that the Judge's structured JSON output remains unbroken.
- For UI components, ensure responsiveness across mobile and desktop.

Once again, thank you for your interest in improving Da Ciro!

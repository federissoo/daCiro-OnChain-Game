/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS?: `0x${string}`
  readonly VITE_BASE_SEPOLIA_CHAIN_ID?: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID?: string
  readonly VITE_BASE_RPC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

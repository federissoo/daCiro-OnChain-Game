import { type Address, type Hex, createPublicClient, decodeFunctionData, getAddress, http } from "viem";
import { baseSepolia } from "viem/chains";

const DEFAULT_CONTRACT_ADDRESS = "0xC52A0c121896b468f78C77a6CEEFe30C195dd523" as const;
const DEFAULT_BASE_RPC_URL = "https://sepolia.base.org";

const CONTRACT_ADDRESS = getAddress(
  (process.env.CONTRACT_ADDRESS ?? DEFAULT_CONTRACT_ADDRESS) as Address,
);
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? DEFAULT_BASE_RPC_URL;

const simpleVaultAbi = [
  {
    type: "function",
    name: "getCurrentFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "vaultBalance",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "startSession",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
] as const;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_RPC_URL),
});

export type VerifyTransactionResult = {
  ok: boolean;
  reason?: string;
};

export async function getCurrentFee(): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: simpleVaultAbi,
    functionName: "getCurrentFee",
  });
}

export async function getVaultBalance(): Promise<bigint> {
  return publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: simpleVaultAbi,
    functionName: "vaultBalance",
  });
}

export async function verifyTransaction(
  txHash: Hex,
  walletAddress: Address,
): Promise<VerifyTransactionResult> {
  const normalizedWallet = getAddress(walletAddress);

  const [transaction, receipt, currentFee] = await Promise.all([
    publicClient.getTransaction({ hash: txHash }),
    publicClient.getTransactionReceipt({ hash: txHash }),
    getCurrentFee(),
  ]);

  if (!transaction.to) {
    return { ok: false, reason: "Transaction has no target contract" };
  }

  if (getAddress(transaction.to) !== CONTRACT_ADDRESS) {
    return { ok: false, reason: "Transaction is not directed to game contract" };
  }

  if (getAddress(transaction.from) !== normalizedWallet) {
    return { ok: false, reason: "Transaction sender does not match connected wallet" };
  }

  if (receipt.status !== "success") {
    return { ok: false, reason: "Transaction is not confirmed successfully" };
  }

  const minimumAcceptedFee = (currentFee * 95n) / 100n;
  if (transaction.value < minimumAcceptedFee) {
    return { ok: false, reason: "Transaction value below required fee threshold" };
  }

  try {
    const decoded = decodeFunctionData({
      abi: simpleVaultAbi,
      data: transaction.input,
    });

    if (decoded.functionName !== "startSession") {
      return { ok: false, reason: "Transaction did not call startSession" };
    }
  } catch {
    return { ok: false, reason: "Transaction calldata is not valid for startSession" };
  }

  return { ok: true };
}

import { type Address, type Hex, encodePacked, getAddress, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const signerPrivateKey = process.env.SIGNER_PRIVATE_KEY as Hex | undefined;

if (!signerPrivateKey) {
  throw new Error("SIGNER_PRIVATE_KEY is required for victory signature generation");
}

const signerAccount = privateKeyToAccount(signerPrivateKey);

export async function signVictory(sessionId: string, walletAddress: Address) {
  const normalizedWallet = getAddress(walletAddress);
  const messageHash = keccak256(encodePacked(["string", "address"], [sessionId, normalizedWallet]));

  const signature = await signerAccount.signMessage({
    message: { raw: messageHash },
  });

  return {
    signature,
    messageHash,
  };
}

import { createWalletClient, custom, createPublicClient, http, type Address } from 'viem';
import { celo } from 'viem/chains';

// Replace with your actual deployed contract address on Celo
export const ESCROW_CONTRACT_ADDRESS = "0xYourEscrowContractAddressHere" as Address;

const ABI = [
  {
    "inputs": [],
    "name": "registerNode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "bytes32", "name": "shardHash", "type": "bytes32" }],
    "name": "submitProof",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "nodes",
    "outputs": [
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "uint256", "name": "totalEarned", "type": "uint256" },
      { "internalType": "uint256", "name": "lastProofTime", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

/**
 * Automatically handles minipay or window.ethereum to return a viem WalletClient.
 */
export const getWalletClient = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof window === 'undefined' || !(window as any).ethereum) return null;
  return createWalletClient({
    chain: celo,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transport: custom((window as any).ethereum)
  });
};

/**
 * Returns a viem PublicClient for reading data from the Celo network.
 */
export const getPublicClient = () => {
  return createPublicClient({
    chain: celo,
    transport: http()
  });
};

/**
 * Registers a user's node on the Escrow contract.
 */
export const registerNode = async (account: Address) => {
  const client = getWalletClient();
  const publicClient = getPublicClient();
  if (!client) throw new Error("Wallet not found");

  const { request } = await publicClient.simulateContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'registerNode',
    account,
  });

  const txHash = await client.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
};

export const submitProofToContract = async (account: Address, shardHash: string): Promise<`0x${string}`> => {
  const client = getWalletClient();
  const publicClient = getPublicClient();
  if (!client) throw new Error("Wallet not found");

  const { request } = await publicClient.simulateContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'submitProof',
    args: [shardHash],
    account,
  });

  const txHash = await client.writeContract(request);
  await publicClient.waitForTransactionReceipt({ hash: txHash });
  return txHash;
};

/**
 * Retrieves the registered node information from the Escrow contract.
 */
export const getNodeInfo = async (account: Address) => {
  const publicClient = getPublicClient();
  const data = await publicClient.readContract({
    address: ESCROW_CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'nodes',
    args: [account],
  });
  return data;
};

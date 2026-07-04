import { NextRequest, NextResponse } from "next/server";
import { Ed25519Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient, ClayErasureCodingProvider, generateCommitments } from "@shelby-protocol/sdk/node";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const blobData = Buffer.from(arrayBuffer);

    // 1. Setup Developer Signer (Mock Private Key for Demo Purposes)
    // In production, this should be an environment variable: process.env.APTOS_PRIVATE_KEY
    const devPrivateKeyHex = process.env.APTOS_PRIVATE_KEY || "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const privateKeyBytes = Buffer.from(devPrivateKeyHex.replace("0x", ""), "hex");
    const signer = new Ed25519Account({ privateKey: new Ed25519PrivateKey(privateKeyBytes) });

    // 2. Setup Aptos & Shelby Clients
    const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
    const shelbyClient = new ShelbyNodeClient({ network: Network.TESTNET });

    // 3. Generate Commitments
    const provider = await ClayErasureCodingProvider.create();
    const blobCommitments = await generateCommitments(provider, blobData);

    const fileName = `minidrive-${Date.now()}-${file.name}`;

    // 4. Write Commitments to Aptos Coordination Layer
    const { transaction: pendingTx } = await shelbyClient.coordination.registerBlob({
      account: signer,
      blobName: fileName,
      blobMerkleRoot: blobCommitments.blob_merkle_root,
      size: blobData.length,
      expirationMicros: (1000 * 60 * 60 * 24 * 30 + Date.now()) * 1000, // 30 days
    });

    await aptosClient.waitForTransaction({ transactionHash: pendingTx.hash });

    // 5. Confirm through Shelby RPC Layer
    await shelbyClient.rpc.putBlob({
      account: signer.accountAddress,
      blobName: fileName,
      blobData,
    });

    // Return the decentralized hash (Merkle Root) back to the frontend
    return NextResponse.json({ 
      success: true, 
      hash: blobCommitments.blob_merkle_root 
    });

  } catch (error: any) {
    console.error("Shelby Upload Error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

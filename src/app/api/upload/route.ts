import { NextRequest, NextResponse } from "next/server";
import { Ed25519Account, Ed25519PrivateKey, Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";
/**
 * Handles file uploads to the Shelby decentralized network.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const blobData = Buffer.from(arrayBuffer);

    // 1. Setup Developer Signer
    const devPrivateKeyString = process.env.APTOS_PRIVATE_KEY || "";
    if (!devPrivateKeyString) throw new Error("Missing APTOS_PRIVATE_KEY environment variable");
    const signer = new Ed25519Account({ privateKey: new Ed25519PrivateKey(devPrivateKeyString) });

    // 2. Setup Aptos & Shelby Clients
    const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
    const shelbyClient = new ShelbyNodeClient({ network: Network.TESTNET });

    // Clean the filename to remove spaces and special characters that break decentralized URLs
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `minidrive-${Date.now()}-${safeName}`;

    // 3. Upload to Shelby using the high-level API which handles commitments & registration safely
    await shelbyClient.upload({
      blobData,
      signer,
      blobName: fileName,
      expirationMicros: Date.now() * 1000 + 31536000000000, // 1 year from now
    });

    // Return the unique blobName back to the frontend
    return NextResponse.json({ 
      success: true, 
      hash: fileName
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

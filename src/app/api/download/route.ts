import { NextRequest, NextResponse } from "next/server";
import { Ed25519Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const blobName = url.searchParams.get("hash") || url.searchParams.get("blobName");
    
    if (!blobName) {
      return new NextResponse("Missing hash parameter", { status: 400 });
    }

    // 1. Reconstruct the Developer Account to get the Account Address
    const devPrivateKeyString = process.env.APTOS_PRIVATE_KEY || "";
    if (!devPrivateKeyString) throw new Error("Missing APTOS_PRIVATE_KEY");
    const signer = new Ed25519Account({ privateKey: new Ed25519PrivateKey(devPrivateKeyString) });
    
    // 2. Construct the direct Shelby Network URL
    const shelbyDownloadUrl = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${signer.accountAddress.toString()}/${blobName}`;
    
    // 3. Redirect the user's browser directly to the decentralized network
    return NextResponse.redirect(shelbyDownloadUrl);
    
  } catch (error: unknown) {
    console.error("Download Route Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

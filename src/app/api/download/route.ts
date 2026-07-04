import { NextRequest, NextResponse } from "next/server";
import { Ed25519Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const blobName = url.searchParams.get("blobName");
    
    if (!blobName) {
      return new NextResponse("Missing blobName parameter", { status: 400 });
    }

    // 1. Reconstruct the Developer Account to get the Account Address
    const devPrivateKeyString = process.env.APTOS_PRIVATE_KEY || "ed25519-priv-0x498c4eb2e6418c0a62e4ce58c91bd1156bf9f43b3fa863cc82eeae1323e205ec";
    const signer = new Ed25519Account({ privateKey: new Ed25519PrivateKey(devPrivateKeyString) });
    
    // 2. Construct the direct Shelby Network URL
    const shelbyDownloadUrl = `https://api.testnet.shelby.xyz/shelby/v1/blobs/${signer.accountAddress.toString()}/${blobName}`;
    
    // 3. Redirect the user's browser directly to the decentralized network
    return NextResponse.redirect(shelbyDownloadUrl);
    
  } catch (error: any) {
    console.error("Download Route Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

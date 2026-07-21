import { Aptos, AptosConfig, Network, Ed25519Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { ShelbyNodeClient } from "@shelby-protocol/sdk/node";

/**
 * Main script entry point.
 * @returns {Promise<void>}
 */
async function main(): Promise<void> {
  const pk: string = "ed25519-priv-0x498c4eb2e6418c0a62e4ce58c91bd1156bf9f43b3fa863cc82eeae1323e205ec";
  const signer = new Ed25519Account({ privateKey: new Ed25519PrivateKey(pk) });
  const shelby = new ShelbyNodeClient({ network: Network.TESTNET });

  const blobs = await shelby.getBlobs({ account: signer.accountAddress, pagination: { limit: 10 } });
  console.log(JSON.stringify(blobs, null, 2));
}

main().catch(console.error);

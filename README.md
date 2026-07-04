# MiniDrive

**The first fully decentralized, gasless, and embedded-wallet powered DePIN storage network built for the Celo MiniPay ecosystem.**

MiniDrive brings enterprise-grade decentralized storage directly to mobile phones. By seamlessly orchestrating **Celo Smart Contracts**, **Aptos Network**, and the **Shelby Decentralized Storage Protocol**, MiniDrive allows any user—even those without a crypto wallet—to securely store, encrypt, and access their files on the blockchain.

---

## 🏆 Key Features

- **Gasless Web2 Onboarding**: Non-crypto users can sign in with just an Email using Privy's Embedded Wallets. They get an instant 50MB free tier, and all decentralized uploads are sponsored gaslessly by our Aptos Backend Oracle.
- **Pay-Per-Storage via Celo USDm**: Users can fund their Celo MiniPay wallet with USDm and lock it in the `MiniDriveEscrow.sol` smart contract. 1 USDm permanently unlocks 5 GB of decentralized storage.
- **Shelby Storage Network Integration**: Files are transformed into erasure-coded blobs, registered directly on the Aptos network via Shelby protocol, and seeded across decentralized storage nodes for maximum redundancy.
- **Cross-Device Vault via Supabase**: Encrypted file hashes and metadata are securely synced across all user devices using Supabase, so your DePIN Vault is always available whether you are on mobile or desktop.

## 🏗 System Architecture

MiniDrive uses a highly complex cross-chain architecture abstracted behind a beautiful, Apple-like UI:

1. **Authentication (Privy & MiniPay)**
   - Web3 users connect instantly via the Opera MiniPay injected provider.
   - Web2 users log in via Email and receive an invisible **Privy Embedded Wallet**.
2. **Escrow Contract (Celo Alfajores)**
   - Users deposit Celo USDm into our custom Escrow Smart Contract.
   - The contract calculates their storage limit dynamically based on their deposit weight.
3. **Decentralized Storage Oracle (Aptos + Shelby)**
   - When a user uploads a file, it is sent to the backend Next.js Oracle.
   - The Oracle's Master Aptos Wallet automatically sponsors the micro-gas fee required to register the file hash on the Aptos ledger.
   - The blob is erasure-coded and blasted to the Shelby storage node network.
4. **Metadata Indexing (Supabase)**
   - The Aptos hash is returned to the client and indexed in a Supabase table linked to the user's Celo/Privy address.
5. **Decentralized Retrieval**
   - When a user clicks Download, the app bypasses traditional CDNs and streams the blob directly from the decentralized network using the Aptos file hash.

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18
- An Aptos Wallet with Testnet APT (for the backend Oracle)
- A Supabase Project (for cross-device metadata)
- Privy App ID (for Embedded Wallets)

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
APTOS_PRIVATE_KEY=your_aptos_master_developer_key
```

### Installation
```bash
npm install
npm run dev
```

## 📜 Smart Contract

The core escrow contract is deployed on Celo Alfajores Testnet:
- **Network**: Celo Alfajores Testnet
- **Currency**: USDm

## 💡 Why MiniDrive?
Traditional cloud storage (Google Drive, Dropbox) controls your data, charges high monthly fees, and forces you into their ecosystem. MiniDrive uses the DePIN (Decentralized Physical Infrastructure) model to permanently store your data on distributed nodes across the globe. You pay once via Celo USDm, and your files are mathematically guaranteed to exist on the Aptos ledger forever.

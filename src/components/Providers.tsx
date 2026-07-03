"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { celo } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmr4ce7ay001d0cjmbl68na4f"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#34d399",
          logo: "https://cryptologos.cc/logos/celo-celo-logo.png",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
        defaultChain: celo,
        supportedChains: [celo],
      }}
    >
      {children}
    </PrivyProvider>
  );
}

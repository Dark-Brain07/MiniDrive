"use client";

import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { celo } from "viem/chains";

/**
 * Wraps the application with Privy authentication and Web3 providers.
 * @param children The child React nodes.
 * @returns The wrapped React application elements.
 */
export default function Providers({ children }: { readonly children: React.ReactNode }): React.ReactElement {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmr4ce7ay001d0cjmbl68na4f"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#34d399",
          logo: "https://cryptologos.cc/logos/celo-celo-logo.png",
        },
        defaultChain: celo,
        supportedChains: [celo],
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      } as PrivyClientConfig}
    >
      {children}
    </PrivyProvider>
  );
}

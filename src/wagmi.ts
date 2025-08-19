import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";
import { http, createConfig } from "wagmi";
import { base, mainnet, celo } from "wagmi/chains";

export const config = createConfig({
  chains: [base, mainnet, celo],
  connectors: [farcasterMiniApp()],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [celo.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

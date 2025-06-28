'use client';

import { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

// Używamy tego samego endpointu co w PaymentButton
const RPC_ENDPOINT = 'https://solana-mainnet.g.alchemy.com/v2/jpJwZVUI4FlCf1IWtaVAjq6Lj2ABh7tv';

// Wyciszamy błędy WebSocket
const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0]?.includes?.('ws error')) {
    return;
  }
  originalConsoleError.apply(console, args);
};

export const WalletContextProvider: FC<Props> = ({ children }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_ENDPOINT}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}; 
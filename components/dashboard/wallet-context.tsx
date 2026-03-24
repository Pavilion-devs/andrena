"use client";

import {
  WalletAdapterNetwork,
  WalletReadyState,
  type WalletError,
} from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import {
  clusterApiUrl,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface DashboardWalletContextValue {
  connectedWallet: string | null;
  providerName: string | null;
  walletAvailable: boolean;
  connecting: boolean;
  error: string | null;
  liveTradeSubmissionEnabled: boolean;
  liveTradeSubmissionFlagName: string;
  connectWallet: () => Promise<string | null>;
  disconnectWallet: () => Promise<void>;
  sendSerializedTransaction: (serializedTransaction: string) => Promise<string>;
  clearWalletError: () => void;
}

const walletStorageKey = "battlecards.wallet-adapter";
const liveTradeSubmissionFlagName = "NEXT_PUBLIC_ENABLE_MAINNET_TRADES";
const liveTradeSubmissionEnabled =
  process.env.NEXT_PUBLIC_ENABLE_MAINNET_TRADES === "true";
const DashboardWalletContext = createContext<DashboardWalletContextValue | null>(null);

function getWalletErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Wallet request failed.";
}

function decodeBase64Transaction(serializedTransaction: string) {
  const binaryString = globalThis.atob(serializedTransaction);
  return Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
}

function deserializeTransaction(serializedTransaction: string) {
  const bytes = decodeBase64Transaction(serializedTransaction);

  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

function DashboardWalletStateProvider({
  children,
  error,
  setError,
}: {
  children: ReactNode;
  error: string | null;
  setError: (value: string | null) => void;
}) {
  const {
    wallets,
    wallet,
    publicKey,
    connecting,
    connected,
    connect,
    disconnect,
  } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    if (connected) {
      setError(null);
    }
  }, [connected, setError]);

  const value = useMemo<DashboardWalletContextValue>(
    () => ({
      connectedWallet: publicKey?.toBase58() ?? null,
      providerName: wallet ? String(wallet.adapter.name) : null,
      walletAvailable: wallets.some(
        ({ readyState }) =>
          readyState === WalletReadyState.Installed ||
          readyState === WalletReadyState.Loadable
      ),
      connecting,
      error,
      liveTradeSubmissionEnabled,
      liveTradeSubmissionFlagName,
      connectWallet: async () => {
        if (publicKey) {
          return publicKey.toBase58();
        }

        setError(null);

        if (!wallet) {
          setVisible(true);
          return null;
        }

        try {
          await connect();
          return wallet.adapter.publicKey?.toBase58() ?? null;
        } catch (caughtError) {
          setError(getWalletErrorMessage(caughtError));
          return null;
        }
      },
      disconnectWallet: async () => {
        setError(null);

        try {
          await disconnect();
        } catch (caughtError) {
          setError(getWalletErrorMessage(caughtError));
        }
      },
      sendSerializedTransaction: async (serializedTransaction: string) => {
        if (!liveTradeSubmissionEnabled) {
          throw new Error(
            `Live mainnet trade submission is disabled in this build. Set ${liveTradeSubmissionFlagName}=true to enable real sends.`
          );
        }

        if (!publicKey) {
          throw new Error("Connect a wallet before submitting an Adrena transaction.");
        }

        setError(null);

        try {
          const transaction = deserializeTransaction(serializedTransaction);
          const signature = await wallet?.adapter.sendTransaction(transaction, connection);

          if (!signature) {
            throw new Error("The connected wallet did not return a transaction signature.");
          }

          const confirmation = await connection.confirmTransaction(signature, "confirmed");

          if (confirmation.value.err) {
            throw new Error("The transaction was sent but not confirmed successfully.");
          }

          return signature;
        } catch (caughtError) {
          const message = getWalletErrorMessage(caughtError);
          setError(message);
          throw new Error(message);
        }
      },
      clearWalletError: () => setError(null),
    }),
    [
      connect,
      connecting,
      connection,
      disconnect,
      error,
      publicKey,
      setError,
      setVisible,
      wallet,
      wallets,
    ]
  );

  return (
    <DashboardWalletContext.Provider value={value}>
      {children}
    </DashboardWalletContext.Provider>
  );
}

export function DashboardWalletProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<string | null>(null);
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl(WalletAdapterNetwork.Mainnet);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        localStorageKey={walletStorageKey}
        onError={(walletError: WalletError) => setError(walletError.message)}
      >
        <WalletModalProvider>
          <DashboardWalletStateProvider error={error} setError={setError}>
            {children}
          </DashboardWalletStateProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export function useDashboardWallet() {
  const context = useContext(DashboardWalletContext);

  if (!context) {
    throw new Error("useDashboardWallet must be used within DashboardWalletProvider.");
  }

  return context;
}

export function formatShortWallet(wallet: string | null) {
  if (!wallet) {
    return "Not connected";
  }

  if (wallet.length <= 12) {
    return wallet;
  }

  return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
}

"use client";

import {
  DashboardAlert,
  DashboardBadge,
  PrimaryButton,
  SecondaryButton,
} from "@/components/dashboard/ui";
import {
  formatShortWallet,
  useDashboardWallet,
} from "@/components/dashboard/wallet-context";

export function DashboardWalletBar() {
  const {
    connectedWallet,
    walletAvailable,
    connecting,
    error,
    liveTradeSubmissionEnabled,
    connectWallet,
    disconnectWallet,
    clearWalletError,
  } = useDashboardWallet();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        <DashboardBadge tone={liveTradeSubmissionEnabled ? "amber" : "blue"}>
          {liveTradeSubmissionEnabled ? "Live Mainnet Enabled" : "Safe Mode"}
        </DashboardBadge>
        {connectedWallet ? (
          <>
            <span className="font-geist text-sm text-neutral-500">
              {formatShortWallet(connectedWallet)}
            </span>
            <SecondaryButton onClick={() => void disconnectWallet()}>
              Disconnect
            </SecondaryButton>
          </>
        ) : (
          <PrimaryButton
            onClick={() => void connectWallet()}
            disabled={!walletAvailable || connecting}
          >
            {connecting
              ? "Connecting..."
              : walletAvailable
                ? "Connect Wallet"
                : "Wallet Not Found"}
          </PrimaryButton>
        )}
      </div>

      {liveTradeSubmissionEnabled ? (
        <DashboardAlert tone="warning">
          Live mainnet enabled — transactions use real funds.
        </DashboardAlert>
      ) : null}

      {error ? (
        <DashboardAlert tone="error">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={clearWalletError}
              className="font-geist text-xs font-medium uppercase tracking-widest text-red-700"
            >
              Dismiss
            </button>
          </div>
        </DashboardAlert>
      ) : null}
    </div>
  );
}

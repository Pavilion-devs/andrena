"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DashboardParticipantProvider } from "@/components/dashboard/participant-context";
import { DashboardWalletBar } from "@/components/dashboard/wallet-bar";
import { DashboardWalletProvider } from "@/components/dashboard/wallet-context";

const sidebarLinks = [
  {
    href: "/dashboard/pilot-map",
    label: "Pilot Map",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M9 6.75V15m6-6v8.25m.503-11.577a49.69 49.69 0 0 0-11.006 0A1.724 1.724 0 0 0 3 7.377v9.246a1.724 1.724 0 0 0 1.497 1.704 49.69 49.69 0 0 0 11.006 0A1.724 1.724 0 0 0 21 16.623V7.377a1.724 1.724 0 0 0-1.497-1.704Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard",
    label: "Overview",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6Z" />
        <path d="M3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25Z" />
        <path d="M13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6Z" />
        <path d="M13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/battlecards",
    label: "Battlecards",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/leaderboard",
    label: "Leaderboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0 1 16.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.023 6.023 0 0 1-2.77.896m5.25-1.124a6.023 6.023 0 0 0 2.77.896" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "My History",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M3.75 4.5h16.5v15H3.75v-15Z" />
        <path d="M7.5 8.25h9m-9 3.75h9m-9 3.75h5.25" />
      </svg>
    ),
  },
  {
    href: "/dashboard/trade",
    label: "Trade",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/register",
    label: "Register Wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
      </svg>
    ),
  },
  {
    href: "/dashboard/admin",
    label: "Admin Ops",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
        <path d="M10.5 6h9m-9 6h9m-9 6h9M4.5 6h.008v.008H4.5V6Zm0 6h.008v.008H4.5V12Zm0 6h.008v.008H4.5V18Z" />
      </svg>
    ),
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <DashboardWalletProvider>
      <DashboardParticipantProvider>
        <div className="min-h-screen bg-neutral-50 text-neutral-900 font-geist">
          <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-white">
            <Link href="/" className="font-bold tracking-tighter text-lg">
              Adrena Battlecards
            </Link>
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="inline-flex items-center justify-center h-10 w-10 rounded-lg ring-1 ring-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                <path d="M4 12h16" />
                <path d="M4 18h16" />
                <path d="M4 6h16" />
              </svg>
            </button>
          </div>

          <div className="flex">
            <aside
              className={`
                fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-neutral-200 flex flex-col
                transition-transform duration-200 ease-out
                lg:translate-x-0 lg:static lg:z-auto
                ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
              `}
            >
              <div className="hidden lg:flex items-center h-16 px-6 border-b border-neutral-200">
                <Link href="/" className="font-bold tracking-tighter text-lg text-neutral-900">
                  Adrena Battlecards
                </Link>
              </div>

              <div className="lg:hidden flex items-center justify-between h-16 px-6 border-b border-neutral-200">
                <span className="font-bold tracking-tighter text-lg text-neutral-900">Menu</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="text-neutral-500 hover:text-neutral-900"
                  aria-label="Close menu"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-5 h-5">
                    <path d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {sidebarLinks.map((link) => {
                  const isActive =
                    link.href === "/dashboard"
                      ? pathname === link.href
                      : pathname === link.href || pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
                        ${
                          isActive
                            ? "bg-neutral-900 text-white"
                            : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                        }
                      `}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 py-4 border-t border-neutral-200">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
                    <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                  </svg>
                  Back to Home
                </Link>
              </div>
            </aside>

            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/20 z-30 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            <main className="flex-1 min-h-screen">
              <div className="mx-auto max-w-[1440px] px-4 sm:px-5 lg:px-6 py-6 space-y-6">
                <DashboardWalletBar />
                {children}
              </div>
            </main>
          </div>
        </div>
      </DashboardParticipantProvider>
    </DashboardWalletProvider>
  );
}

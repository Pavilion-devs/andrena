"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#why-adrena", label: "Why Adrena" },
  { href: "#contact", label: "Contact" },
];

const skillTags = [
  "Weekly Leagues",
  "Daily Battlecards",
  "Anti-Whale Scoring",
  "Streak Rewards",
];

const featureImages = [
  "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&h=800&fit=crop",
  "https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=800&h=800&fit=crop",
];

const features = [
  {
    type: "Competition Module",
    title: "Battlecards Leagues",
    description:
      "A weekly trading league where every day gives traders a fresh set of battlecards to complete, combining realized trading performance with dynamic objectives, streak progression, and raffle upside.",
    tags: ["Weekly Leagues", "Daily Cards", "Anti-Whale"],
    image:
      "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=1200&h=900&fit=crop",
  },
  {
    type: "Trade Integration",
    title: "Adrena Trade Launcher",
    description:
      "Push quote requests through Adrena's public transaction builders without leaving the competition module. Open longs, shorts, and limit orders directly from the league dashboard.",
    tags: ["Open Long/Short", "Limit Orders", "Live Quotes"],
    image:
      "https://images.unsplash.com/photo-1614028674026-a65e31bfd27c?w=1200&h=900&fit=crop",
  },
];

const testimonials = [
  {
    name: "Competitive Traders",
    role: "High-Skill Players",
    text: "Optimize your score through smart trading, card completion, and strategic placements. Skill and discipline outperform raw capital.",
    image:
      "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/c92852bb-a510-405a-85ab-ffa0fde136a4_320w.jpg",
  },
  {
    name: "Mid-Tier Traders",
    role: "Consistency Wins",
    text: "Win through consistency and execution, not raw size. Volume is capped, cards matter, and streaks keep you in play all week.",
    image:
      "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/4a77e6b3-efc2-47ae-a304-9e97bf3ebee3_320w.jpg",
  },
  {
    name: "Casual Traders",
    role: "Raffle & Streak Players",
    text: "Still earn raffle tickets, streak progress, and visible milestones even without topping the leaderboard. Every day counts.",
    image:
      "https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/a34e7279-3582-477a-8b2b-d9e9789eb63c_320w.jpg",
  },
];

function Header() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="w-full">
      <div className="flex xl:mt-8 w-full mt-8 mb-8 gap-x-4 gap-y-4 items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center justify-center font-geist text-xl font-bold tracking-tighter text-neutral-900"
        >
          Adrena Battlecards
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-700">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-neutral-900 transition-colors font-medium font-geist"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex gap-3 items-center">
          <button
            className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg ring-1 ring-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            aria-label="Open menu"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path d="M4 12h16" />
              <path d="M4 18h16" />
              <path d="M4 6h16" />
            </svg>
          </button>
          <Link
            href="/dashboard"
            className="hidden md:inline-flex cursor-pointer leading-none overflow-hidden whitespace-nowrap transition-all duration-150 hover:opacity-85 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] text-sm text-white text-center bg-gradient-to-b from-neutral-700 to-neutral-900 border-0 rounded-full py-3 px-8 items-center justify-center font-geist"
          >
            Connect Wallet
          </Link>
        </div>
      </div>

      <div
        className={`md:hidden bg-white/80 backdrop-blur -mx-4 sm:-mx-6 px-4 sm:px-6 ${isOpen ? "block" : "hidden"}`}
      >
        <nav className="py-4 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              className="block px-4 py-3 rounded-xl text-sm text-neutral-700 hover:bg-neutral-100 transition font-geist"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/dashboard"
            className="block px-4 py-3 rounded-xl text-sm text-white bg-neutral-900 transition font-geist text-center"
          >
            Connect Wallet
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="sm:py-24 lg:py-32 pt-24 pb-24">
      <div className="max-w-4xl [animation:fadeSlideIn_0.8s_ease-out_0s_both] animate-on-scroll">
        <h1 className="text-5xl sm:text-6xl lg:text-8xl md:text-7xl leading-[1.05] font-medium text-neutral-900 mb-6 font-geist tracking-tighter">
          Trade smarter. Compete daily. Win weekly.
        </h1>
        <p className="text-lg sm:text-xl text-neutral-600 mb-8 max-w-2xl leading-relaxed font-geist [animation:fadeSlideIn_0.8s_ease-out_0.2s_both] animate-on-scroll">
          Battlecards Leagues turns Adrena&apos;s leaderboard, quests, streaks, and raffles into a
          tighter daily game loop. Skill beats size. Consistency beats bursts.
        </p>
        <div className="flex flex-wrap gap-2.5 mb-8 [animation:fadeSlideIn_0.8s_ease-out_0.4s_both] animate-on-scroll">
          {skillTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-2 text-xs text-neutral-700 bg-neutral-100 border border-neutral-200 rounded-full py-1.5 px-3 font-geist shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 [animation:fadeSlideIn_0.8s_ease-out_0.6s_both] animate-on-scroll">
          <Link href="/dashboard" className="glass-button rounded-full">
            <span className="button-text relative block select-none font-medium text-base text-neutral-800 tracking-tight px-6 py-3.5 font-geist">
              Get Started
            </span>
            <div className="button-shine" />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center justify-center hover:bg-neutral-100 text-base font-medium text-neutral-900 bg-white border-neutral-200 border rounded-full py-3 px-6 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)] font-geist"
          >
            Learn more
          </a>
        </div>
      </div>

      <div className="mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [animation:fadeSlideIn_0.8s_ease-out_0.8s_both] animate-on-scroll">
        {featureImages.map((image) => (
          <div
            key={image}
            className="relative overflow-hidden rounded-3xl aspect-square ring-1 ring-neutral-200 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]"
          >
            <Image
              src={image}
              alt="Platform preview"
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-16 sm:py-24 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll"
    >
      <div className="mb-12">
        <p className="text-xs uppercase text-neutral-500 tracking-widest mb-2 font-geist">
          Core Modules
        </p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl text-neutral-900 font-geist tracking-tighter font-medium">
          What&apos;s Inside
        </h2>
      </div>

      <div className="grid gap-8 lg:gap-12">
        {features.map((feature, index) => (
          <article
            key={feature.title}
            className="group relative overflow-hidden rounded-3xl bg-white ring-1 ring-neutral-200 hover:shadow-xl transition-all duration-500 shadow-[0_2.8px_2.2px_rgba(0,_0,_0,_0.034),_0_6.7px_5.3px_rgba(0,_0,_0,_0.048),_0_12.5px_10px_rgba(0,_0,_0,_0.06),_0_22.3px_17.9px_rgba(0,_0,_0,_0.072),_0_41.8px_33.4px_rgba(0,_0,_0,_0.086),_0_100px_80px_rgba(0,_0,_0,_0.12)]"
          >
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 p-6 sm:p-8 lg:p-12">
              <div
                className={`${index === 1 ? "order-2 lg:order-1" : ""} relative overflow-hidden rounded-2xl aspect-[4/3] bg-gradient-to-br from-blue-100 to-blue-50 ring-1 ring-neutral-200`}
              >
                <Image
                  src={feature.image}
                  alt={feature.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="w-full h-full object-cover"
                />
              </div>

              <div
                className={`${index === 1 ? "order-1 lg:order-2" : ""} flex flex-col justify-center`}
              >
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 px-3 py-1 text-xs font-medium mb-4 w-fit font-geist">
                  {feature.type}
                </div>
                <h3 className="text-2xl sm:text-3xl mb-4 font-geist tracking-tighter font-medium">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 mb-6 leading-relaxed font-geist">
                  {feature.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-geist"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 text-neutral-900 font-medium group-hover:gap-3 transition-all font-geist"
                >
                  Open dashboard →
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="py-16 sm:py-24 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll"
    >
      <div className="mb-8">
        <p className="text-xs uppercase text-neutral-500 tracking-widest mb-2 font-geist">
          How It Works
        </p>
        <h2 className="text-3xl sm:text-4xl font-geist tracking-tighter font-medium">
          The daily game loop
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <div className="lg:col-span-8">
          <div className="relative overflow-hidden bg-white ring-1 ring-neutral-200 rounded-3xl shadow-sm">
            <div className="relative sm:h-80 w-full h-64">
              <Image
                src="https://hoirqrkdgbmvpwutwuwj.supabase.co/storage/v1/object/public/assets/assets/48ebcefa-01a3-427d-b3b9-ef83db6995e0_1600w.webp"
                alt="Competition flow"
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-cover"
              />
            </div>
            <div className="p-6 sm:p-8">
              <p className="text-lg text-neutral-700 leading-relaxed mb-4 font-geist">
                Every day, traders receive 3 battlecards — one performance, one discipline, one
                style. Complete them by trading intentionally on Adrena.
              </p>
              <p className="text-neutral-600 mb-4 font-geist">
                Closed eligible trades generate league points. Completed battlecards earn bonus
                points. Consecutive active days build streak multipliers. Raffle tickets accumulate
                separately so they never distort leaderboard integrity.
              </p>
              <p className="text-neutral-600 font-geist">
                At the end of each week, rewards are split across leaderboard placement, completion
                raffles, consistency bonuses, and cosmetic unlocks.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4 sm:gap-5">
          <div className="ring-1 ring-neutral-200 bg-white rounded-3xl p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <p className="text-2xl text-neutral-900 font-geist tracking-tighter font-medium">
                  3
                </p>
                <p className="text-sm text-neutral-600 font-geist">Daily Battlecards</p>
              </div>
              <div>
                <p className="text-2xl text-neutral-900 font-geist tracking-tighter font-medium">
                  7
                </p>
                <p className="text-sm text-neutral-600 font-geist">Day League Cycles</p>
              </div>
              <div>
                <p className="text-2xl text-neutral-900 font-geist tracking-tighter font-medium">
                  4
                </p>
                <p className="text-sm text-neutral-600 font-geist">Reward Buckets</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 rounded-3xl shadow-sm p-6">
            <div className="space-y-3">
              {[
                ["60%", "Leaderboard Placement"],
                ["20%", "Completion Raffle"],
                ["10%", "Consistency Rewards"],
                ["10%", "Cosmetic / Profile"],
              ].map(([pct, label]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-white/90 text-sm font-geist">{label}</span>
                  <span className="text-white/60 text-xs font-geist">{pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const loop = [...testimonials, ...testimonials];

  return (
    <section
      id="why-adrena"
      className="py-16 sm:py-24 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <p className="text-xs uppercase text-neutral-500 tracking-widest font-geist">
            Built For Every Trader
          </p>
          <h2 className="text-3xl sm:text-4xl font-geist tracking-tighter font-medium">
            Who It&apos;s For
          </h2>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-200 bg-white">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10" />
        <div className="py-6 sm:py-8">
          <div className="flex gap-4 sm:gap-5 will-change-transform animate-[marquee-ltr_45s_linear_infinite]">
            {loop.map((item, index) => (
              <article
                key={`${item.name}-${index}`}
                className="shrink-0 w-[280px] sm:w-[360px] md:w-[420px] rounded-2xl border border-neutral-200 bg-neutral-50 p-5"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={item.image}
                    alt={item.name}
                    width={36}
                    height={36}
                    className="size-9 object-cover rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium text-neutral-900 font-geist">
                      {item.name}
                    </span>
                    <p className="text-xs text-neutral-500 font-geist">{item.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm sm:text-base text-neutral-700 font-geist">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      id="contact"
      className="pt-16 pb-12 [animation:fadeSlideIn_0.8s_ease-out_0.1s_both] animate-on-scroll"
    >
      <div className="relative overflow-hidden bg-white border border-neutral-200 rounded-3xl">
        <div className="relative z-10 p-8 sm:p-12">
          <h3 className="text-2xl text-neutral-900 mb-2 font-geist tracking-tighter font-medium">
            Adrena Battlecards Leagues
          </h3>
          <p className="text-lg text-neutral-600 font-geist mb-8">
            A competition module for Adrena — built on Solana
          </p>

          <div className="p-8 sm:p-12 bg-gradient-to-b from-neutral-800 to-neutral-950 border-neutral-200 border rounded-3xl shadow-xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <h4 className="text-2xl text-white font-geist tracking-tighter font-medium">
                  Start competing
                </h4>
                <ul className="space-y-3 text-base text-white/70">
                  <li className="font-geist">Register your Solana wallet</li>
                  <li className="font-geist">Complete daily battlecards</li>
                  <li className="font-geist">Climb the weekly leaderboard</li>
                </ul>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 h-12 px-6 rounded-xl ring-1 ring-white/20 text-sm text-white bg-black/20 hover:bg-white hover:text-black transition font-geist"
                >
                  Open Dashboard
                </Link>
              </div>

              <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-8 text-white/70">
                <div>
                  <h5 className="text-white/80 text-xs uppercase tracking-wider font-medium mb-4 font-geist">
                    Scoring
                  </h5>
                  <ul className="space-y-3 text-base">
                    <li className="font-geist">Trade Points</li>
                    <li className="font-geist">Card Bonuses</li>
                    <li className="font-geist">Streak Multipliers</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white/80 text-xs uppercase tracking-wider font-medium mb-4 font-geist">
                    Rewards
                  </h5>
                  <ul className="space-y-3 text-base">
                    <li className="font-geist">Leaderboard Prizes</li>
                    <li className="font-geist">Raffle Tickets</li>
                    <li className="font-geist">Profile Badges</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white/80 text-xs uppercase tracking-wider font-medium mb-4 font-geist">
                    Resources
                  </h5>
                  <ul className="space-y-3 text-base">
                    <li className="font-geist">Competition Design</li>
                    <li className="font-geist">Scoring Spec</li>
                    <li className="font-geist">Architecture</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <span className="font-geist text-neutral-600">
              © 2026 Adrena Battlecards Leagues
            </span>
            <div className="flex items-center gap-3">
              <a
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 transition"
                href="https://adrena.xyz"
                target="_blank"
                rel="noreferrer"
              >
                A
              </a>
              <a
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 transition"
                href="https://twitter.com/AdrenaProtocol"
                target="_blank"
                rel="noreferrer"
              >
                X
              </a>
              <a
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-200 transition"
                href="https://discord.gg/adrena"
                target="_blank"
                rel="noreferrer"
              >
                D
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: "0px 0px -10% 0px" }
    );

    document.querySelectorAll(".animate-on-scroll").forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-neutral-50 text-neutral-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Header />
        <Hero />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <Footer />
      </div>
    </div>
  );
}

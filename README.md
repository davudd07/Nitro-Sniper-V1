# Prism Vault — Play-Money Casino-Game Showcase

A portfolio/demo web app inspired by case-opening & mini-game sites, built to
show off game mechanics, animation, and provably-fair UX — **not a real
gambling product**.

> **This is a demo.** The "Shard" currency has no real-world value. There is
> no way to purchase, deposit, withdraw, or cash out anything in this app.
> Balances live only in your browser's `localStorage` and can be reset (or
> auto-refill) at any time. All items, case names, and art are original to
> this project — nothing is copied from any third-party game or brand.

## What's inside

- **Mines** — pick a mine count, reveal tiles, cash out any time. Multipliers
  use the standard fair-mines (hypergeometric) formula scaled to a fixed RTP.
- **Blackjack** — dealer-stands-on-17 rules, 3:2 blackjack payout, animated
  card-by-card dealing (including a proper delay while the dealer draws).
- **Cases** — five original cases with fully transparent, price-derived odds
  (every case's expected value is solved algebraically from its price and a
  target RTP, so there's always a real house edge — see `src/data/cases.ts`).
  Includes a toggleable **Gold Spin** bonus animation for top ~5% pulls.
- **Case Battles** — 1v1 up to 3v3, an "Add Cases" picker (up to 50 cases per
  battle), **Crazy Mode** (lowest total wins), **Jackpot Mode** (a
  ticket-weighted spin, individual per-player tickets that can combine with
  Crazy Mode to invert the odds), and a bots-or-simulated-player seat system
  that auto-starts the battle the moment every seat is filled.
- **Provably fair** — a client-side reproduction of the classic commit/reveal
  pattern (SHA-256 seed hash shown up front, HMAC-derived rolls, seed reveal
  on rotation) so every roll is explainable, even though — because this is a
  demo with no backend — the "server" seed also lives in your browser.

## Tech stack

React + TypeScript + Vite, Tailwind CSS v4, Zustand for state, Framer Motion
for card animations, and a tiny synthesized Web Audio sound engine (no
external audio/image assets — everything is generated in code).

## Running locally

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` produces a static
production bundle in `dist/`.

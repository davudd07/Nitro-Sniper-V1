/**
 * Audit community cases whose catalog items were later deleted.
 *
 * Dropping missing rows renormalizes leftover chance to 100%, so a 50% miss +
 * 50% MAXXX case becomes 100% MAXXX at the original price. This script flags
 * that stretch, and live hydration keeps missing rows as 0-WL fillers instead.
 *
 * Usage:
 *   npm run check:community-cases
 *   npm run check:community-cases -- path/to/dump.json
 *   npm run check:community-cases -- --self-test
 *
 * Accepts a bare array, `{ cases }`, or a Zustand persist blob `{ state: { cases } }`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ITEMS } from "../src/data/items.ts";
import { hydrateCommunityCase, type CommunityCaseRecord } from "../src/lib/communityCases.ts";
import {
  auditCommunityCaseCatalog,
  auditCommunityCases,
  parseCommunityCaseDump,
} from "../src/lib/communityCaseAudit.ts";

const FAIL = 1;
const OK = 0;

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : String(n);
}

function printIssue(issue: NonNullable<ReturnType<typeof auditCommunityCaseCatalog>>): void {
  const stretch = issue.evIfRenormalized - issue.evIfHeld;
  console.log(`\n⚠  ${issue.name} (${issue.caseId})`);
  console.log(`    stored price ${fmt(issue.price)} WL · stored EV ${fmt(issue.storedEv)} WL`);
  console.log(
    `    missing ${issue.missingItemIds.join(", ")} · ${fmt(issue.missingChancePct)}% of the table`,
  );
  console.log(
    `    EV if missing rows stay 0 WL (held):          ${fmt(issue.evIfHeld)} WL`,
  );
  console.log(
    `    EV if leftover chance is stretched to 100%:   ${fmt(issue.evIfRenormalized)} WL  (+${fmt(stretch)})`,
  );
  if (issue.plusEvIfRenormalized) {
    console.log(
      `    DANGER: stretching leftover chance would make this case +EV vs its stored price.`,
    );
  }
}

function selfTest(): number {
  const rec: CommunityCaseRecord = {
    id: "sample-maxxx-bait",
    name: "MAXXX or Leafboard",
    price: 260417,
    ev: 250000,
    houseEdge: 0.04,
    commissionRate: 0.05,
    risk: "high",
    blurb: "self-test",
    from: "#000",
    to: "#000",
    creatorId: "test",
    creatorName: "test",
    designItemIds: ["maxxx_win"],
    entries: [
      { itemId: "leafboard", chancePct: 50 },
      { itemId: "maxxx_win", chancePct: 50 },
    ],
    createdAt: 0,
    opens: 0,
  };
  const issue = auditCommunityCaseCatalog(rec);
  if (!issue) {
    console.error("self-test failed: expected a catalog issue for leafboard + MAXXX");
    return FAIL;
  }
  if (!issue.missingItemIds.includes("leafboard")) {
    console.error("self-test failed: leafboard should be reported missing");
    return FAIL;
  }
  if (Math.abs(issue.missingChancePct - 50) > 1e-9) {
    console.error(`self-test failed: missing chance ${issue.missingChancePct}, expected 50`);
    return FAIL;
  }
  const maxxx = ITEMS.maxxx_win?.value ?? 0;
  if (Math.abs(issue.evIfHeld - maxxx * 0.5) > 1e-6) {
    console.error(`self-test failed: held EV ${issue.evIfHeld}, expected ${maxxx * 0.5}`);
    return FAIL;
  }
  if (Math.abs(issue.evIfRenormalized - maxxx) > 1e-6) {
    console.error(`self-test failed: renormalized EV ${issue.evIfRenormalized}, expected ${maxxx}`);
    return FAIL;
  }
  if (!issue.plusEvIfRenormalized) {
    console.error("self-test failed: 100% MAXXX at the old price should be flagged +EV");
    return FAIL;
  }
  const hydrated = hydrateCommunityCase(rec);
  const maxxxOdds = hydrated.odds.find((o) => o.item.id === "maxxx_win");
  const missOdds = hydrated.odds.find((o) => o.item.id.startsWith("missing:"));
  if (!maxxxOdds || Math.abs(maxxxOdds.probability - 0.5) > 1e-6) {
    console.error(
      `self-test failed: hydrated MAXXX chance ${maxxxOdds?.probability}, expected 0.5 (not stretched to 1)`,
    );
    return FAIL;
  }
  if (!missOdds || Math.abs(missOdds.probability - 0.5) > 1e-6 || missOdds.item.value !== 0) {
    console.error("self-test failed: deleted row should stay 50% at 0 WL");
    return FAIL;
  }
  if (maxxxOdds.tickets < 400_000 || missOdds.tickets < 400_000) {
    console.error(
      `self-test failed: ticket split looks renormalized (MAXXX ${maxxxOdds.tickets}, missing ${missOdds.tickets})`,
    );
    return FAIL;
  }
  printIssue(issue);
  console.log("\nself-test passed: missing rows stay at original chance; stretch-to-100% is flagged.\n");
  return OK;
}

function main(argv: string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: npm run check:community-cases -- <dump.json> [--strict]
       npm run check:community-cases -- --self-test

Looks for community cases that still list catalog items which were deleted.
If those rows were dropped, leftover chance would be stretched to 100% and a
50% miss + 50% MAXXX case would become a guaranteed MAXXX at the old price.

Pass a JSON dump of community cases (array, { cases }, or Zustand persist).
--strict exits 1 when any case has missing catalog items.
`);
    return OK;
  }
  if (argv.length === 0 || argv.includes("--self-test")) return selfTest();

  const fileArg = argv.find((a) => a !== "--strict" && !a.startsWith("--"));
  const strict = argv.includes("--strict");

  if (!fileArg) {
    console.log(`Usage: npm run check:community-cases -- <dump.json> [--strict]
       npm run check:community-cases -- --self-test

Looks for community cases that still list catalog items which were deleted.
If those rows were dropped, leftover chance would be stretched to 100% and a
50% miss + 50% MAXXX case would become a guaranteed MAXXX at the old price.

Pass a JSON dump of community cases (array, { cases }, or Zustand persist).
--strict exits 1 when any case has missing catalog items.
`);
    return selfTest();
  }

  const path = resolve(fileArg);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`Could not read JSON from ${path}:`, err);
    return FAIL;
  }
  const cases = parseCommunityCaseDump(parsed);
  if (cases.length === 0) {
    console.error(`No community cases found in ${path}`);
    return FAIL;
  }
  const issues = auditCommunityCases(cases);
  console.log(`Checked ${cases.length} community case(s) in ${path}.`);
  if (issues.length === 0) {
    console.log("No missing catalog items.");
    return OK;
  }
  for (const issue of issues) printIssue(issue);
  console.log(
    `\n${issues.length} case(s) still list deleted items. Live play keeps those rows as 0 WL at the original chance instead of stretching leftover odds onto the remaining prizes.`,
  );
  const plusEv = issues.filter((i) => i.plusEvIfRenormalized).length;
  if (plusEv > 0) {
    console.log(`${plusEv} of those would become +EV if missing rows were dropped.`);
  }
  return strict || plusEv > 0 ? FAIL : OK;
}

process.exit(main(process.argv.slice(2)));

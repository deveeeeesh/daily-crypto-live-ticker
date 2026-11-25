// Fetches Bitcoin / Ethereum headlines from public RSS feeds and writes news.json.
// Runs in GitHub Actions every ~10 min (see .github/workflows/news.yml). No dependencies, Node 18+.
// Only headline, source name, link and time are kept: no article text.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const OUT = new URL("../news.json", import.meta.url);
const FEEDS = [
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss/tag/bitcoin" },
  { source: "Cointelegraph", url: "https://cointelegraph.com/rss/tag/ethereum" },
  { source: "Decrypt", url: "https://decrypt.co/feed" },
  { source: "The Block", url: "https://www.theblock.co/rss.xml" },
  { source: "Bitcoin Magazine", url: "https://bitcoinmagazine.com/.rss/full/" },
];
const MAX_ITEMS = 30;
const MAX_AGE_H = 48;
const MIN_ITEMS = 8; // keep at least this many even if they are older than MAX_AGE_H

const BTC_RE = /\b(bitcoin|btc|satoshi|sats|saylor|microstrategy|strategy's|spot bitcoin|lightning network)\b/i;
const ETH_RE = /\b(ethereum|ether|eth|vitalik|buterin|layer[- ]?2|l2s?|staking|ethereum foundation)\b/i;

const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m ? decode(m[1]) : "";
};
const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

async function readFeed({ source, url }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (daily-crypto-news-ticker)" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const xml = await r.text();
    const items = [];
    for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)) {
      const b = m[0];
      const title = tag(b, "title");
      const published = Date.parse(tag(b, "pubDate") || tag(b, "dc:date"));
      if (!title || !isFinite(published)) continue;
      const coins = [];
      if (BTC_RE.test(title)) coins.push("BTC");
      if (ETH_RE.test(title)) coins.push("ETH");
      // tag feeds are already about one coin even when the headline doesn't say it
      if (!coins.length && /tag\/bitcoin/.test(url)) coins.push("BTC");
      if (!coins.length && /tag\/ethereum/.test(url)) coins.push("ETH");
      if (!coins.length) continue; // only Bitcoin / Ethereum news
      items.push({ title, source, link: tag(b, "link"), published: new Date(published).toISOString(), coins });
    }
    console.log(`${source.padEnd(16)} ${items.length} BTC/ETH headlines  (${url})`);
    return items;
  } catch (e) {
    console.log(`${source.padEnd(16)} FAILED ${e.message}  (${url})`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const results = await Promise.all(FEEDS.map(readFeed));
let previous = { items: [] };
try { previous = JSON.parse(await readFile(OUT, "utf8")); } catch {}

const fresh = results.filter(Boolean).flat();
if (!fresh.length) {
  console.log("No feed answered; keeping the existing news.json");
  process.exit(0);
}

// merge with previous items (so a feed outage doesn't empty the ticker), dedupe by normalized title
const byKey = new Map();
for (const it of [...fresh, ...previous.items]) {
  const key = norm(it.title);
  if (!key || byKey.has(key)) continue;
  byKey.set(key, { id: createHash("sha1").update(key).digest("hex").slice(0, 12), ...it, id_src: undefined });
}
const now = Date.now();
const sorted = [...byKey.values()].sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
const recent = sorted.filter((it) => now - Date.parse(it.published) <= MAX_AGE_H * 3600e3);
const items = (recent.length >= MIN_ITEMS ? recent : sorted.slice(0, MIN_ITEMS)).slice(0, MAX_ITEMS).map(({ id, title, source, link, published, coins }) => ({ id, title, source, link, published, coins }));

const sameIds = JSON.stringify(items.map((i) => i.id)) === JSON.stringify((previous.items || []).map((i) => i.id));
if (sameIds) {
  console.log(`No new headlines (${items.length} kept); news.json unchanged`);
  process.exit(0);
}
await writeFile(OUT, JSON.stringify({ updated: new Date(now).toISOString(), items }, null, 1) + "\n");
console.log(`Wrote ${items.length} headlines; newest: "${items[0].title}" (${items[0].source})`);

import fs from "node:fs";
import path from "node:path";
import { excerpt } from "@/lib/format";
import type { Citation } from "@/lib/types";

export type Article = {
  id: string;
  title: string;
  topics: string[];
  summary: string;
  body: string;
};

export type Hit = {
  articleId: string;
  title: string;
  heading: string;
  text: string;
  score: number;
};

type Chunk = Hit & { tokens: string[] };

const STOP = new Set([
  "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "at", "is", "it",
  "we", "you", "your", "our", "with", "from", "that", "this", "if", "not", "do",
  "be", "are", "was", "as", "by", "my", "me", "i", "can", "will", "about", "what",
  "does", "include", "how", "when", "your",
]);

const SYNONYMS: Record<string, string[]> = {
  ac: ["air", "conditioner", "cooling"],
  cooling: ["ac", "cool"],
  cool: ["cooling", "ac"],
  ice: ["frozen", "frost", "coil"],
  frozen: ["ice", "frost", "coil"],
  frost: ["ice", "frozen"],
  furnace: ["heater", "heat"],
  heater: ["furnace"],
  heatpump: ["heat", "pump"],
  duct: ["ducts", "vents"],
  ducts: ["duct"],
  thermostat: ["stat"],
  warranty: ["warranties"],
  warranties: ["warranty"],
  finance: ["financing"],
  financing: ["finance"],
  price: ["pricing", "cost", "quote"],
  cost: ["price", "quote"],
  quote: ["price", "estimate"],
  tune: ["maintenance", "comfort"],
  membership: ["comfort", "club", "maintenance"],
};

const KB_DIR = path.join(process.cwd(), "kb");

function parseArticle(file: string): Article {
  const raw = fs.readFileSync(/* turbopackIgnore: true */ path.join(KB_DIR, file), "utf8");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error(`Missing front matter in ${file}`);
  const meta: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const split = line.indexOf(":");
    if (split === -1) continue;
    meta[line.slice(0, split).trim()] = line.slice(split + 1).trim();
  }
  return {
    id: meta.id || file.replace(/\.md$/, ""),
    title: meta.title || file,
    topics: (meta.topics || "").split(",").map((topic) => topic.trim()).filter(Boolean),
    summary: meta.summary || "",
    body: match[2].trim(),
  };
}

export function loadArticles(): Article[] {
  return fs
    .readdirSync(/* turbopackIgnore: true */ KB_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map(parseArticle);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOP.has(token));
}

function expand(tokens: string[]): string[] {
  const out = [...tokens];
  for (const token of tokens) {
    const extra = SYNONYMS[token];
    if (extra) out.push(...extra);
  }
  if (tokens.includes("heat") && tokens.includes("pump")) out.push("heatpump");
  if (tokens.includes("comfort") || tokens.includes("club")) out.push("maintenance", "tune");
  return out;
}

function chunksFor(article: Article): Chunk[] {
  const sections = article.body.split(/\n(?=## )/).map((part) => part.trim()).filter(Boolean);
  const pieces = sections.length > 0 ? sections : [article.body];
  return pieces.map((section) => {
    const lines = section.split("\n");
    const heading = lines[0].replace(/^##\s*/, "");
    const text = lines.slice(1).join("\n").trim() || article.summary;
    const indexed = `${article.title} ${article.topics.join(" ")} ${heading} ${text} ${article.summary}`;
    return {
      articleId: article.id,
      title: article.title,
      heading,
      text,
      score: 0,
      tokens: tokenize(indexed),
    };
  });
}

const ARTICLES = loadArticles();
const INDEX: Chunk[] = ARTICLES.flatMap(chunksFor);
const AVG_LEN = INDEX.reduce((sum, chunk) => sum + chunk.tokens.length, 0) / Math.max(INDEX.length, 1);
const DF = new Map<string, number>();
for (const chunk of INDEX) {
  for (const token of new Set(chunk.tokens)) DF.set(token, (DF.get(token) ?? 0) + 1);
}

function idf(token: string): number {
  const df = DF.get(token) ?? 0;
  return Math.log(1 + (INDEX.length - df + 0.5) / (df + 0.5));
}

function hashEmbed(tokens: string[]): Float64Array {
  const vector = new Float64Array(256);
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i += 1) {
      hash = Math.imul(hash ^ token.charCodeAt(i), 16777619);
    }
    vector[Math.abs(hash) % 256] += 1;
    if (token.length >= 3) {
      for (let i = 0; i < token.length - 2; i += 1) {
        let tri = 2166136261;
        for (let j = 0; j < 3; j += 1) tri = Math.imul(tri ^ token.charCodeAt(i + j), 16777619);
        vector[Math.abs(tri) % 256] += 0.35;
      }
    }
  }
  let norm = 0;
  for (const value of vector) norm += value * value;
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i += 1) vector[i] /= norm;
  }
  return vector;
}

function cosine(a: Float64Array, b: Float64Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot;
}

const EMBEDDINGS = INDEX.map((chunk) => hashEmbed(chunk.tokens));

export const LOW_CONFIDENCE = 0.42;

export function retrieve(query: string, k = 3): Hit[] {
  const queryTokens = expand(tokenize(query));
  if (queryTokens.length === 0) return [];
  const queryEmbed = hashEmbed(queryTokens);
  const k1 = 1.2;
  const b = 0.75;
  const scored = INDEX.map((chunk, index) => {
    const tf = new Map<string, number>();
    for (const token of chunk.tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    let bm25 = 0;
    let matched = 0;
    const uniqueQuery = [...new Set(queryTokens)];
    for (const token of uniqueQuery) {
      const freq = tf.get(token) ?? 0;
      if (!freq) continue;
      matched += 1;
      const denom = freq + k1 * (1 - b + b * (chunk.tokens.length / AVG_LEN));
      bm25 += idf(token) * ((freq * (k1 + 1)) / denom);
    }
    const coverage = matched / uniqueQuery.length;
    const bmNorm = Math.min(bm25 / 6, 1);
    const similar = Math.max(0, cosine(queryEmbed, EMBEDDINGS[index]));
    const score = 0.5 * coverage + 0.3 * bmNorm + 0.2 * similar;
    return { ...chunk, score };
  })
    .filter((chunk) => chunk.score >= 0.2)
    .sort((a, bSide) => bSide.score - a.score);

  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const chunk of scored) {
    const key = `${chunk.articleId}:${chunk.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hits.push({
      articleId: chunk.articleId,
      title: chunk.title,
      heading: chunk.heading,
      text: chunk.text,
      score: chunk.score,
    });
    if (hits.length === k) break;
  }
  return hits;
}

export function toCitations(hits: Hit[]): Citation[] {
  return hits.map((hit) => ({
    id: `${hit.articleId}:${hit.heading}`,
    title: hit.title,
    section: hit.heading,
    excerpt: excerpt(hit.text),
  }));
}

export function composeFromHits(query: string, hits: Hit[]): string {
  if (hits.length === 0) {
    return "I don't have that in the Northwind guides.";
  }
  const best = hits[0];
  const sentences = best.text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 30);
  const queryTokens = new Set(expand(tokenize(query)));
  const ranked = sentences
    .map((sentence) => ({
      sentence,
      score: tokenize(sentence).filter((token) => queryTokens.has(token)).length,
    }))
    .sort((a, bSide) => bSide.score - a.score);
  const picked = ranked.filter((row) => row.score > 0).slice(0, 2).map((row) => row.sentence);
  const body = picked.length > 0 ? picked.join(" ") : sentences[0] || best.text;
  return `${body} That is from our ${best.title} note, under “${best.heading}.”`;
}

export function articleCount(): number {
  return ARTICLES.length;
}

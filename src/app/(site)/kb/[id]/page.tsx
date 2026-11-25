import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadArticles } from "@/lib/kb/retrieve";
import { DISCLAIMER } from "@/lib/brand";

export function generateStaticParams() {
  return loadArticles().map((article) => ({ id: article.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const article = loadArticles().find((item) => item.id === id);
  return { title: article?.title ?? "Guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = loadArticles().find((item) => item.id === id);
  if (!article) notFound();
  return (
    <article className="mx-auto w-full max-w-2xl px-4 py-10">
      <p className="text-[12px] text-muted-foreground">Northwind guide</p>
      <h1 className="font-display mt-2 text-4xl font-medium">{article.title}</h1>
      <p className="mt-3 text-muted-foreground">{article.summary}</p>
      <div className="mt-6 whitespace-pre-wrap text-sm leading-6">{article.body}</div>
      <p className="mt-8 text-xs text-muted-foreground">{DISCLAIMER}</p>
    </article>
  );
}

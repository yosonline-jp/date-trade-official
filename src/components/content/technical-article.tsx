import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CalendarDays, ChartCandlestick, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ShowPlateEditor } from "@/components/editor/show-editor";
import type { ComponentProps } from "react";

type Article = { header?: { title?: string; description?: string } | null; content: ComponentProps<typeof ShowPlateEditor>["defaultValue"]; created_at: string; user?: { account?: string | null; nickname?: string | null; avatar?: string | null; id: string } | null };
export function TechnicalArticle({ article, dashboard = false }: { article: Article; dashboard?: boolean }) {
  const back = dashboard ? "/dashboard/technical" : "/technicals";
  const published = new Date(article.created_at);
  const author = article.user;
  return <div className="research-page">
    <Link href={back} className="research-back"><ArrowLeft size={15} />テクニカル分析一覧へ</Link>
    <header className="research-hero"><div className="research-category"><ChartCandlestick size={16} /><span>TECHNICAL RESEARCH</span></div><h1>{article.header?.title || "テクニカル分析"}</h1>{article.header?.description && <p className="research-description">{article.header.description}</p>}<div className="research-meta"><span><CalendarDays size={14} />公開日<time dateTime={Number.isNaN(published.getTime()) ? undefined : published.toISOString()}>{Number.isNaN(published.getTime()) ? "未設定" : published.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" })}</time></span><span>チャートと戦略から、相場を読み解く。</span></div></header>
    <div className="research-layout"><article className="research-body" aria-label="テクニカル分析の本文"><div className="research-body-label"><span>ANALYSIS & INSIGHTS</span><span>RESEARCH NOTE</span></div><div id="show-content" className="research-content"><ShowPlateEditor defaultValue={article.content} /></div></article><aside className="research-sidebar">
      {author && <div className="research-author"><p className="eyebrow">WRITTEN BY</p><Link href={(dashboard ? "/dashboard/traders/" : "/traders/") + encodeURIComponent(author.account || author.id)}><Avatar><AvatarImage src={author.avatar || undefined} alt="" /><AvatarFallback>{author.nickname?.substring(0, 1) || "無"}</AvatarFallback></Avatar><div><small>作成者</small><h2>{author.nickname || "名無し"}</h2>{author.account && <p>@{author.account}</p>}</div><ArrowUpRight size={16} /></Link></div>}
      <div className="research-learn"><BookOpen size={23} /><p className="eyebrow">BUILD YOUR KNOWLEDGE</p><h2>理解を深めて、<br />次の判断へ。</h2><p>チャートの見方や戦略の基本を、学習ページで振り返る。</p><Link href={dashboard ? "/dashboard/learn/strategies" : "/learn/strategies"}>トレード戦略を学ぶ<ArrowUpRight size={15} /></Link></div>
    </aside></div><footer className="research-footer"><Link href={back}><ArrowLeft size={15} />ほかのテクニカル分析を読む</Link><span>TECHNICAL RESEARCH / DAYTRADE.</span></footer>
  </div>;
}

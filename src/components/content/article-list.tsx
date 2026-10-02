import Link from "next/link";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
export async function ArticleList({
  kind,
  page = 1,
}: {
  kind: "news" | "technical";
  page?: number;
}) {
  const technical = kind === "technical";
  const db = await createClient();
  const current = Number.isFinite(page)
    ? Math.min(1000, Math.max(1, Math.floor(page)))
    : 1;
  const { data, error, count } = await db
    .from(technical ? "technical_analysis" : "news")
    .select("id,header,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((current - 1) * 12, current * 12 - 1);
  const path = technical ? "/technicals" : "/news";
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {technical ? "RESEARCH & STRATEGY" : "MARKET INSIGHTS"}
          </p>
          <h1>
            {technical ? "テクニカル分析" : "マーケットニュース"}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {technical
              ? "チャートと戦略から、相場を見る視点を増やす。"
              : "マーケットの変化と、トレードに役立つインサイト。"}
          </p>
        </div>
        <Newspaper className="text-muted-foreground" size={27} />
      </div>
      {error && (
        <p className="data-notice" role="alert">
          記事を取得できませんでした。再度お試しください。
        </p>
      )}
      <div className="article-grid">
        {data?.map((item, i) => (
          <Link
            className="article-card"
            href={`${path}/${item.id}`}
            key={item.id}
          >
            <div className="article-cover">
              <span>{technical ? "RESEARCH" : "MARKET"}</span>
              <strong>
                {String((current - 1) * 12 + i + 1).padStart(2, "0")}
              </strong>
              <ArrowUpRight size={28} />
            </div>
            <div className="article-body">
              <p className="eyebrow">
                {new Date(item.created_at).toLocaleDateString("ja-JP", {
                  timeZone: "Asia/Tokyo",
                })}
              </p>
              <h2>{item.header?.title || "無題"}</h2>
              <p>{item.header?.description || "記事を読む"}</p>
              <span className="text-link positive">
                続きを読む <ArrowUpRight size={15} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!data?.length && !error && (
        <div className="terminal-panel empty-copy">
          記事はまだありません。新しい記事の公開をお待ちください。
        </div>
      )}
      <nav
        className="flex justify-between mt-8"
        aria-label="記事ページ切り替え"
      >
        <div>
          {current > 1 && (
            <Link
              href={`${path}?page=${current - 1}`}
              className="terminal-button secondary"
            >
              前のページ
            </Link>
          )}
        </div>
        <div>
          {current * 12 < (count ?? 0) && (
            <Link
              href={`${path}?page=${current + 1}`}
              className="terminal-button secondary"
            >
              次のページ
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}

import Link from "next/link";
import { ArrowUpRight, FileText, Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
export const metadata = { title: "コンテンツ管理 | デイトレード.net" };
export default async function CmsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const { db } = await requireAdmin();
  const params = await searchParams;
  const technical = params.type === "technical";
  const table = technical ? "technical_analysis" : "news";
  const path = technical ? "technical" : "news";
  let query = db
    .from(table)
    .select("id, header, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  if (params.q?.trim())
    query = query.ilike(
      "header->>title",
      `%${params.q.trim().replace(/[%_]/g, "")}%`,
    );
  const { data, error, count } = await query;
  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONTENT STUDIO</p>
          <h1>
            コンテンツ管理<span className="heading-dot">.</span>
          </h1>
          <p>ニュースとテクニカル分析を、ひとつのワークスペースで。</p>
        </div>
        <Link href={`/dashboard/${path}/edit`} className="terminal-button">
          <Plus size={16} />
          記事を作成
        </Link>
      </div>
      <div className="cms-tabs">
        <Link
          aria-current={!technical ? "page" : undefined}
          href="/dashboard/cms"
        >
          ニュース
        </Link>
        <Link
          aria-current={technical ? "page" : undefined}
          href="/dashboard/cms?type=technical"
        >
          テクニカル分析
        </Link>
        <span>{count ?? 0} 件</span>
      </div>
      <form className="cms-search">
        <input type="hidden" name="type" value={path} />
        <label htmlFor="cms-query" className="sr-only">
          記事タイトルを検索
        </label>
        <input
          id="cms-query"
          name="q"
          defaultValue={params.q}
          placeholder="タイトルから記事を検索…"
        />
        <button className="terminal-button secondary">検索</button>
      </form>
      <section className="terminal-panel">
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th>記事タイトル</th>
                <th>作成日</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/dashboard/${path}/edit?id=${item.id}`}>
                      <FileText size={16} />
                      {item.header?.title || "無題"}
                    </Link>
                    <p>{item.header?.description}</p>
                  </td>
                  <td>
                    {new Date(item.created_at).toLocaleDateString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })}
                  </td>
                  <td>
                    <Link href={`/dashboard/${path}/edit?id=${item.id}`}>
                      編集 <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error ? (
          <p role="alert" className="empty-copy">
            記事を取得できませんでした。再度お試しください。
          </p>
        ) : (
          !data?.length && (
            <p className="empty-copy">該当する記事はありません。</p>
          )
        )}
      </section>
      <p className="chart-footnote">
        最新100件を表示しています。以前の記事はタイトルで検索できます。保存した変更は公開ページに反映されます。
      </p>
    </div>
  );
}

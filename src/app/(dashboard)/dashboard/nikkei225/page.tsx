import { requireAdmin } from "@/lib/auth/admin";
import { NikkeiManager } from "@/components/nikkei/manager";
import { fetchCurrentNikkei225 } from "@/lib/nikkei/source";
import { listNikkeiHistory, readStoredNikkei } from "@/lib/nikkei/storage";
import { createRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "日経225 銘柄管理 | デイトレード.net" };

export default async function NikkeiPage() {
  await requireAdmin();
  const admin = await createRoleClient();
  const [sourceResult, stored, history] = await Promise.all([
    fetchCurrentNikkei225()
      .then((data) => ({ data, error: null }))
      .catch((error: Error) => ({ data: null, error: error.message })),
    readStoredNikkei(admin),
    listNikkeiHistory(admin),
  ]);
  const source = sourceResult.data ?? stored;
  const codes = source?.components.map((item) => item.code) ?? [];
  const { data: stocks, error: stocksError } = codes.length
    ? await admin.from("stocks").select("code").in("code", codes)
    : { data: [], error: null };
  const stocksByCode = new Set(stocks?.map((item) => item.code));
  const rows = (source?.components ?? []).map((item) => ({
    ...item,
    state: stocksError
      ? ("確認できません" as const)
      : !stocksByCode.has(item.code)
        ? ("マスタ未登録" as const)
        : ("登録済み" as const),
  }));
  const currentCodes = new Set(source?.components.map((item) => item.code));
  const removed = (stored?.components ?? [])
    .filter((item) => !currentCodes.has(item.code))
    .map(({ code, name }) => ({ code, name }));
  return (
    <div>
      {sourceResult.error && (
        <p role="alert" className="data-notice">
          公式一覧を取得できませんでした。{sourceResult.error}{" "}
          {stored
            ? "保存済みの一覧を表示しています。"
            : "時間をおいて再読み込みしてください。"}
        </p>
      )}
      {stocksError && (
        <p role="alert" className="data-notice">
          Supabaseの銘柄情報を確認できませんでした。
        </p>
      )}
      <NikkeiManager
        rows={rows}
        removed={removed}
        importedAt={stored?.importedAt ?? null}
        sourceDate={source?.sourceDate ?? null}
        canUpdate={!!sourceResult.data}
      />
      {history.length > 0 && (
        <section className="terminal-panel nikkei-history">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">SYNC HISTORY</p>
              <h2>更新履歴</h2>
            </div>
          </div>
          <ol>
            {history.map((item) => (
              <li key={item.name}>
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString("ja-JP", {
                      timeZone: "Asia/Tokyo",
                    })
                  : item.name}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

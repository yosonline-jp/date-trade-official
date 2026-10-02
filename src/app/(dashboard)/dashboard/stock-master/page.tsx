import { requireAdmin } from "@/lib/auth/admin";
import { createRoleClient } from "@/utils/supabase/server";
import { fetchCurrentJpxStocks } from "@/lib/jpx/source";
import { compareStocks } from "@/lib/jpx/diff";
import { readAllStocks } from "@/lib/jpx/stocks";
import { listJpxHistory, readStoredJpx } from "@/lib/jpx/storage";
import { StockMasterManager } from "@/components/jpx/stock-master-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "日本株マスタ | デイトレード.net" };

export default async function StockMasterPage() {
  await requireAdmin();
  const db = await createRoleClient();
  const [sourceResult, stored, history, stockResult] = await Promise.all([
    fetchCurrentJpxStocks()
      .then((data) => ({ data, error: null }))
      .catch((error: Error) => ({ data: null, error: error.message })),
    readStoredJpx(db),
    listJpxHistory(db),
    readAllStocks(db)
      .then((data) => ({ data, error: null }))
      .catch((error: Error) => ({ data: null, error: error.message })),
  ]);
  const source = sourceResult.data ?? stored;
  const changes =
    source && stockResult.data
      ? compareStocks(source.stocks, stockResult.data)
      : [];
  const currentCodes = new Set(source?.stocks.map((item) => item.code));
  const removed = (stored?.stocks ?? [])
    .filter((item) => !currentCodes.has(item.code))
    .map(({ code, name }) => ({ code, name }));
  return (
    <div>
      {sourceResult.error && (
        <p role="alert" className="data-notice">
          JPXの最新一覧を取得できませんでした。{sourceResult.error}{" "}
          {stored
            ? "保存済みの一覧を表示しています。"
            : "時間をおいて再読み込みしてください。"}
        </p>
      )}
      {stockResult.error && (
        <p role="alert" className="data-notice">
          {stockResult.error}
        </p>
      )}
      <StockMasterManager
        rows={changes.map(({ item, kind, fields }) => ({
          ...item,
          state: kind,
          fields,
        }))}
        existingCount={stockResult.data?.length ?? 0}
        sourceDate={source?.sourceDate ?? null}
        importedAt={stored?.importedAt ?? null}
        removed={removed}
        history={history}
        canUpdate={!!sourceResult.data && !!stockResult.data}
      />
    </div>
  );
}

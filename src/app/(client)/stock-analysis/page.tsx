import { createClient } from "@/utils/supabase/server";
import StockAnalysisWorkspace from "@/components/analysis/stock-analysis-workspace";
export const metadata = { title: "デイトレード株式分析 | デイトレード.net" };
export default async function StockAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const db = await createClient();
  const initialStock =
    code && /^[0-9A-Z]{4,5}$/.test(code)
      ? (
          await db
            .from("stocks")
            .select("code,name,market")
            .eq("code", code)
            .neq("market", "上場廃止")
            .maybeSingle()
        ).data
      : null;
  return (
    <StockAnalysisWorkspace
      key={initialStock?.code ?? "search"}
      initialStock={initialStock ?? undefined}
    />
  );
}

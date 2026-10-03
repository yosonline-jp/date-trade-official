import { createClient } from "@/utils/supabase/server";
import { analyzeStockClose } from "@/lib/market/close-analysis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const headers = { "Cache-Control": "no-store" };
  if (!/^[0-9A-Z]{4,5}$/.test(code)) {
    return Response.json(
      { error: "銘柄コードが正しくありません。" },
      { status: 400, headers },
    );
  }
  try {
    const db = await createClient();
    const { data: stock, error } = await db
      .from("stocks")
      .select("code,name,market")
      .eq("code", code)
      .maybeSingle();
    if (error)
      return Response.json(
        { error: "銘柄情報を取得できませんでした。" },
        { status: 503, headers },
      );
    if (!stock)
      return Response.json(
        { error: "銘柄情報が見つかりません。" },
        { status: 404, headers },
      );
    if (stock.market === "上場廃止") {
      return Response.json(
        { error: "上場廃止銘柄の終値分析は利用できません。" },
        { status: 422, headers },
      );
    }
    return Response.json(await analyzeStockClose(stock.code, stock.name), {
      headers,
    });
  } catch {
    return Response.json(
      {
        error:
          "終値を分析できませんでした。株価データの取得状況を確認し、時間をおいて再度お試しください。",
      },
      { status: 503, headers },
    );
  }
}

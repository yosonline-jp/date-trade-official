import { searchCatalogue } from "@/lib/analysis/provider";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return Response.json(
      await searchCatalogue(new URL(request.url).searchParams.get("q") ?? ""),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "銘柄を検索できませんでした。再度お試しください。" },
      { status: 503 },
    );
  }
}

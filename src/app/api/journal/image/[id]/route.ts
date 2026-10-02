import { createClient } from "@/utils/supabase/server";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return new Response(null, { status: 404 });
  const db = await createClient();
  const { data, error } = await db
    .from("trade_records")
    .select("screenshot_path")
    .eq("id", Number(id))
    .maybeSingle();
  if (error || !data?.screenshot_path)
    return new Response(null, { status: 404 });
  const result = await db.storage
    .from("trade-screenshots")
    .download(data.screenshot_path);
  if (result.error) return new Response(null, { status: 404 });
  return new Response(result.data, {
    headers: {
      "Content-Type": result.data.type,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

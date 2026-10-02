import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { TradeRecordsClient } from "@/components/pages/dashboard/trade/trade-records";

export default async function TradeRecordsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  const { data: records, error } = await supabase
    .from("trade_records")
    .select(
      "id, stock_code, stock_name, buy_price, sell_price, quantity, profit, trade_date, trade_type, memo, type",
    )
    .eq("user_id", user.id)
    .order("trade_date", { ascending: false });

  if (error) console.error("Failed to load trade records:", error);

  return <TradeRecordsClient initialRecords={records ?? []} userId={user.id} />;
}

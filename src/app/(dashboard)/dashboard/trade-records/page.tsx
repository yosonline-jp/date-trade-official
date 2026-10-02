import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { allTrades } from "@/lib/journal-server";
import { TradeRecordsClient } from "@/components/pages/dashboard/trade/trade-records";
export default async function TradeRecordsPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  try {
    const records = await allTrades(user.id);
    return <TradeRecordsClient initialRecords={records} userId={user.id} />;
  } catch {
    return (
      <p role="alert" className="data-notice">
        取引を取得できませんでした。接続とDB更新をご確認ください。
      </p>
    );
  }
}

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { allTrades } from "@/lib/journal-server";
import Component from "@/components/journal/reports";
export const metadata = { title: "振り返りレポート | デイトレード.net" };
export default async function Page() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  try {
    const trades = await allTrades(user.id);
    const result = await db
      .from("journal_reports")
      .select("period,start_date,reflection,next_goal")
      .eq("user_id", user.id);
    if (result.error) throw new Error("レポートを取得できませんでした。");
    return <Component trades={trades} reports={result.data} />;
  } catch {
    return (
      <div className="data-notice" role="alert">
        データを取得できませんでした。接続とDB更新の適用をご確認ください。
      </div>
    );
  }
}

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { allTrades } from "@/lib/journal-server";
import Component from "@/components/journal/analytics";
export const metadata = { title: "成績分析 | デイトレード.net" };
export default async function Page() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  try {
    const trades = await allTrades(user.id);
    return <Component trades={trades} />;
  } catch {
    return (
      <div className="data-notice" role="alert">
        データを取得できませんでした。接続とDB更新の適用をご確認ください。
      </div>
    );
  }
}

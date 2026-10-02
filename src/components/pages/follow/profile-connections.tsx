import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Users, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import MemberCard from "@/components/pages/traders/member-card";

export default async function ProfileConnections({ mode }: { mode: "following" | "followers" }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/sign-in");
  const isFollowing = mode === "following";
  const [list, other] = await Promise.all([
    supabase.from("follows").select(`users:${isFollowing ? "following_id" : "follower_id"} (id, account, nickname, bio, avatar, web_url, x_url, instagram_url, created_at)`, { count: "exact" })
      .eq(isFollowing ? "follower_id" : "following_id", user.id).order("created_at", { ascending: false }),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq(isFollowing ? "following_id" : "follower_id", user.id),
  ]);
  const followingCount = isFollowing ? list.count : other.count;
  const followersCount = isFollowing ? other.count : list.count;
  const profiles = list.data?.flatMap(row => Array.isArray(row.users) ? row.users : row.users ? [row.users] : []) ?? [];
  const title = isFollowing ? "フォロー中" : "フォロワー";
  return (
    <div className="profile-page connections-page">
      <Link className="profile-back" href="/dashboard/profile"><ArrowLeft size={15} />プロフィールに戻る</Link>
      <div className="connections-heading"><div><p className="eyebrow">YOUR NETWORK</p><h1>{title}<span className="heading-dot">.</span></h1><p>{isFollowing ? "気になるトレーダーと、つながろう。" : "あなたのトレードに関心を持つ仲間たち。"}</p></div><span className="connections-heading-icon"><Users size={30} /></span></div>
      <nav className="connections-tabs" aria-label="フォロー一覧">
        <Link href="/dashboard/following" aria-current={isFollowing ? "page" : undefined}><UserPlus size={16} />フォロー中<span>{followingCount == null ? "—" : followingCount.toLocaleString("ja-JP")}</span></Link>
        <Link href="/dashboard/followers" aria-current={!isFollowing ? "page" : undefined}><Users size={16} />フォロワー<span>{followersCount == null ? "—" : followersCount.toLocaleString("ja-JP")}</span></Link>
      </nav>
      {list.error ? <div className="terminal-panel connections-empty" role="alert"><h2>一覧を取得できませんでした</h2><p>時間をおいて、もう一度お試しください。</p></div> : profiles.length ? (
        <><div className="connections-list-meta"><span>{profiles.length.toLocaleString("ja-JP")} 人のトレーダー</span><span>最近のフォロー順</span></div><div className="connections-grid">{profiles.map(profile => <MemberCard key={profile.id} profile={profile} isDashboard />)}</div></>
      ) : (
        <div className="terminal-panel connections-empty"><span className="connections-empty-icon">{isFollowing ? <UserPlus size={28} /> : <Users size={28} />}</span><h2>{isFollowing ? "まだフォローしていません" : "まだフォロワーはいません"}</h2><p>{isFollowing ? "トレーダーのプロフィールから、気になる人をフォローしてみましょう。" : "プロフィールを整えて、トレーダー仲間とつながってみましょう。"}</p><Link className="terminal-button" href={isFollowing ? "/dashboard/traders" : "/dashboard/profile/edit"}>{isFollowing ? "トレーダーを探す" : "プロフィールを編集"}<ArrowUpRight size={16} /></Link></div>
      )}
    </div>
  );
}

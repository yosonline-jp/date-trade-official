import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type Profile = {
  id: string;
  nickname: string | null;
  avatar: string | null;
  created_at: string | null;
  account: string | null;
  bio?: string | null;
  web_url: string | null;
  x_url: string | null;
  instagram_url: string | null;
};

export default function MemberCard({ profile, isDashboard }: { profile: Profile; isDashboard?: boolean }) {
  const path = `/${isDashboard ? "dashboard/traders" : "traders"}/${encodeURIComponent(profile.account || profile.id)}`;
  const joined = profile.created_at ? new Date(profile.created_at) : null;
  return (
    <Link href={path} className="member-profile-card">
      <div className="member-profile-header">
        <Avatar className="member-profile-avatar"><AvatarImage src={profile.avatar || undefined} alt="" /><AvatarFallback>{profile.nickname?.substring(0, 1) || "無"}</AvatarFallback></Avatar>
        <div className="member-profile-identity"><h2>{profile.nickname || "名無し"}</h2>{profile.account && <p>@{profile.account}</p>}</div>
        <span className="member-profile-arrow"><ArrowUpRight size={19} /></span>
      </div>
      <p className={"member-profile-bio" + (!profile.bio ? " profile-muted" : "")}>{profile.bio || "自己紹介はまだ登録されていません。"}</p>
      <div className="member-profile-footer"><span><CalendarDays size={13} />{joined && !Number.isNaN(joined.getTime()) ? joined.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }) + " 登録" : "登録日未設定"}</span><span>プロフィールを見る<ArrowUpRight size={13} /></span></div>
    </Link>
  );
}

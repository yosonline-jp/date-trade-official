import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight, Globe2, Instagram, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ProfileMember = {
  nickname?: string | null;
  account?: string | null;
  avatar?: string | null;
  bio?: string | null;
  web_url?: string | null;
  x_url?: string | null;
  instagram_url?: string | null;
};

function externalUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

export default function ProfileOverview({
  member, actions, stats,
}: {
  member: ProfileMember;
  actions?: ReactNode;
  stats?: { label: string; value: number | null; href?: string }[];
}) {
  const links = [
    { label: "ウェブサイト", value: member.web_url, icon: Globe2 },
    { label: "X / Twitter", value: member.x_url, icon: ArrowUpRight },
    { label: "Instagram", value: member.instagram_url, icon: Instagram },
  ];
  return (
    <>
      <section className="profile-hero">
        <div className="profile-cover"><p>TRADER PROFILE</p></div>
        <div className="profile-hero-body">
          <Avatar className="profile-avatar">
            <AvatarImage src={member.avatar || undefined} alt={member.nickname || "ユーザー"} />
            <AvatarFallback>{member.nickname?.substring(0, 1) || <UserRound size={36} />}</AvatarFallback>
          </Avatar>
          <div className="profile-identity"><p className="eyebrow">PROFILE</p><h1>{member.nickname || "名無し"}<span className="heading-dot">.</span></h1>{member.account && <p className="profile-handle">@{member.account}</p>}</div>
          {actions && <div className="profile-actions">{actions}</div>}
        </div>
        {stats && <dl className="profile-stats">{stats.map(({ label, value, href }) => <div key={label}><dt>{label}</dt><dd>{href ? <Link href={href}>{value == null ? "—" : value.toLocaleString("ja-JP")}<ArrowUpRight size={14} /></Link> : value == null ? "—" : value.toLocaleString("ja-JP")}</dd></div>)}</dl>}
      </section>
      <div className="profile-info-grid">
        <section className="terminal-panel profile-about"><p className="eyebrow">ABOUT</p><h2><UserRound size={18} />自己紹介</h2><p className={"profile-bio" + (!member.bio ? " profile-muted" : "")}>{member.bio || "自己紹介はまだ登録されていません。"}</p></section>
        <section className="terminal-panel profile-links"><p className="eyebrow">CONNECT</p><h2>ウェブサイト・SNS</h2><div>{links.map(({ label, value, icon: Icon }) => {
          const href = externalUrl(value);
          const content = <><span className="profile-link-icon"><Icon size={18} /></span><span className="profile-link-copy"><strong>{label}</strong><small>{href ? href.replace(/^https?:\/\//, "").replace(/\/$/, "") : "未登録"}</small></span>{href && <ArrowUpRight size={17} />}</>;
          return href ? <Link key={label} href={href} target="_blank" rel="noopener noreferrer">{content}</Link> : <div className="profile-link-empty" key={label}>{content}</div>;
        })}</div></section>
      </div>
    </>
  );
}

"use client";
import Link from "next/link";
import { SHOW_MARKET_NEWS } from "@/lib/features";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  ChartCandlestick,
  Database,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Loader2,
  Menu,
  Newspaper,
  Search,
  Settings2,
  Star,
  X,
} from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions";

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="terminal-nav-link workspace-logout" disabled={pending} aria-busy={pending}>
      {pending ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
      <span>{pending ? "ログアウト中…" : "ログアウト"}</span>
    </button>
  );
}
const marketLinks = [
  { href: "/", label: "マーケット概要", icon: LayoutDashboard },
  { href: "/stocks", label: "日本株を探す", icon: Search },
  { href: "/chart", label: "チャート", icon: ChartCandlestick },
  { href: "/watchlist", label: "ウォッチリスト", icon: Star },
  { href: "/bot-trades", label: "Botモニター", icon: Bot },
  ...(SHOW_MARKET_NEWS
    ? [{ href: "/news", label: "マーケットニュース", icon: Newspaper }]
    : []),
  { href: "/technicals", label: "テクニカル分析", icon: Activity },
  { href: "/learn/basics", label: "トレードを学ぶ", icon: BookOpen },
];
const accountLinks = [
  { href: "/dashboard", label: "マイダッシュボード", icon: LayoutDashboard },
  {
    href: "/dashboard/trade-records",
    label: "取引記録",
    icon: ChartCandlestick,
  },
  {
    href: "/dashboard/profit-calendar",
    label: "収支カレンダー",
    icon: BarChart3,
  },
  { href: "/dashboard/watchlist", label: "ウォッチリスト", icon: Star },
  { href: "/dashboard/profile", label: "プロフィール", icon: Settings2 },
];
export function WorkspaceShell({
  children,
  signedIn = false,
  admin = false,
  nickname,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
  admin?: boolean;
  nickname?: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const personal = pathname.startsWith("/dashboard");
  const links = personal ? accountLinks : marketLinks;
  const active = (href: string) =>
    pathname === href ||
    (href !== "/" && href !== "/dashboard" && pathname.startsWith(href + "/"));
  return (
    <div className="terminal-shell">
      <a className="skip-link" href="#main-content">
        本文へ移動
      </a>
      <aside className={`terminal-sidebar ${open ? "is-open" : ""}`}>
        <Link
          href="/"
          className="terminal-brand"
          onClick={() => setOpen(false)}
        >
          <span className="brand-symbol">
            <ChartCandlestick size={23} />
          </span>
          <span>
            DAYTRADE<span className="brand-dot">.</span>
            <small>JAPAN EQUITY WORKSPACE</small>
          </span>
        </Link>
        <button
          className="sidebar-close"
          aria-label="メニューを閉じる"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <p className="nav-caption">{personal ? "MY WORKSPACE" : "WORKSPACE"}</p>
        <nav aria-label="メインナビゲーション">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              href={href}
              key={href}
              aria-current={active(href) ? "page" : undefined}
              className={`terminal-nav-link ${active(href) ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {active(href) && <ChevronRight size={14} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="research-note">
            <span className="eyebrow">BUILD YOUR EDGE</span>
            <h3>記録が、次の判断を変える。</h3>
            <p>
              毎日のトレードを振り返り、
              <br />
              自分の勝ち方を見つけよう。
            </p>
            <Link href="/dashboard/trade-records">
              取引を記録する <ArrowUpRight size={15} />
            </Link>
          </div>
          {admin && (
            <Link className="terminal-nav-link" href="/dashboard/cms">
              <Settings2 size={18} />
              コンテンツ管理
            </Link>
          )}
          {admin && (
            <Link className="terminal-nav-link" href="/dashboard/stock-master">
              <Database size={18} />
              日本株マスタ
            </Link>
          )}
          {admin && (
            <Link className="terminal-nav-link" href="/dashboard/nikkei225">
              <ListChecks size={18} />
              日経225 銘柄管理
            </Link>
          )}
          <Link
            className="terminal-nav-link"
            href={personal ? "/" : signedIn ? "/dashboard" : "/sign-in"}
          >
            <span className="account-avatar">
              {nickname?.slice(0, 1) || "D"}
            </span>
            <span>
              {personal
                ? "マーケットへ戻る"
                : nickname ||
                  (signedIn ? "マイダッシュボード" : "ログイン / 新規登録")}
            </span>
          </Link>
          {signedIn && personal && (
            <form action={signOutAction} className="workspace-logout-form">
              <LogoutButton />
            </form>
          )}
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-overlay"
          aria-label="メニューを閉じる"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="terminal-main">
        <header className="terminal-topbar">
          <div className="flex items-center gap-3">
            <button
              className="mobile-menu"
              aria-label="メニューを開く"
              aria-expanded={open}
              onClick={() => setOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="topbar-label">WORKSPACE</span>
            <ChevronRight size={13} />
            <span>
              {links.find((l) => active(l.href))?.label || "デイトレード.net"}
            </span>
          </div>
          <div className="topbar-actions">
            <span className="timezone-label">TOKYO · JST</span>
            <Link href="/stocks" aria-label="銘柄を検索">
              <Search size={18} />
            </Link>
            <Link
              href="/dashboard/trade-records"
              className="terminal-button compact"
            >
              取引を記録 <span>＋</span>
            </Link>
          </div>
        </header>
        <main id="main-content" className="terminal-content">
          {children}
        </main>
        <footer className="terminal-footer">
          <span>© {new Date().getFullYear()} DAYTRADE.　デイトレード.net</span>
          <div>
            <Link href="/about">About</Link>
            <Link href="/contact">お問い合わせ</Link>
            <Link href="/privacy-policy">プライバシー</Link>
            <Link href="/disclaimer">免責事項</Link>
          </div>
          <p>掲載情報には遅延があります。データの更新日時をご確認ください。</p>
        </footer>
      </div>
    </div>
  );
}

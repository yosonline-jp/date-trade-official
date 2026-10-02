import Link from "next/link";
import { ChartCandlestick, ArrowLeft } from "lucide-react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-screen">
      <div className="auth-story">
        <Link href="/" className="terminal-brand">
          <span className="brand-symbol">
            <ChartCandlestick />
          </span>
          <span>
            DAYTRADE<span className="brand-dot">.</span>
            <small>JAPAN EQUITY WORKSPACE</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">YOUR NEXT TRADE STARTS HERE</p>
          <h2>
            相場に向き合う。
            <br />
            自分を、更新する。
          </h2>
          <p>
            記録・分析・振り返り。
            <br />
            日々のトレードに、確かな視点を。
          </p>
        </div>
        <p className="text-xs text-slate-500">
          デイトレード.net / JAPAN EQUITY WORKSPACE
        </p>
      </div>
      <main className="auth-form">
        <Link
          href="/"
          className="text-xs text-muted-foreground flex gap-2 items-center mb-12"
        >
          <ArrowLeft size={14} />
          マーケットに戻る
        </Link>
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, BookOpen, ChartCandlestick, Brain, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type Topic = "basics" | "strategies" | "psychology";
const topics = [{ key: "basics", number: "01", label: "デイトレード基礎", icon: BookOpen }, { key: "strategies", number: "02", label: "トレード戦略", icon: ChartCandlestick }, { key: "psychology", number: "03", label: "メンタル管理", icon: Brain }] as const;
export function LearningPage({ topic, dashboard = false, title, subtitle, intro, sections, children }: { topic: Topic; dashboard?: boolean; title: string; subtitle: string; intro: ReactNode; sections: string[]; children: ReactNode }) {
  const base = dashboard ? "/dashboard/learn/" : "/learn/";
  const current = topics.findIndex(item => item.key === topic);
  const Icon = topics[current].icon;
  const next = topics[(current + 1) % topics.length];
  return <div className="learning-page">
    <header className="learning-hero"><div className="learning-hero-copy"><p className="eyebrow">THE TRADING PLAYBOOK</p><span className="learning-kicker">トレードを学ぶ / LESSON {topics[current].number}</span><h1>{title}<span className="heading-dot">.</span></h1><h2>{subtitle}</h2><div className="learning-intro">{intro}</div><a className="terminal-button" href="#lesson-1">学習を始める<ArrowRight size={16} /></a></div><div className="learning-emblem" aria-hidden="true"><Icon size={64} strokeWidth={1} /><span>LEARN. PRACTICE. REFLECT.</span></div></header>
    <nav className="learning-topics" aria-label="学習テーマ">{topics.map(item => <Link key={item.key} href={base + item.key} aria-current={topic === item.key ? "page" : undefined}><span>{item.number}</span><item.icon size={18} /><strong>{item.label}</strong><ChevronRight size={16} /></Link>)}</nav>
    <div className="learning-layout"><aside className="learning-toc"><p className="eyebrow">IN THIS LESSON</p><h2>このページで学ぶこと</h2><nav aria-label="学習ページの目次">{sections.map((label, i) => <a key={label} href={"#lesson-" + (i + 1)}><span>{String(i + 1).padStart(2, "0")}</span>{label}</a>)}</nav><div className="learning-toc-note"><BookOpen size={18} /><p>自分のペースで学び、<br />日々の取引に活かそう。</p></div></aside><div className="learning-body">{children}<Link className="learning-next" href={base + next.key}><div><small>NEXT LESSON / {next.number}</small><h2>{next.label}</h2><p>次のテーマを学ぶ</p></div><ArrowRight size={24} /></Link></div></div>
  </div>;
}

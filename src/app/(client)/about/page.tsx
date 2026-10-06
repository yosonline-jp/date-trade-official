import Link from "next/link";
import BrandLogo from "@/components/brand-logo";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChartCandlestick,
  ChartNoAxesCombined,
  ClipboardPen,
  Eye,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { InformationHeader } from "@/components/pages/site-information";
export const metadata = {
  title: "デイトレード.netについて | デイトレード.net",
  description:
    "日本株を調べ、取引を記録し、データで振り返る。デイトレード.netは、日々の判断を見直すための学習・分析・記録プラットフォームです。",
};
const features = [
  {
    icon: ChartCandlestick,
    title: "調べる",
    tag: "RESEARCH",
    description:
      "日本株の銘柄情報とチャートを確認。気になる銘柄はウォッチリストにまとめられます。",
    href: "/stocks",
    link: "日本株を探す",
  },
  {
    icon: ClipboardPen,
    title: "記録する",
    tag: "JOURNAL",
    description:
      "売買価格・手数料・エントリー理由を残す。CSV取り込みやチャート画像の保存にも対応します。",
    href: "/dashboard/trade-records",
    link: "取引記録を開く",
  },
  {
    icon: ChartNoAxesCombined,
    title: "振り返る",
    tag: "REFLECTION",
    description:
      "収支カレンダーと成績分析で傾向を確認。週次・月次レポートで、次に試すことを言葉にします。",
    href: "/dashboard/analytics",
    link: "成績分析を開く",
  },
];
export default function AboutPage() {
  return (
    <div className="info-page about-page">
      <InformationHeader
        active="/about"
        eyebrow="ABOUT DAYTRADE"
        title="記録から、次の判断へ"
        description="デイトレード.netは、日本株を調べ、取引を記録し、日々の判断を振り返るためのワークスペースです。"
      />
      <section className="about-hero">
        <div>
          <p className="eyebrow">SMALL STEPS. BETTER HABITS.</p>
          <h2>
            今日のトレードに、
            <br />
            <span>明日への気づきを。</span>
          </h2>
          <p>
            利益も、損失も、そのとき考えていたことも。
            <br />
            ひとつの記録に残すことで、結果だけでは見えなかった自分の判断を見直せます。
          </p>
          <div className="info-actions">
            <Link className="terminal-button" href="/sign-up">
              記録をはじめる
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link className="info-text-link" href="/stocks">
              まずは銘柄を見てみる
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <figure className="about-cycle">
          <div className="about-cycle-mark">
            <BrandLogo size={64} className="about-brand-logo" />
            <span>
              DAYTRADE<span className="heading-dot">.</span>
            </span>
            <small>YOUR TRADING WORKSPACE</small>
          </div>
          <figcaption>
            <span>
              <ClipboardPen size={16} aria-hidden="true" />
              記録
            </span>
            <ArrowRight size={14} aria-hidden="true" />
            <span>
              <ChartNoAxesCombined size={16} aria-hidden="true" />
              分析
            </span>
            <ArrowRight size={14} aria-hidden="true" />
            <span>
              <RefreshCw size={16} aria-hidden="true" />
              振り返り
            </span>
          </figcaption>
        </figure>
      </section>
      <section
        className="about-features"
        aria-labelledby="about-features-title"
      >
        <div className="info-section-title">
          <div>
            <p className="eyebrow">ONE WORKSPACE</p>
            <h2 id="about-features-title">調べる、記録する、振り返る。</h2>
          </div>
          <p>日々のトレードを、ひとつの場所で。</p>
        </div>
        <div className="about-feature-grid">
          {features.map(({ icon: Icon, ...f }, i) => (
            <article className="about-feature" key={f.title}>
              <div className="about-feature-top">
                <Icon size={22} aria-hidden="true" />
                <small>
                  0{i + 1} / {f.tag}
                </small>
              </div>
              <h3>{f.title}</h3>
              <p>{f.description}</p>
              <Link href={f.href}>
                {f.link}
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <section className="about-principles">
        <div>
          <p className="eyebrow">OUR APPROACH</p>
          <h2>
            自分のペースで、
            <br />
            自分のトレードを育てる。
          </h2>
          <p>
            特定の売買や成果を約束するのではなく、判断を振り返るための材料を提供します。
          </p>
          <Link href="/learn/basics" className="info-text-link">
            <BookOpen size={16} aria-hidden="true" />
            トレードの基礎を学ぶ
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="about-principle-list">
          <article>
            <ShieldCheck size={21} aria-hidden="true" />
            <div>
              <h3>公開する記録は、自分で選ぶ。</h3>
              <p>
                新しい取引記録は非公開が初期設定。公開にした記録は、メモや画像もほかの利用者が閲覧できます。
              </p>
            </div>
          </article>
          <article>
            <Eye size={21} aria-hidden="true" />
            <div>
              <h3>データの時点を確かめる。</h3>
              <p>
                株価・指数には更新の遅延があります。表示された更新日と配信元の情報を確認してご利用ください。
              </p>
            </div>
          </article>
          <article>
            <RefreshCw size={21} aria-hidden="true" />
            <div>
              <h3>振り返りを、次の行動につなげる。</h3>
              <p>
                記録した理由や反省点を読み返し、週次・月次レポートに次の目標を残せます。
              </p>
            </div>
          </article>
        </div>
      </section>
      <div className="about-bottom">
        <p>サービスへのご意見や、不具合のご報告はこちらへ。</p>
        <Link href="/contact">
          お問い合わせ
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

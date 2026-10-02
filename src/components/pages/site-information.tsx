import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowUpRight, type LucideIcon } from "lucide-react";

const links = [
  { href: "/about", label: "ABOUT" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/privacy-policy", label: "プライバシー" },
  { href: "/disclaimer", label: "免責事項" },
];
export function InformationHeader({
  active,
  eyebrow,
  title,
  description,
}: {
  active: string;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <header className="info-header">
      <Link href="/" className="info-back">
        <ArrowLeft size={14} aria-hidden="true" />
        マーケットへ戻る
      </Link>
      <nav className="info-nav" aria-label="サイト情報">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active === link.href ? "page" : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <p className="eyebrow">{eyebrow}</p>
      <h1>
        {title}
        <span className="heading-dot">.</span>
      </h1>
      <p className="info-intro">{description}</p>
    </header>
  );
}
export type PolicySection = { id: string; title: string; content: ReactNode };
export function PolicyPage({
  active,
  eyebrow,
  title,
  description,
  icon: Icon,
  highlights,
  sections,
}: {
  active: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: { title: string; description: string }[];
  sections: PolicySection[];
}) {
  return (
    <div className="info-page policy-page">
      <InformationHeader
        active={active}
        eyebrow={eyebrow}
        title={title}
        description={description}
      />
      <div className="policy-summary">
        <div className="policy-summary-heading">
          <span>
            <Icon size={23} aria-hidden="true" />
          </span>
          <div>
            <p className="eyebrow">AT A GLANCE</p>
            <h2>まず、知っておいていただきたいこと</h2>
          </div>
        </div>
        <div className="policy-highlights">
          {highlights.map((item, i) => (
            <div key={item.title}>
              <small>0{i + 1}</small>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="policy-layout">
        <aside className="policy-toc">
          <p className="eyebrow">CONTENTS</p>
          <nav aria-label="このページの目次">
            {sections.map((section, i) => (
              <a key={section.id} href={"#" + section.id}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {section.title}
              </a>
            ))}
          </nav>
          <p className="policy-toc-note">
            施行日：2025年10月1日
            <br />
            更新日：2026年10月2日
          </p>
        </aside>
        <div className="policy-sections">
          {sections.map((section, i) => (
            <section
              key={section.id}
              id={section.id}
              className="policy-section"
            >
              <div className="policy-section-heading">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
              </div>
              <div className="policy-copy">{section.content}</div>
            </section>
          ))}
          <div className="policy-contact">
            <div>
              <p className="eyebrow">NEED HELP?</p>
              <h2>ご不明な点は、お問い合わせください。</h2>
              <p>デイトレード.net 運営事務局</p>
            </div>
            <Link href="/contact">
              お問い合わせ
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

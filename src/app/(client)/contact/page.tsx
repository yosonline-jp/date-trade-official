import Link from "next/link";
import {
  ArrowUpRight,
  Bug,
  Lightbulb,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import ContactForm from "@/components/pages/contact-form";
import { InformationHeader } from "@/components/pages/site-information";
export const metadata = {
  title: "お問い合わせ | デイトレード.net",
  description:
    "機能についてのご質問、不具合の報告、ご意見・ご要望はこちらから。デイトレード.net運営事務局へのお問い合わせフォームです。",
};
export default function ContactPage() {
  return (
    <div className="info-page contact-page">
      <InformationHeader
        active="/contact"
        eyebrow="CONTACT & SUPPORT"
        title="お問い合わせ"
        description="使い方のご質問、不具合のご報告、こんな機能がほしいというアイデア。あなたの声をお聞かせください。"
      />
      <div className="contact-layout">
        <aside className="contact-aside">
          <section className="contact-support-card">
            <span className="contact-support-icon">
              <MessageSquare size={25} aria-hidden="true" />
            </span>
            <p className="eyebrow">WE ARE LISTENING</p>
            <h2>
              より使いやすい場所を、
              <br />
              一緒につくる。
            </h2>
            <p>
              サービスについてのお問い合わせを、運営事務局で受け付けています。
            </p>
            <div className="contact-topics">
              <span>
                <MessageSquare size={16} aria-hidden="true" />
                使い方・アカウントのご相談
              </span>
              <span>
                <Bug size={16} aria-hidden="true" />
                不具合・情報の誤りのご報告
              </span>
              <span>
                <Lightbulb size={16} aria-hidden="true" />
                改善アイデア・ご要望
              </span>
            </div>
          </section>
          <Link href="/faq" className="contact-faq-card">
            <div>
              <p className="eyebrow">BEFORE YOU SEND</p>
              <h3>よくある質問もご覧ください。</h3>
              <p>お探しの答えが見つかるかもしれません。</p>
            </div>
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          <div className="contact-guidance">
            <ShieldCheck size={18} aria-hidden="true" />
            <p>
              お預かりした内容はお問い合わせ対応のために利用します。個別銘柄の売買判断や投資助言のご相談には対応していません。
            </p>
          </div>
        </aside>
        <ContactForm />
      </div>
    </div>
  );
}

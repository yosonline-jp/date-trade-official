import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  PolicyPage,
  type PolicySection,
} from "@/components/pages/site-information";
export const metadata = {
  title: "プライバシーポリシー | デイトレード.net",
  description:
    "取得する情報、利用目的、取引記録の公開範囲、外部サービス、Cookie、削除やお問い合わせについてご案内します。",
};
export default function PrivacyPolicyPage() {
  const analyticsEnabled = Boolean(process.env.NEXT_PUBLIC_GA_ID?.trim());
  const sections: PolicySection[] = [
    {
      id: "information",
      title: "取得する情報",
      content: (
        <>
          <p>
            デイトレード.net（以下「当サイト」）は、サービスの利用に伴い、次の情報を取得します。
          </p>
          <ul>
            <li>
              アカウント情報：メールアドレス、認証に必要な情報、登録・更新日時
            </li>
            <li>
              プロフィール情報：ニックネーム、自己紹介、プロフィール画像、入力したウェブサイト・SNSのURL
            </li>
            <li>
              利用者が登録した情報：取引記録、収支、メモ、画像、ウォッチリスト、振り返りレポート、フォロー情報
            </li>
            <li>
              お問い合わせ情報：お名前、メールアドレス、件名、お問い合わせ内容
            </li>
            <li>
              サービス利用に伴う情報：アクセス日時、閲覧ページ、ブラウザー・端末情報、通信や障害に関するログ
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "purposes",
      title: "情報の利用目的",
      content: (
        <ul>
          <li>本人認証、アカウント管理、記録・分析などのサービス提供</li>
          <li>お問い合わせへの対応、必要なサービス案内・メンテナンスの連絡</li>
          <li>不正利用の防止、セキュリティ対策、障害の調査</li>
          <li>利用状況の把握と、機能・使いやすさの改善</li>
        </ul>
      ),
    },
    {
      id: "visibility",
      title: "プロフィールと記録の公開範囲",
      content: (
        <>
          <p>
            プロフィールやフォロー情報、利用者が公開を選択した取引記録は、ほかの利用者や未ログインの閲覧者が見ることができます。
          </p>
          <div className="policy-callout">
            <strong>取引記録は、公開範囲をご確認ください。</strong>
            <p>
              新規取引は非公開が初期設定です。公開に変更すると、取引内容に加えてメモ・理由・反省点・添付画像も公開されます。既存の公開記録は自動では非公開に変わりません。
            </p>
          </div>
          <p>
            ウォッチリストの追加メモ、振り返りレポート、収支カレンダーなどの非公開情報は、本人向けの機能として取り扱います。シェア機能で作成した画像を外部に投稿する場合は、画像や文章に含まれる情報を事前に確認してください。
          </p>
        </>
      ),
    },
    {
      id: "providers",
      title: "外部サービスと第三者提供",
      content: (
        <>
          <p>
            当サイトは、サービス提供に必要な範囲で、次の外部サービスを利用します。
          </p>
          <dl className="policy-services">
            <div>
              <dt>Supabase</dt>
              <dd>ログイン認証、登録情報・お問い合わせの保存、画像の保管</dd>
            </div>
            <div>
              <dt>OpenAI</dt>
              <dd>
                AIによる銘柄分析。分析の指示や分析対象に関する入力内容が送信されます。
              </dd>
            </div>
            {analyticsEnabled && (
              <div>
                <dt>Google Analytics</dt>
                <dd>
                  閲覧ページなどの利用状況の分析。詳しくは次項をご確認ください。
                </dd>
              </div>
            )}
          </dl>
          <p>
            サービスの提供地域や設定によっては、情報が日本国外で処理・保管される場合があります。各サービスの情報の取扱いは、
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
            >
              Supabase
            </a>
            、
            <a
              href="https://openai.com/policies/privacy-policy/"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenAI
            </a>
            {analyticsEnabled && (
              <>
                、
                <a
                  href="https://policies.google.com/privacy?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google
                </a>
              </>
            )}
            のポリシーをご確認ください。
          </p>
          <p>
            法令に基づく場合その他法令で認められる場合を除き、本人の同意なく個人データを第三者に提供しません。業務の委託に伴う情報の取扱いは、利用目的の達成に必要な範囲に限ります。
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookieとアクセス解析",
      content: (
        <>
          <p>
            当サイトは、ログイン状態の維持などにCookieを利用します。Cookieは、ブラウザーに保存される小さなデータです。ブラウザーの設定で制限・削除できますが、ログインなど一部の機能が利用できなくなる場合があります。
          </p>
          {analyticsEnabled && (
            <>
              <p>
                利用状況の把握と改善のためにGoogle
                Analyticsを利用しています。Cookieや識別子を用いて閲覧ページ・端末情報などが収集され、Googleに送信されます。
              </p>
              <div className="policy-resource-links">
                <a
                  href="https://policies.google.com/technologies/partner-sites?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Googleによるデータの利用について ↗
                </a>
                <a
                  href="https://tools.google.com/dlpage/gaoptout?hl=ja"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Analyticsのオプトアウト ↗
                </a>
              </div>
            </>
          )}
        </>
      ),
    },
    {
      id: "management",
      title: "情報の管理と保存",
      content: (
        <>
          <p>
            不正アクセス・漏えい・改ざんを防ぐため、通信の暗号化やアクセス制御など、情報の性質に応じた管理を行います。外部サービスへの委託にあたっては、必要な範囲で情報を取り扱います。
          </p>
          <p>
            アカウント情報と記録は、サービス提供に必要な期間保存します。お問い合わせ情報は、対応・対応履歴の管理に必要な範囲で保存します。法令により保存が必要な情報は、法令に従って取り扱います。
          </p>
        </>
      ),
    },
    {
      id: "requests",
      title: "確認・訂正・削除のご相談",
      content: (
        <>
          <p>
            プロフィールや記録は、ログイン後に各画面から確認・編集できます。アカウントの削除は、
            <Link href="/dashboard/profile">プロフィール画面</Link>
            の「アカウントを削除する」から行えます。削除したアカウントと記録は復元できません。
          </p>
          <p>
            個人情報の開示、訂正、利用停止、消去などのご相談は、
            <Link href="/contact">お問い合わせフォーム</Link>
            からご連絡ください。本人確認を行ったうえで、法令に従って対応します。パスワードや認証コードを送る必要はありません。
          </p>
        </>
      ),
    },
    {
      id: "changes",
      title: "ポリシーの変更と窓口",
      content: (
        <>
          <p>
            サービスや情報の取扱いの変更に応じて、このポリシーを更新することがあります。変更内容は本ページに掲載し、法令上必要な通知や同意の手続を行います。
          </p>
          <p>
            個人情報の取扱いに関する窓口：デイトレード.net 運営事務局
            <br />
            <Link href="/contact">お問い合わせフォーム</Link>
          </p>
        </>
      ),
    },
  ];
  return (
    <PolicyPage
      active="/privacy-policy"
      eyebrow="PRIVACY POLICY"
      title="プライバシーポリシー"
      description="どの情報を扱い、何のために利用するのか。安心して記録を続けられるよう、情報の取扱いをご案内します。"
      icon={ShieldCheck}
      highlights={[
        {
          title: "必要な目的のために",
          description:
            "認証・記録・お問い合わせ対応など、サービスの提供と改善に利用します。",
        },
        {
          title: "公開範囲を選べます",
          description:
            "取引は公開・非公開を設定できます。公開時はメモと画像も閲覧対象です。",
        },
        {
          title: "確認・削除の窓口",
          description:
            "プロフィールからアカウントを削除できます。個人情報のご相談も受け付けます。",
        },
      ]}
      sections={sections}
    />
  );
}

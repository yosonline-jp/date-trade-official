"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowRight, Check, CheckCircle2, Loader2, Send } from "lucide-react";
import { contactResolver, type ContactInput } from "@/validations/contact";
import { submitContact } from "@/app/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export default function ContactForm() {
  const [sent, setSent] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false),
    successRef = useRef<HTMLDivElement>(null),
    errorRef = useRef<HTMLParagraphElement>(null),
    wasSent = useRef(false);
  const form = useForm<ContactInput>({
    resolver: contactResolver,
    defaultValues: {
      name: "",
      email: "",
      email_confirm: "",
      title: "",
      content: "",
      consent: false,
      website: "",
    },
  });
  useEffect(() => {
    if (sent) {
      successRef.current?.focus();
    } else if (wasSent.current) {
      form.setFocus("name");
    }
    wasSent.current = sent;
  }, [sent, form]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  const content = form.watch("content");
  const onSubmit = async (input: ContactInput) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await submitContact(input);
      if (result.ok) {
        form.reset();
        setSent(true);
      } else {
        setError(result.error);
      }
    } catch {
      setError(
        "送信結果を確認できませんでした。入力内容は残っています。通信状況を確認してから再度お試しください。",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  if (sent)
    return (
      <div
        className="contact-success terminal-panel"
        ref={successRef}
        tabIndex={-1}
        role="status"
      >
        <span>
          <CheckCircle2 size={32} aria-hidden="true" />
        </span>
        <p className="eyebrow">MESSAGE RECEIVED</p>
        <h2>お問い合わせを受け付けました。</h2>
        <p>
          内容を確認し、必要に応じてご入力のメールアドレスへご連絡します。
          <br />
          返信が必要な場合は、迷惑メールフォルダーもご確認ください。
        </p>
        <div className="info-actions">
          <Link href="/" className="terminal-button">
            マーケットへ戻る
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setSent(false);
              setError(null);
            }}
          >
            別のお問い合わせを送る
          </Button>
        </div>
      </div>
    );
  const fields = [
    {
      name: "name" as const,
      label: "お名前",
      placeholder: "山田 太郎",
      type: "text",
      autoComplete: "name",
      max: 80,
    },
    {
      name: "email" as const,
      label: "メールアドレス",
      placeholder: "you@example.com",
      type: "email",
      autoComplete: "email",
      max: 254,
    },
    {
      name: "email_confirm" as const,
      label: "メールアドレス（確認）",
      placeholder: "同じメールアドレスをもう一度",
      type: "email",
      autoComplete: "off",
      max: 254,
    },
    {
      name: "title" as const,
      label: "件名",
      placeholder: "例：取引記録の保存について",
      type: "text",
      autoComplete: "off",
      max: 100,
    },
  ];
  return (
    <section
      className="contact-form-panel terminal-panel"
      aria-labelledby="contact-form-title"
    >
      <div className="contact-form-heading">
        <div>
          <p className="eyebrow">CONTACT FORM</p>
          <h2 id="contact-form-title">お問い合わせフォーム</h2>
        </div>
        <span>全項目必須</span>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          aria-busy={pending}
        >
          <fieldset disabled={pending}>
            <div className="contact-fields">
              {fields.map((item) => (
                <FormField
                  key={item.name}
                  control={form.control}
                  name={item.name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{item.label}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type={item.type}
                          placeholder={item.placeholder}
                          autoComplete={item.autoComplete}
                          maxLength={item.max}
                          required
                          {...(item.type === "email"
                            ? {
                                inputMode: "email" as const,
                                autoCapitalize: "none",
                                spellCheck: false,
                              }
                            : {})}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem className="contact-message">
                  <div className="contact-message-label">
                    <FormLabel>お問い合わせ内容</FormLabel>
                    <span aria-live="off">{content?.length ?? 0} / 5,000</span>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={7}
                      maxLength={5000}
                      required
                      placeholder="お困りの内容やご意見をお聞かせください。不具合の場合は、対象ページ・操作手順・発生日時などを添えていただけると確認がスムーズです。"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="contact-sensitive-note">
              パスワード・認証コード・APIキーなどの秘密情報は記載しないでください。
            </p>
            <div className="contact-honeypot" aria-hidden="true">
              <label htmlFor="contact-website">
                この欄は空欄にしてください
              </label>
              <input
                id="contact-website"
                tabIndex={-1}
                autoComplete="off"
                {...form.register("website")}
              />
            </div>
            <FormField
              control={form.control}
              name="consent"
              render={({ field }) => (
                <FormItem className="contact-consent">
                  <div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        required
                      />
                    </FormControl>
                    <FormLabel>
                      <Link
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        プライバシーポリシー
                      </Link>
                      を確認し、お問い合わせ対応のための情報の取扱いに同意します。
                    </FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
          {error && (
            <p
              className="contact-submit-error"
              role="alert"
              tabIndex={-1}
              ref={errorRef}
            >
              {error}
            </p>
          )}
          <div className="contact-submit">
            <p>
              <Check size={14} aria-hidden="true" />
              内容をご確認のうえ送信してください。
            </p>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : (
                <Send aria-hidden="true" />
              )}
              {pending ? "送信中…" : "お問い合わせを送信"}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}

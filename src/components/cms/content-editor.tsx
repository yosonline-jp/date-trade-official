"use client";
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, Save, Trash2 } from "lucide-react";
import { PlateEditor } from "@/components/editor/plate-editor";
import { ShowPlateEditor } from "@/components/editor/show-editor";
import { saveNews, deleteNews } from "@/app/actions/news";
import {
  saveTechnicalAnalysis,
  deleteTechnicalAnalysis,
} from "@/app/actions/technical";
import { createClient } from "@/utils/supabase/client";
export type ArticleHeader = {
  title: string;
  description: string;
  thumbnail?: string | null;
};
export function ContentEditor({
  id,
  kind,
  initialHeader,
  initialContent,
}: {
  id?: number;
  kind: "news" | "technical";
  initialHeader: ArticleHeader;
  initialContent: unknown[];
}) {
  const router = useRouter();
  const [header, setHeader] = useState(initialHeader);
  const [content, setContent] = useState<unknown[]>(
    initialContent.length
      ? initialContent
      : [{ type: "p", children: [{ text: "" }] }],
  );
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState("");
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const save = () =>
    startTransition(async () => {
      setMessage("");
      try {
        if (kind === "news") await saveNews({ id, header, content });
        else await saveTechnicalAnalysis({ id, header, content });
        setDirty(false);
        router.push(
          `/dashboard/cms${kind === "technical" ? "?type=technical" : ""}`,
        );
        router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "保存できませんでした。",
        );
      }
    });
  const remove = () =>
    startTransition(async () => {
      try {
        if (!id) return;
        if (kind === "news") await deleteNews(id);
        else await deleteTechnicalAnalysis(id);
        setDirty(false);
        router.push(
          `/dashboard/cms${kind === "technical" ? "?type=technical" : ""}`,
        );
        router.refresh();
      } catch {
        setMessage("削除できませんでした。再度お試しください。");
      }
    });
  async function upload(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setMessage("画像はPNG・JPEG・WebP、5MB以内で選択してください。");
      return;
    }
    setUploading(true);
    try {
      const db = createClient();
      const name = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await db.storage.from("thumbnails").upload(name, file);
      if (error) throw error;
      const { data } = db.storage.from("thumbnails").getPublicUrl(name);
      setHeader({ ...header, thumbnail: data.publicUrl });
      setDirty(true);
    } catch {
      setMessage("画像をアップロードできませんでした。");
    } finally {
      setUploading(false);
    }
  }
  return (
    <div>
      <Link href="/dashboard/cms" className="text-link text-muted-foreground">
        <ArrowLeft size={14} />
        コンテンツ管理へ
      </Link>
      <div className="page-heading mt-6">
        <div>
          <p className="eyebrow">CONTENT STUDIO / {kind.toUpperCase()}</p>
          <h1>
            {id ? "記事を編集" : "新しい記事"}
            <span className="heading-dot">.</span>
          </h1>
          <p>
            {dirty
              ? "未保存の変更があります"
              : "保存すると公開ページに反映されます"}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="terminal-button secondary"
            onClick={() => setPreview(!preview)}
          >
            <Eye size={15} />
            {preview ? "編集に戻る" : "プレビュー"}
          </button>
          <button
            className="terminal-button"
            onClick={save}
            disabled={pending || uploading}
          >
            <Save size={15} />
            {pending ? "保存中…" : "公開して保存"}
          </button>
        </div>
      </div>
      {message && (
        <p role="alert" className="data-notice">
          {message}
        </p>
      )}
      {preview ? (
        <article className="terminal-panel p-7">
          <p className="eyebrow">PREVIEW</p>
          <h2 className="text-3xl my-6">{header.title || "無題"}</h2>
          <p className="text-muted-foreground mb-8">{header.description}</p>
          <ShowPlateEditor defaultValue={content} />
        </article>
      ) : (
        <div className="cms-editor-grid">
          <section className="terminal-panel p-6">
            <label
              htmlFor="article-title"
              className="block text-xs text-muted-foreground mb-3"
            >
              タイトル
            </label>
            <input
              id="article-title"
              className="cms-title-input"
              value={header.title}
              maxLength={200}
              placeholder="記事のタイトルを入力"
              onChange={(e) => {
                setHeader({ ...header, title: e.target.value });
                setDirty(true);
              }}
            />
            <label
              htmlFor="article-description"
              className="block text-xs text-muted-foreground mt-7 mb-3"
            >
              概要
            </label>
            <textarea
              id="article-description"
              className="cms-description"
              value={header.description}
              maxLength={1000}
              rows={3}
              placeholder="記事のポイントを短く紹介"
              onChange={(e) => {
                setHeader({ ...header, description: e.target.value });
                setDirty(true);
              }}
            />
            <div className="mt-8">
              <p className="text-xs text-muted-foreground mb-4">本文</p>
              <PlateEditor
                defaultValue={content}
                onChange={(value: { value: unknown[] }) => {
                  setContent(value.value);
                  setDirty(true);
                }}
              />
            </div>
          </section>
          <aside className="terminal-panel p-6 self-start">
            <p className="eyebrow">PUBLICATION</p>
            <h2 className="text-sm mt-4 mb-6">記事の設定</h2>
            <p className="text-xs text-muted-foreground leading-7">
              カテゴリー：{kind === "news" ? "ニュース" : "テクニカル分析"}
              <br />
              公開先：デイトレード.net
            </p>
            {kind === "technical" && (
              <label className="block text-xs mt-7">
                サムネイル画像
                <input
                  type="file"
                  className="block w-full mt-3 text-xs"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
                <span className="text-muted-foreground block mt-2">
                  PNG / JPEG / WebP · 5MB以内
                </span>
                {header.thumbnail && (
                  <Link
                    href={header.thumbnail}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3 positive"
                  >
                    登録画像を確認 ↗
                  </Link>
                )}
              </label>
            )}
            {id && (
              <div className="mt-8 border-t pt-6">
                <button
                  className="text-xs negative flex gap-2"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={14} />
                  記事を削除
                </button>
                {confirmDelete && (
                  <div className="mt-4" role="alert">
                    <p className="text-xs leading-6">
                      記事を削除します。この操作は取り消せません。
                    </p>
                    <div className="flex gap-4 mt-3">
                      <button
                        className="negative text-xs"
                        disabled={pending}
                        onClick={remove}
                      >
                        削除を実行
                      </button>
                      <button
                        className="text-xs"
                        onClick={() => setConfirmDelete(false)}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

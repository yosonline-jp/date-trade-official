"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  ChartNoAxesCombined,
  ImageIcon,
  Loader2,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Props = {
  trigger: ReactNode;
  open: boolean;
  pending: boolean;
  error: string | null;
  confirmation: string;
  onOpenChange: (open: boolean) => void;
  onConfirmationChange: (value: string) => void;
  onConfirm: () => void;
};

export function AccountDeletionDialog({
  trigger,
  open,
  pending,
  error,
  confirmation,
  onOpenChange,
  onConfirmationChange,
  onConfirm,
}: Props) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) onOpenChange(value);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent
        className="account-delete-dialog"
        aria-busy={pending}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <form
          className="account-delete-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!pending && confirmation === "削除する") onConfirm();
          }}
        >
          <div className="account-delete-body">
            <div className="account-delete-heading">
              <span className="account-delete-icon">
                <Trash2 size={24} aria-hidden="true" />
              </span>
              <p className="account-delete-kicker">ACCOUNT SETTINGS</p>
              <AlertDialogTitle>アカウントを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                これまでの記録とプロフィールが削除されます。
                <br />
                大切な記録は、先にCSVなどで保存してください。
              </AlertDialogDescription>
            </div>
            <div className="account-delete-data">
              <p>削除されるデータ</p>
              <ul>
                <li>
                  <UserRound size={16} aria-hidden="true" />
                  <span>プロフィール・フォロー情報</span>
                </li>
                <li>
                  <ChartNoAxesCombined size={16} aria-hidden="true" />
                  <span>取引記録・収支カレンダー・AI分析</span>
                </li>
                <li>
                  <BookOpen size={16} aria-hidden="true" />
                  <span>ウォッチリスト・メモ・振り返り</span>
                </li>
                <li>
                  <ImageIcon size={16} aria-hidden="true" />
                  <span>アップロードした画像・投稿</span>
                </li>
              </ul>
            </div>
            <div className="account-delete-warning" id="account-delete-warning">
              <AlertTriangle size={17} aria-hidden="true" />
              <p>
                この操作は取り消せません。
                <br />
                <span>削除したアカウントとデータは復元できません。</span>
              </p>
            </div>
            <div>
              <label
                className="account-delete-label"
                htmlFor="account-delete-confirmation"
              >
                確認のため「削除する」と入力してください
              </label>
              <Input
                id="account-delete-confirmation"
                value={confirmation}
                onChange={(event) => onConfirmationChange(event.target.value)}
                placeholder="削除する"
                autoComplete="off"
                disabled={pending}
                aria-describedby="account-delete-warning"
              />
              {error && (
                <p className="account-delete-error" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
          <div className="account-delete-footer">
            <div className="account-delete-actions">
              <AlertDialogCancel disabled={pending}>
                キャンセル
              </AlertDialogCancel>
              <Button
                type="submit"
                variant="destructive"
                disabled={pending || confirmation !== "削除する"}
              >
                {pending ? (
                  <Loader2 className="animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 aria-hidden="true" />
                )}
                {pending ? "削除中…" : "アカウントを削除"}
              </Button>
            </div>
            <p className="account-delete-note" role="status">
              {pending
                ? "処理が完了するまで、この画面を閉じずにお待ちください。"
                : "削除が完了すると、自動的にログアウトします。"}
            </p>
          </div>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResetPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  console.log(searchParams);

  return (
    <div className="flex items-center justify-center">
      <div className="relative flex w-full flex-1 flex-col justify-center gap-2 px-2 sm:max-w-md">
        <form className="relative flex w-full flex-col justify-center gap-2 rounded p-4 text-foreground animate-in lg:p-8 shadow-lg border-t border-t-slate-400/10">
          <h1 className="text-2xl font-medium">パスワードリセット</h1>

          {(searchParams as any)?.success !== "パスワードを更新しました" && (
            <>
              <p className="text-sm text-foreground/60">
                {/* Please enter your new password below.日本語で　 */}
                新しいパスワードを入力してください。
              </p>
              <Label htmlFor="password">新しいパスワード</Label>
              <Input
                type="password"
                name="password"
                placeholder="新しいパスワード"
                required
              />
              <Label htmlFor="confirmPassword">
                新しいパスワードをもう一度入力してください。
              </Label>
              <Input
                type="password"
                name="confirmPassword"
                placeholder="確認用パスワード"
                required
              />
              <SubmitButton formAction={resetPasswordAction}>
                パスワードリセット
              </SubmitButton>
            </>
          )}

          <FormMessage message={searchParams} />
        </form>
      </div>
    </div>
  );
}

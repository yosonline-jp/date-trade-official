import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="flex items-center justify-center">
      <div className="relative flex w-full flex-1 flex-col justify-center gap-2 px-2 sm:max-w-md">
        <form className="relative flex w-full flex-col justify-center gap-2 rounded p-4 text-foreground animate-in lg:p-8 shadow-lg border-t border-t-slate-400/10">
          <div>
            <h1 className="text-2xl font-medium mb-4">パスワードリセット</h1>
            <p className="text-sm text-secondary-foreground">
              すでにアカウントをお持ちですか？
              <Link className="text-primary underline" href="/sign-in">
                ログインする
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2 [&>input]:mb-3 mt-2">
            <Label htmlFor="email">メールアドレス</Label>
            <Input name="email" placeholder="you@example.com" required />
            <SubmitButton formAction={forgotPasswordAction}>
              パスワードリセット
            </SubmitButton>
            <FormMessage message={searchParams} />
          </div>
        </form>
      </div>
    </div>
  );
}

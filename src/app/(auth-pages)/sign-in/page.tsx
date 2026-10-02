import { signInAction } from "@/app/actions";
import AuthSignin from "@/components/auth-signin";
import { FormMessage, Message } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

export default async function Login(props: { searchParams: Promise<Message> }) {
	const searchParams = await props.searchParams;
	return (
		<div className="flex items-center justify-center">
			<div className="relative flex w-full flex-1 flex-col justify-center gap-2 px-2 sm:max-w-md">
				<form
					className="relative flex w-full flex-col justify-center gap-2 rounded p-4 text-foreground animate-in lg:p-8 shadow-lg border-t border-t-slate-400/10"
					action={signInAction}
				>
					<h1 className="mb-2 text-center text-xl font-semibold">ログイン</h1>
					<Label className="text-sm" htmlFor="email">
						メールアドレス
					</Label>
					<Input
						name="email"
						placeholder="you@example.com"
						required
						id="email"
					/>
					<Label className="text-sm" htmlFor="password">
						パスワード
					</Label>
					<Input
						type="password"
						name="password"
						id="password"
						placeholder="••••••••"
						required
					/>
					<Button className="mt-2 font-extrabold" type="submit">
						ログイン
					</Button>
					<FormMessage message={searchParams} />
					<Link href="/forgot-password" className="mx-auto">
						<Button className="text-xs underline" variant="link" type="button">
							パスワードをお忘れですか？
						</Button>
					</Link>
					<Separator />
					<p className="mt-4 text-center text-sm">他のアカウントでログイン</p>
					<AuthSignin provider="google" text="Googleでログイン" />
					<AuthSignin provider="twitter" text="Xでログイン" />
					{/* <AuthSignin provider="github" text="Githubでログイン" /> */}
					<Link href="/sign-up" className="mx-auto">
						<Button variant="link" className="text-xs underline" type="button">
							新しくアカウントを作成する
						</Button>
					</Link>
				</form>
			</div>
		</div>
	);
}

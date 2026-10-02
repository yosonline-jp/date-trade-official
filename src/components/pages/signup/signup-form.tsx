"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

import AuthSignin from "@/components/auth-signin";
import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { signUpAction } from "@/app/actions";
import { SignupSchema } from "@/validations/signup";

export default function SignupForm() {
	const form = useForm<z.infer<typeof SignupSchema>>({
		resolver: zodResolver(SignupSchema),
		defaultValues: {
			nickname: "",
			email: "",
			password: {
				password: "",
				password_confirm: "",
			},
		},
	});

	const onSubmit = async (data: z.infer<typeof SignupSchema>) => {
		signUpAction(data);
	};

	return (
		<div className="flex items-center justify-center">
			<div className="relative flex w-full flex-1 flex-col justify-center gap-2 px-2 sm:max-w-md">
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="flex w-full flex-col justify-center p-4 text-foreground shadow-lg animate-in lg:p-8 border-t border-t-slate-400/10"
					>
						<h1 className="mb-2 text-center text-xl font-semibold">
							新規アカウント
						</h1>
						<FormField
							control={form.control}
							name="nickname"
							render={({ field }) => (
								<FormItem className="my-2">
									<FormLabel className="font-bold">ニックネーム*</FormLabel>
									<FormControl>
										<Input
											className="w-full"
											placeholder="ニックネームを入力してください"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							render={({ field }) => (
								<FormItem className="my-2">
									<FormLabel className="font-bold">メールアドレス*</FormLabel>
									<FormControl>
										<Input
											className="w-full"
											placeholder="メールアドレスを入力してください"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password.password"
							render={({ field }) => (
								<FormItem className="my-2">
									<FormLabel className="font-bold">パスワード*</FormLabel>
									<FormControl>
										<Input
											type="password"
											className="w-full"
											placeholder="パスワードを入力してください"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="password.password_confirm"
							render={({ field }) => (
								<FormItem className="my-4">
									<FormLabel className="font-bold">
										確認用のパスワード*
									</FormLabel>
									<FormControl>
										<Input
											type="password"
											className="w-full"
											placeholder="確認用のパスワードを入力してください"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{/* <SubmitButton
              formAction={signUpAction}
              pendingText="アカウントを作成中..."
            >
              アカウントを作成する
            </SubmitButton> */}
						<Button className="mb-6 mt-2 font-extrabold" type="submit">
							アカウント作成する
						</Button>
						<Separator />
						<p className="mt-4 text-center text-sm">他のアカウントでログイン</p>
						<Link className="w-full" href="/sign-in">
							<Button
								variant="outline"
								className="mt-2 w-full font-extrabold"
								type="button"
							>
								メールアドレスでログイン
							</Button>
						</Link>
						<AuthSignin provider="google" text="Googleでログイン" />
						{/* <AuthSignin provider="github" text="Githubでログイン" /> */}
					</form>
				</Form>
				{/* )} */}
			</div>
		</div>
	);
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";

const ContactSchema = z.object({
	name: z
		.string()
		.min(2, {
			message: "お名前は2文字以上で入力してください。",
		})
		.max(20, {
			message: "お名前は20文字以下で入力してください。",
		}),
	email: z
		.object({
			email: z
				.string()
				.min(1, "メールアドレスを入力してください。")
				.email("メールアドレスの形式で入力してください"),
			email_confirm: z
				.string()
				.min(1, "確認用のメールアドレスを入力してください。"),
		})
		.superRefine(({ email, email_confirm }, ctx) => {
			if (email !== email_confirm) {
				ctx.addIssue({
					path: ["email_confirm"],
					code: "custom",
					message: "メールアドレスが一致しません。",
				});
			}
		}),
	title: z
		.string()
		.min(2, {
			message: "お問い合わせタイトルは2文字以上で入力してください。",
		})
		.max(100, {
			message: "お問い合わせタイトルは100文字以下で入力してください。",
		}),
	content: z
		.string()
		.min(2, {
			message: "お問い合わせ内容は2文字以上で入力してください。",
		})
		.max(300, {
			message: "お問い合わせ内容は300文字以下で入力してください。",
		}),
});

export default function Index() {
	const [sended, setSended] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
 const [submitError, setSubmitError] = useState("");

	const form = useForm<z.infer<typeof ContactSchema>>({
		resolver: zodResolver(ContactSchema),
		defaultValues: {
			name: "",
			email: {
				email: "",
				email_confirm: "",
			},
			title: "",
			content: "",
		},
	});

	const onSubmit = async (data: z.infer<typeof ContactSchema>) => {
		setIsLoading(true); setSubmitError("");
		const supabase = createClient();
		const { name, email, title, content } = data;
		const { error } = await supabase
			.from("contact")
			.insert({
				name,
				email: email.email,
				title,
				content,
			})
			.single();
		setIsLoading(false);
		if (error) { setSubmitError("送信できませんでした。時間をおいて再度お試しください。"); return; }
  form.reset();
		setSended(true);
	};

	return (
		<>
      {submitError && <p role="alert" className="data-notice">{submitError}</p>}
			<h1 className="mb-8 text-center text-2xl font-bold md:mb-12 lg:text-3xl">
				お問い合わせ
			</h1>
			{sended ? (
				<div className="my-12 text-center">
					このたびは、お問い合わせいただき、誠にありがとうございます。
					<br />
					お問い合わせを確かに承りましたので、ご連絡いたします!
				</div>
			) : isLoading ? (
				<div className="relative mt-6 min-h-[140px] w-full">
					<div className="absolute left-0 top-0 z-10 flex h-full w-full items-center justify-center">
						<div className="flex min-h-[300px] items-center justify-center">
							<div className="h-20 w-20 animate-spin rounded-full border-4 border-dashed" />
						</div>
					</div>
				</div>
			) : (
				<>
					<div className="mx-auto max-w-2xl p-4 font-bold text-center">
						デイトレード.netは、
						<br />
						お客様のお問い合わせにお答えいたします
					</div>
					<Card className="mx-auto mt-6 w-full max-w-lg p-6">
						<Form {...form}>
							<form onSubmit={form.handleSubmit(onSubmit)}>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem className="my-4">
											<FormLabel className="font-bold">お名前*</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="お名前を入力してください"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email.email"
									render={({ field }) => (
										<FormItem className="my-4">
											<FormLabel className="font-bold">
												メールアドレス*
											</FormLabel>
											<FormControl>
												<Input
													type="email"
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
									name="email.email_confirm"
									render={({ field }) => (
										<FormItem className="my-4">
											<FormLabel className="font-bold">
												確認用のメールアドレス*
											</FormLabel>
											<FormControl>
												<Input
													type="email"
													className="w-full"
													placeholder="確認用のメールアドレスを入力してください"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem className="my-4">
											<FormLabel className="font-bold">
												お問い合わせタイトル*
											</FormLabel>
											<FormControl>
												<Input
													className="w-full"
													placeholder="お問い合わせタイトルを入力してください"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="content"
									render={({ field }) => (
										<FormItem className="my-4">
											<FormLabel className="font-bold">
												お問い合わせ内容*
											</FormLabel>
											<FormControl>
												<Textarea
													rows={10}
													className="w-full"
													placeholder="お問い合わせ内容を入力してください"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<div className="mt-6 flex items-center justify-center">
									<Button
										className="mb-4 w-full max-w-[200px] md:mb-0"
										type="submit"
									>
										送信する
									</Button>
								</div>
							</form>
						</Form>
					</Card>
				</>
			)}
		</>
	);
}


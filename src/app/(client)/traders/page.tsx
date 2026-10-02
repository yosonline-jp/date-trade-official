import MemberCard from "@/components/pages/traders/member-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export const metadata = {
	title: "デイトレーダー紹介 | デイトレード.net",
	description:
		"デイトレード.netに登録しているトレーダーの一覧ページです。日々トレードを記録し、実績を共有することで、他のトレーダーと切磋琢磨できます。あなたもトレーダー登録をして、仲間と共に成長しましょう。",
};

export default async function Index() {
	const supabase = createClient();
	const { data, error } = await supabase
		.from("users")
		.select(
			"id, account, nickname, bio, avatar, web_url, x_url, instagram_url, created_at"
		)
		// .in("type", ["player", "admin"])
		.order("created_at", { ascending: true });

	if (error) {
		console.log(error);

		notFound();
	}

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">
				デイトレーダー紹介
			</h1>
			<p className="mx-auto my-12 text-center">
				こちらは、このサイトを利用して日々トレードを行っている
				<strong className="bold">デイトレーダー</strong>のリストです。
				<br />
				トレーダー登録をすると、自分のトレード記録を管理したり、
				他のトレーダーの実績を参考にしたりできます。
			</p>
			<div className="mb-12 flex w-full items-center justify-center">
				<Link href="/sign-up">
					<Button>トレーダー登録をする</Button>
				</Link>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-2">
				{data.map((profile) => (
					<MemberCard key={profile.id} profile={profile} />
				))}
			</div>
		</div>
	);
}

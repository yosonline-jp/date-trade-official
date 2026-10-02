/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export const metadata = {
	title: "ニュース | デイトレード.net",
	description: "",
};

const offset = 10;

export default async function Index({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const { more } = await searchParams;
	const moreNews = Number(more ?? offset);
	const supabase = createClient();

	const { data, error, count } = await supabase
		.from("news")
		.select("id, header,created_at, user(account, nickname, avatar, id)", {
			count: "exact",
		})
		.order("created_at", { ascending: false })
		.limit(moreNews);

	if (!data || error) {
		notFound();
	}

	return (
		<div className="max-w-5xl mx-auto py-10">
			<h1 className="text-4xl font-bold mb-6 text-center">ニュース</h1>
			{/* add button to edit news */}
			<Link href={`/dashboard/news/edit`}>
				<Button>ニュースを追加</Button>
			</Link>
			{/* <p className="mx-auto my-12 max-w-3xl text-center">
				こちらは、デイトレードに関するニュースリストです。興味のある方は誰でもニュースを閲覧することができます。初心者の方から経験豊富なトレーダーまで、どなたでも大歓迎です！
			</p> */}
			<div className="flex flex-col space-y-4 mt-6">
				{data.map((news) => (
					<div key={news.id} className="rounded border p-6">
						<Link href={`/dashboard/news/edit?id=${news.id}`}>
							<p className="my-3">{news.header.title}</p>
							<p className="text-xs">{news.header.description}</p>
						</Link>
						<div className="flex items-center space-x-2 mt-6">
							<Avatar>
								<AvatarImage src={news.user.avatar || ""} />
								<AvatarFallback>
									{news.user.nickname.substring(0, 1) || "無"}
								</AvatarFallback>
							</Avatar>
							<div className="flex space-x-4">
								<div className="flex flex-col">
									<p className="font-bold">{news.user.nickname || "名無し"}</p>
									<div className="flex items-center space-x-2">
										<p className="text-[10px]">
											作成日:{" "}
											{new Date(news.created_at).toLocaleDateString("ja-JP", {
												year: "numeric",
												month: "2-digit",
												day: "2-digit",
											})}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>

			{data.length === 0 && (
				<p className="mt-12 text-center text-white">ニュースがありません</p>
			)}
			{(count || 0) > moreNews && (
				<Link
					className="font-dot mx-auto mt-10 block text-center underline underline-offset-4"
					href={`/news?more=${moreNews + offset}`}
					scroll={false}
				>
					もっと見る
				</Link>
			)}
		</div>
	);
}

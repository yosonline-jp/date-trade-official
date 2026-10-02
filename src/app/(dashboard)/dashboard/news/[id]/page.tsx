import BackBtn from "@/components/back-btn";
import { ShowPlateEditor } from "@/components/editor/show-editor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 0;

export default async function Index({
	params,
}: {
	params: Promise<{ id: string[] }>;
}) {
	const { id } = await params;
	const supabase = createClient();
	const { data, error } = await supabase
		.from("news")
		.select("*, user(account, nickname, avatar, id)")
		.match({ id })
		.limit(1)
		.order("created_at", { ascending: false })
		.maybeSingle();

	if (!data || error) {
		notFound();
	}

	return (
		<div className="w-full">
			<BackBtn />
			<div id="show-content">
				<ShowPlateEditor defaultValue={data.content} />
			</div>
			<div className="w-full">
				{data.user && (
					<div className="mt-6 flex items-center space-x-2">
						<Link
							href={`/members/${
								data.user.account ? data.user.account : data.user.id
							}`}
						>
							<Avatar>
								<AvatarImage className="h-10 w-10" src={data.user.avatar} />
								<AvatarFallback>
									{data.user.nickname.substring(0, 1) || "無"}
								</AvatarFallback>
							</Avatar>
						</Link>
						<div className="flex space-x-4">
							<Link
								href={`/members/${
									data.user.account ? data.user.account : data.user.id
								}`}
							>
								<div className="flex flex-col">
									<p className="text-xs">作成者</p>
									<p className="font-bold">{data.user.nickname || "名無し"}</p>
								</div>
							</Link>
						</div>
					</div>
				)}
				<span className="relative mt-8 block text-center text-xs">
					最終更新日:{" "}
					{new Date(data.created_at).toLocaleDateString("ja-JP", {
						timeZone: "Asia/Tokyo",
						year: "numeric",
						month: "2-digit",
						day: "2-digit",
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			</div>
		</div>
	);
}

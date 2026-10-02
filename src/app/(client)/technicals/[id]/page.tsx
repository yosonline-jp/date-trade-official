import { TechnicalArticle } from "@/components/content/technical-article";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 0;

export async function generateMetadata({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("technical_analysis")
		.select("*")
		.match({ id })
		.limit(1)
		.order("created_at", { ascending: false })
		.maybeSingle();
	if (!data || error) {
		return { title: "", description: "" };
	}
	return {
		title: `${data.header?.title || "テクニカル分析"}| テクニカル分析 | デイトレード.net`,
		description: data.header?.description || "",
	};
}

export default async function Index({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const supabase = await createClient();
	const { data, error } = await supabase
		.from("technical_analysis")
		.select("*, user(account, nickname, avatar, id)")
		.match({ id })
		.limit(1)
		.order("created_at", { ascending: false })
		.maybeSingle();

	if (!data || error) {
		notFound();
	}

	return <TechnicalArticle article={data} />;
}

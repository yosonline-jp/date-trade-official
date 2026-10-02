import { TechnicalArticle } from "@/components/content/technical-article";
import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";

export const revalidate = 0;

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

	return <TechnicalArticle article={data} dashboard />;
}

import { createClient } from "@/utils/supabase/client";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const URL = "https://デイトレード.net";
	const supabase = createClient();

	// Fetch dynamic routes for traders and stocks
	const { data: traders } = await supabase.from("users").select("id, account");
	const { data: stocks } = await supabase.from("stocks").select("code");
	// technical table
	const { data: technicals } = await supabase
		.from("technical_analysis")
		.select("id");
	//  news table
	const { data: news } = await supabase.from("news").select("id");

	// Static routes
	const staticRoutes = [
		"",
		"/about",
		"/features",
		"/faq",
		"/stocks",
		"/contact",
		"/watchlist",
		"/privacy-policy",
		"/terms-of-service",
		"/disclaimer",
		"/traders",
		"/technicals",
		"/news",
		"/learn/basics",
		"/learn/strategies",
		"/learn/psychology",
		"/chart",
	];

	const staticEntries = staticRoutes.map((route) => ({
		url: `${URL}${route}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "weekly" as const,
		priority: route === "" ? 1 : 0.5,
	}));

	const traderEntries = (traders || []).map((trader) => ({
		url: `${URL}/traders/${trader.account || trader.id}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "weekly" as const,
		priority: 0.5,
	}));

	const stockEntries = (stocks || []).map((stock) => ({
		url: `${URL}/stocks/${stock.code}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "weekly" as const,
		priority: 0.5,
	}));

	const technicalEntries = (technicals || []).map((technical) => ({
		url: `${URL}/technicals/${technical.id}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "weekly" as const,
		priority: 0.5,
	}));

	const newsEntries = (news || []).map((newsItem) => ({
		url: `${URL}/news/${newsItem.id}`,
		lastModified: new Date().toISOString(),
		changeFrequency: "weekly" as const,
		priority: 0.5,
	}));

	return [
		...staticEntries,
		...traderEntries,
		...stockEntries,
		...technicalEntries,
		...newsEntries,
	];
}

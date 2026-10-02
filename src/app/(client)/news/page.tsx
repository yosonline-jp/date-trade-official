import { ArticleList } from "@/components/content/article-list";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  return <ArticleList kind="news" page={Number(params.page || 1)} />;
}

import { ContentEditor } from "@/components/cms/content-editor";
import { requireAdmin } from "@/lib/auth/admin";
import { notFound } from "next/navigation";
export default async function EditPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { db } = await requireAdmin();
  const { id: raw } = await searchParams;
  const id = raw ? Number(raw) : undefined;
  if (raw && (!Number.isSafeInteger(id) || id! <= 0)) notFound();
  const item = id
    ? (
        await db
          .from("technical_analysis")
          .select("id,header,content")
          .eq("id", id)
          .maybeSingle()
      ).data
    : null;
  if (id && !item) notFound();
  return (
    <ContentEditor
      kind="technical"
      id={id}
      initialHeader={item?.header ?? { title: "", description: "" }}
      initialContent={Array.isArray(item?.content) ? item.content : []}
    />
  );
}

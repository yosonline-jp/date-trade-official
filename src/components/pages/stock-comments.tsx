/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment } from "@/app/actions/stock-comments";
import CommentCard from "../comment-card";

export async function CommentList({
	comments,
	user,
}: {
	comments: any[];
	user: any;
}) {
	return (
		<div className="space-y-4 mt-6">
			<h2 className="text-xl font-bold">コメント一覧</h2>
			{comments?.length === 0 && (
				<p className="text-sm text-muted-foreground">
					まだコメントはありません。
				</p>
			)}
			{comments?.map((c) => (
				<CommentCard key={c.id} comment={c} owner={user?.id === c.user_id.id} />
			))}
		</div>
	);
}

export function CommentForm({ stockCode }: { stockCode: string }) {
	return (
		<form
			action={async (formData) => {
				"use server";
				const comment = formData.get("comment") as string;
				await addComment(stockCode, comment);
			}}
			className="mt-6 space-y-3 px-0.5"
		>
			<Textarea
				name="comment"
				placeholder="コメントを入力"
				className="min-h-[80px]"
				required
			/>
			<Button type="submit">コメントする</Button>
		</form>
	);
}

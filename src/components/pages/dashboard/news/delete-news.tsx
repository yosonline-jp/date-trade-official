"use client";

import { deleteNews } from "@/app/actions/news";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type DeleteNewsBtnProps = {
	newsId: number;
};

const DeleteNewsBtn = ({ newsId }: DeleteNewsBtnProps) => {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const deleteNewsAction = async () => {
		startTransition(async () => {
			try {
				await deleteNews(newsId);
				toast({
					title: "成功",
					description: "ニュースを削除しました",
				});
				router.push("/dashboard/news");
			} catch (err) {
				console.error(err);
				toast({
					title: "エラー",
					description: "ニュースの削除に失敗しました",
					variant: "destructive",
				});
			}
		});
	};

	return (
		<Button onClick={deleteNewsAction} disabled={isPending}>
			{isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "削除する"}
		</Button>
	);
};

export default DeleteNewsBtn;

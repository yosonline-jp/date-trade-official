/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Link from "next/link";
import { deleteComment } from "@/app/actions/stock-comments";

const CommentCard = ({ comment, owner }: { comment: any; owner: boolean }) => {
	return (
		<div className="relative rounded border p-4 shadow-lg">
			{owner && (
				<DropdownMenu>
					<DropdownMenuTrigger className="absolute right-2 top-2" asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<span className="sr-only">Open menu</span>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{
							<DropdownMenuItem
								onClick={async () => {
									await deleteComment(comment.id);
								}}
								className="cursor-pointer focus:font-bold"
							>
								削除する
							</DropdownMenuItem>
						}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
			<Link
				href={`/traders/${
					comment.user_id.account ? comment.user_id.account : comment.user_id.id
				}`}
				target="_blank"
			>
				<div className="flex items-center space-x-2">
					<div className="flex space-x-4">
						<Avatar className="h-8 w-8">
							<AvatarImage src={comment.user_id.avatar} />
							<AvatarFallback>
								{comment.user_id.nickname.substring(0, 1) || "無"}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<div className="flex flex-row gap-2 items-center">
								<p className="font-bold text-sm">
									{comment.user_id.nickname || "名無し"}
								</p>
							</div>

							<div className="flex items-center space-x-2">
								<p className="text-xs text-gray-400">
									{formatDistanceToNow(new Date(comment.created_at), {
										locale: ja,
									}).replace("約", "")}
								</p>
							</div>
						</div>
					</div>
				</div>
			</Link>
			<p className={clsx("mt-4 whitespace-pre-wrap break-all text-sm")}>
				{comment.comment}
			</p>
		</div>
	);
};

export default CommentCard;

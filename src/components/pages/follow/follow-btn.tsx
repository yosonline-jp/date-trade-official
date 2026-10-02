"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { followUser, unfollowUser } from "@/app/actions/follow";
import { toast } from "@/hooks/use-toast";

interface FollowButtonProps {
	targetUserId: string;
	initialIsFollowing: boolean;
	currentUserId?: string;
}

export default function FollowButton({
	targetUserId,
	initialIsFollowing,
	currentUserId,
}: FollowButtonProps) {
	const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
	const [isPending, startTransition] = useTransition();

	// 🔹 自分自身の場合はフォローボタン非表示
	if (currentUserId === targetUserId) {
		return null;
	}

	async function handleFollow() {
		startTransition(async () => {
			try {
				if (isFollowing) {
					await unfollowUser(targetUserId);
					setIsFollowing(false);
					toast({
						title: "フォロー解除",
						description: "フォローを解除しました",
					});
				} else {
					await followUser(targetUserId);
					setIsFollowing(true);
					toast({
						title: "フォロー完了",
						description: "フォローしました",
					});
				}
			} catch (err) {
				console.error(err);
			}
		});
	}

	return (
		<Button
			variant={isFollowing ? "outline" : "default"}
			onClick={handleFollow}
			disabled={isPending}
			className="min-w-[120px]"
		>
			{isPending ? (
				<Loader2 className="animate-spin w-4 h-4" />
			) : isFollowing ? (
				"フォロー中"
			) : (
				"フォローする"
			)}
		</Button>
	);
}

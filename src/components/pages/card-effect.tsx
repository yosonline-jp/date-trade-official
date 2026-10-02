"use client";

import Image from "next/image";
import React from "react";
import { CardBody, CardContainer, CardItem } from "../ui/3d-card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageSquareText } from "lucide-react";
import { Badge } from "../ui/badge";

type CardEffectProps = {
  game: {
    id: string;
    title: string;
    description: string;
    thumbnail: string;
    created_at: string;
    user: {
      id: string;
      nickname: string;
      avatar: string;
    };
    comments: {
      count: number;
    }[];
    likes: {
      count: number;
    }[];
    category: {
      name: string;
    };
  };
};

export function CardEffect({ game }: CardEffectProps) {
  const comments = game.comments?.[0]?.count || 0;
  const likes = game.likes?.[0]?.count || 0;
  return (
    <CardContainer className="inter-var w-full font-maru">
      <CardBody className="flex flex-col bg-gray-50 h-fit md:h-[600px] relative group/card  dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-full rounded-xl p-4 border">
        <CardItem
          as="div"
          translateZ="60"
          className="text-neutral-500 text-sm w-full mt-2 dark:text-neutral-300"
        >
          <Alert className="flex flex-row space-x-4 bg-transparent mt-2 p-2 border-0">
            <Link href={`/developers/${game.user.id}`}>
              <Avatar className="h-10 w-10">
                <AvatarImage src={game.user.avatar} />
                <AvatarFallback>
                  {game.user.nickname?.substring(0, 1) || "無"}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex flex-col">
              <Link href={`/developers/${game.user.id}`}>
                <AlertTitle className="text-md mb-0">
                  {game.user && `${game.user.nickname}`}
                </AlertTitle>{" "}
              </Link>
              <AlertDescription className="text-[10px]">
                登録日：{" "}
                {new Date(game.created_at).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })}
              </AlertDescription>
            </div>
          </Alert>
        </CardItem>
        <CardItem translateZ="100" className="w-full mt-4">
          <Image
            src={game.thumbnail}
            height="1000"
            width="1000"
            className="h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl"
            alt="thumbnail"
          />
        </CardItem>
        <CardItem
          translateZ="80"
          className="text-xl font-bold text-neutral-600 dark:text-white mt-4 text-center w-full"
        >
          {game.title.length > 30
            ? `${game.title.substring(0, 30)}...`
            : game.title}
        </CardItem>
        <CardItem
          translateZ="80"
          className="text-xs font-bold text-neutral-600 dark:text-white mt-4 text-center w-full mb-4"
        >
          <Badge>{game.category?.name || "ノンカテゴリー"}</Badge>
        </CardItem>
        <CardItem
          as="p"
          translateZ="60"
          className="text-neutral-500 text-sm w-full mt-2 dark:text-neutral-300"
        >
          {game.description.length > 100
            ? `${game.description.substring(0, 100)}...`
            : game.description}
        </CardItem>
        <div className="flex justify-between items-end flex-auto mt-4">
          <Link href={`/games/${game.id}`}>
            <CardItem
              translateZ={20}
              as="button"
              className="px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold"
            >
              詳細を見る
            </CardItem>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <MessageSquareText />
              {comments}
            </div>
            <div>❤️ {likes}</div>
          </div>
        </div>
      </CardBody>
    </CardContainer>
  );
}

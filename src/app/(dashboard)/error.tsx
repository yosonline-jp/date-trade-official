"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const ErrorPage = () => {
  return (
    <section className="flex h-screen items-center">
      <div className="container mx-auto flex flex-col items-center justify-center px-5">
        <div className="font-dot max-w-md text-center">
          <p className="text-xl font-semibold md:text-3xl">
            申し訳ありません
            <br />
            エラーが発生しました
          </p>
          <p className="mb-8 mt-4 text-sm">
            しばらくしてから再度お試しください。
          </p>
          <Link
            rel="noopener noreferrer"
            href="/dashboard"
            replace
            className="rounded px-8 py-3"
          >
            <Button className="font-extrabold">ダッシュボードへ</Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default ErrorPage;

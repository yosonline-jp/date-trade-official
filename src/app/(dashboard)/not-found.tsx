import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="flex h-full items-center p-16">
      <div className="container mx-auto my-8 flex flex-col items-center justify-center px-5">
        <div className="max-w-md text-center">
          <h2 className="mb-8 text-9xl font-extrabold">
            <span className="sr-only">Error</span>404
          </h2>
          <p className="text-2xl font-semibold md:text-3xl">
            ご指定のページが見つかりませんでした。
          </p>
          <p className="mb-8 mt-4">
            アクセスしようとしたページは削除されたか、URLが変更されています。
            お手数ですが、以下のボタンからダッシュボードに戻ってください。
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
}

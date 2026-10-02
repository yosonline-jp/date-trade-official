"use client";

import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export type Message =
  | { success: string }
  | { error: string }
  | { message: string }
  | { redirect: string };

export function FormMessage({ message }: { message: Message }) {
  const router = useRouter();
  useEffect(() => {
    if ("message" in message) {
      toast({
        title: message.message,
      });
      router.replace(window.location.pathname);
    }
  }, [message, router]);

  return (
    <div className="flex flex-col gap-2 w-full max-w-md text-sm">
      {"success" in message && (
        <div className="text-foreground border-l-2 border-foreground px-4">
          <p className="mb-2">{message.success}</p>
          <Link href="/sign-in" className="text-foreground underline">
            ログインする
          </Link>
        </div>
      )}
      {"error" in message && (
        <div className="text-destructive border-l-2 border-destructive px-4">
          {message.error}
        </div>
      )}
      {/* {"message" in message && (
        <div className="text-foreground border-l-2 px-4">{message.message}</div>
      )} */}
    </div>
  );
}

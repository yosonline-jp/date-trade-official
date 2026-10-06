"use client";

import type { Provider } from "@supabase/supabase-js";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { MAIN_DOMAIN } from "@/lib/utils";

import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";
import { safeRedirectPath, signInUrl } from "@/lib/auth/redirect";

const AuthSignin = ({
  provider,
  text,
  redirectTo,
}: {
  provider: Provider;
  text: string;
  redirectTo?: string;
}) => {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const signIn = async () => {
    if (pending) return;
    setPending(true);
    try {
      const origin = MAIN_DOMAIN
        ? new URL(
            MAIN_DOMAIN.startsWith("http")
              ? MAIN_DOMAIN
              : `https://${MAIN_DOMAIN}`,
          ).origin
        : window.location.origin;
      const callback = new URL("/auth/callback", origin);
      if (redirectTo)
        callback.searchParams.set("redirect_to", safeRedirectPath(redirectTo));
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callback.toString(),
        },
      });
      if (error)
        router.push(
          signInUrl(
            redirectTo,
            "認証を開始できませんでした。時間をおいて再度お試しください。",
          ),
        );
    } catch {
      router.push(
        signInUrl(
          redirectTo,
          "通信に失敗しました。時間をおいて再度お試しください。",
        ),
      );
    } finally {
      setPending(false);
    }
  };

  const iconProvider =
    provider === "google"
      ? "/google.svg"
      : provider === "github"
        ? "/github.svg"
        : "/twitter.svg";

  return (
    <Button
      onClick={signIn}
      className="mt-2 flex items-center space-x-3 font-extrabold"
      variant="outline"
      type="button"
      disabled={pending}
    >
      <Image
        src={iconProvider}
        alt=""
        width={25}
        height={25}
        loading="lazy"
        className={clsx(provider !== "google" && "dark:invert")}
      />
      <p>{text}</p>
    </Button>
  );
};

export default AuthSignin;

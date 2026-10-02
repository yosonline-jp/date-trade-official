"use client";

import type { Provider } from "@supabase/supabase-js";
import Image from "next/image";
import { redirect } from "next/navigation";

import { MAIN_DOMAIN } from "@/lib/utils";

import { Button } from "./ui/button";
import { createClient } from "@/utils/supabase/client";
import clsx from "clsx";

const AuthSignin = ({
  provider,
  text,
  next = "",
}: {
  provider: Provider;
  text: string;
  next?: string;
}) => {
  // eslint-disable-next-line consistent-return
  const signIn = async () => {
    console.log(`${MAIN_DOMAIN}/auth/callback${next}`);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${MAIN_DOMAIN}/auth/callback${next}`,
      },
    });
    if (error) {
      return redirect(`/sign-in?message=${error.message}`);
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
    >
      <Image
        src={iconProvider}
        alt="GODOT GAMES - SIGNUP LOGO"
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

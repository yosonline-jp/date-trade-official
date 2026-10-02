"use client";

import { withCn } from "@udecode/cn";

import { Toolbar } from "./toolbar";

// top-[64px]
export const FixedToolbar = withCn(
  Toolbar,
  "supports-backdrop-blur:bg-background/60 sticky top-[-40px] left-0 z-50 w-full rounded-t-lg border-b border-b-border bg-background/95 p-1 backdrop-blur scrollbar-hide border"
);

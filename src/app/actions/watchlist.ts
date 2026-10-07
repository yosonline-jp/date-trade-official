"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  WatchlistMutationResult,
  WatchlistStatus,
} from "@/lib/watchlist-action-types";

const INPUT_ERROR = "銘柄コード・銘柄名を確認してください。";
const AUTH_ERROR =
  "認証状態を確認できませんでした。時間をおいて再度お試しください。";
const CHECK_ERROR =
  "ウォッチリストの状態を確認できませんでした。時間をおいて再度お試しください。";
const ADD_ERROR =
  "ウォッチリストに追加できませんでした。時間をおいて再度お試しください。";
const REMOVE_ERROR =
  "ウォッチリストから削除できませんでした。時間をおいて再度お試しください。";

function normalizeCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return /^[0-9A-Z]{4,5}$/.test(code) ? code : null;
}

function normalizeStock(value: unknown): { code: string; name: string } | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value))
      return null;
    const stock = value as Record<string, unknown>;
    const code = normalizeCode(stock.code);
    if (!code || typeof stock.name !== "string") return null;
    const name = stock.name.trim();
    return name && name.length <= 200 ? { code, name } : null;
  } catch {
    return null;
  }
}

async function verifiedClient() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || typeof data.user?.id !== "string" || !data.user.id.trim())
      return { status: "auth-required" as const };
    return {
      status: "ready" as const,
      supabase,
      userId: data.user.id,
    };
  } catch {
    return { status: "error" as const, message: AUTH_ERROR };
  }
}

function refreshWatchlist(code: string) {
  for (const path of [
    "/watchlist",
    "/dashboard/watchlist",
    `/stocks/${code}`,
    `/stocks/${code}/trades`,
    `/dashboard/stocks/${code}`,
  ])
    revalidatePath(path);
}

export async function addToWatchlist(
  input: unknown,
): Promise<WatchlistMutationResult> {
  const stock = normalizeStock(input);
  if (!stock) return { status: "error", message: INPUT_ERROR };
  const auth = await verifiedClient();
  if (auth.status !== "ready") return auth;
  try {
    const { error } = await auth.supabase.from("watchlist").insert({
      user_id: auth.userId,
      stock_code: stock.code,
      stock_name: stock.name,
    });
    if (error) {
      if (error.code !== "23505")
        return { status: "error", message: ADD_ERROR };
      // Do not assume a unique constraint's fields. Confirm the desired state
      // belongs to this verified viewer before accepting a duplicate as success.
      const existing = await auth.supabase
        .from("watchlist")
        .select("id")
        .eq("user_id", auth.userId)
        .eq("stock_code", stock.code)
        .limit(1)
        .maybeSingle();
      if (existing.error || !existing.data)
        return { status: "error", message: ADD_ERROR };
    }
    refreshWatchlist(stock.code);
    return { status: "success", isWatching: true };
  } catch {
    return { status: "error", message: ADD_ERROR };
  }
}

export async function removeFromWatchlist(
  input: unknown,
): Promise<WatchlistMutationResult> {
  const code = normalizeCode(input);
  if (!code) return { status: "error", message: INPUT_ERROR };
  const auth = await verifiedClient();
  if (auth.status !== "ready") return auth;
  try {
    const { error } = await auth.supabase
      .from("watchlist")
      .delete()
      .eq("user_id", auth.userId)
      .eq("stock_code", code);
    if (error) return { status: "error", message: REMOVE_ERROR };
    refreshWatchlist(code);
    return { status: "success", isWatching: false };
  } catch {
    return { status: "error", message: REMOVE_ERROR };
  }
}

export async function checkWatchlist(input: unknown): Promise<WatchlistStatus> {
  const code = normalizeCode(input);
  if (!code) return { status: "error", message: INPUT_ERROR };
  const auth = await verifiedClient();
  if (auth.status !== "ready") return auth;
  try {
    const { data, error } = await auth.supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", auth.userId)
      .eq("stock_code", code)
      .limit(1)
      .maybeSingle();
    if (error) return { status: "error", message: CHECK_ERROR };
    return { status: "ready", isWatching: !!data };
  } catch {
    return { status: "error", message: CHECK_ERROR };
  }
}

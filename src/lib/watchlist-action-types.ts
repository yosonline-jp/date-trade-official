export type WatchlistStatus =
  | { status: "ready"; isWatching: boolean }
  | { status: "auth-required" }
  | { status: "error"; message: string };

export type WatchlistMutationResult =
  | { status: "success"; isWatching: boolean }
  | { status: "auth-required" }
  | { status: "error"; message: string };

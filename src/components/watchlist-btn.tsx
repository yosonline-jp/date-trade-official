"use client";

import { usePathname } from "next/navigation";
import {
  addToWatchlist,
  removeFromWatchlist,
  checkWatchlist,
} from "@/app/actions/watchlist";
import WatchlistControl from "./watchlist-control";

export default function WatchlistButton({
  stockCode,
  stockName,
}: {
  stockCode: string;
  stockName: string;
}) {
  const pathname = usePathname();
  return (
    <WatchlistControl
      key={stockCode}
      stockCode={stockCode}
      stockName={stockName}
      returnTo={pathname || "/stocks/" + stockCode}
      checkAction={checkWatchlist}
      addAction={addToWatchlist}
      removeAction={removeFromWatchlist}
    />
  );
}

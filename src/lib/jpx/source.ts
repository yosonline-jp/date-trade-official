import "server-only";
import { JPX_PORTAL_URL, parseJpxActions } from "./parse";

const ORIGIN = "https://clientportal.jpx.co.jp";

export async function fetchCurrentJpxStocks() {
  const page = await fetch(JPX_PORTAL_URL, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!page.ok) throw new Error("JPXデータポータルに接続できませんでした。");
  const html = await page.text();
  let config: { fwuid?: string; loaded?: Record<string, string> } | undefined;
  for (const match of html.matchAll(
    /\/ClientPortal\/s\/sfsites\/l\/([^"']+?)\/app\.js/g,
  )) {
    try {
      const candidate = JSON.parse(decodeURIComponent(match[1]));
      if (candidate.loaded) {
        config = candidate;
        break;
      }
    } catch {
      /* Try the next script URL. */
    }
  }
  if (!config?.loaded)
    throw new Error("JPXデータポータルの設定を読み取れませんでした。");
  const pageUri =
    new URL(JPX_PORTAL_URL).pathname + new URL(JPX_PORTAL_URL).search;
  const message = {
    actions: [
      {
        id: "1;a",
        descriptor: "apex://IssueSearch/ACTION$getUpdateDate",
        callingDescriptor: "markup://c:IssueCsvButton",
        params: {},
        version: null,
      },
      {
        id: "2;a",
        descriptor: "apex://IssueSearch/ACTION$getIssuesSearch",
        callingDescriptor: "markup://c:IssueCsvButton",
        params: {
          language: "日本語",
          domesticForeign: [],
          productClassification: [],
          marketSection: [],
          isDelisted: true,
        },
        version: null,
      },
    ],
  };
  const body = new URLSearchParams({
    message: JSON.stringify(message),
    "aura.context": JSON.stringify({
      mode: "PROD",
      fwuid: config.fwuid,
      app: "siteforce:communityApp",
      loaded: config.loaded,
      dn: [],
      globals: {},
      uad: true,
    }),
    "aura.pageURI": pageUri,
    "aura.token": "null",
  });
  const response = await fetch(
    `${ORIGIN}/ClientPortal/s/sfsites/aura?r=1&other.IssueSearch.getIssuesSearch=1&other.IssueSearch.getUpdateDate=1`,
    {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        Origin: ORIGIN,
        Referer: JPX_PORTAL_URL,
        "User-Agent": "Mozilla/5.0",
      },
    },
  );
  if (!response.ok) throw new Error("JPXの全件一覧を取得できませんでした。");
  const text = await response.text();
  if (text.length > 6_000_000) throw new Error("JPXの応答サイズが想定外です。");
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("JPXの応答を読み取れませんでした。");
  }
  return parseJpxActions(payload);
}

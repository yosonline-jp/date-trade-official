import "server-only";
import {
  NIKKEI_SOURCE_URL,
  NIKKEI_WEIGHT_CSV_URL,
  parseNikkeiPage,
  validateAgainstOfficialCsv,
  type NikkeiSource,
} from "./parse";

const VIA = `https://r.jina.ai/${NIKKEI_SOURCE_URL}`;

export async function fetchCurrentNikkei225(): Promise<NikkeiSource> {
  const [pageResponse, csvResponse] = await Promise.all([
    fetch(VIA, {
      cache: "no-store",
      headers: { "X-No-Cache": "true" },
      signal: AbortSignal.timeout(15_000),
    }),
    fetch(NIKKEI_WEIGHT_CSV_URL, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    }),
  ]);
  if (!pageResponse.ok || !csvResponse.ok)
    throw new Error(
      "日経の公式データを取得できませんでした。後でもう一度お試しください。",
    );
  const markdown = await pageResponse.text();
  const csvBytes = await csvResponse.arrayBuffer();
  if (markdown.length > 1_000_000 || csvBytes.byteLength > 200_000)
    throw new Error("取得した公式データのサイズが想定外です。");
  const csv = new TextDecoder("shift_jis", { fatal: true }).decode(csvBytes);
  return validateAgainstOfficialCsv(csv, parseNikkeiPage(markdown));
}

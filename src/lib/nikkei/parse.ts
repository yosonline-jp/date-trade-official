export const NIKKEI_SOURCE_URL =
  "https://indexes.nikkei.co.jp/nkave/index/component?idx=nk225";
export const NIKKEI_WEIGHT_CSV_URL =
  "https://indexes.nikkei.co.jp/nkave/archives/file/nikkei_stock_average_weight_jp.csv";

export type NikkeiComponent = {
  code: string;
  name: string;
  companyName: string;
  sector: string;
};
export type NikkeiSource = {
  sourceDate: string;
  crossCheckDate: string;
  components: NikkeiComponent[];
};

export function parseNikkeiPage(markdown: string): {
  sourceDate: string;
  components: NikkeiComponent[];
} {
  if (
    !markdown.includes(`URL Source: ${NIKKEI_SOURCE_URL}`) ||
    !markdown.includes("構成銘柄：日経平均株価")
  ) {
    throw new Error("日経225の公式一覧を確認できませんでした。");
  }
  const date = markdown.match(/更新日付[：:]\s*(\d{4})\.(\d{2})\.(\d{2})/);
  if (!date) throw new Error("公式一覧の更新日を確認できませんでした。");
  const sourceDate = `${date[1]}-${date[2]}-${date[3]}`;
  const ageDays =
    (Date.now() - Date.parse(`${sourceDate}T00:00:00+09:00`)) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < -1 || ageDays > 14) {
    throw new Error(
      "公式一覧の更新日が古い、または不正です。同期を中止しました。",
    );
  }
  const components: NikkeiComponent[] = [];
  let sector = "";
  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) sector = heading[1].trim();
    const row = line.match(
      /^\|\s*([0-9]{4}|[0-9]{3}[A-Z])\s*\|\s*\[([^\]]+)\]\(https:\/\/www\.nikkei\.com\/nkd\/company\/\?scode=([0-9]{4}|[0-9]{3}[A-Z])\)\s*\|\s*([^|]+)\s*\|/,
    );
    if (row) {
      if (row[1] !== row[3] || !sector)
        throw new Error("公式一覧の銘柄コードまたは業種が不正です。");
      components.push({
        code: row[1],
        name: row[2].trim(),
        companyName: row[4].trim(),
        sector,
      });
    }
  }
  if (
    components.length !== 225 ||
    new Set(components.map((c) => c.code)).size !== 225
  ) {
    throw new Error(
      `公式一覧が225件ではありません（${components.length}件）。同期を中止しました。`,
    );
  }
  return { sourceDate, components };
}

export function validateAgainstOfficialCsv(
  csv: string,
  current: ReturnType<typeof parseNikkeiPage>,
): NikkeiSource {
  const rows = csv
    .split(/\r?\n/)
    .map((line) =>
      line.match(/^"(\d{4}\/\d{2}\/\d{2})","([0-9]{4}|[0-9]{3}[A-Z])",/),
    )
    .filter((row): row is RegExpMatchArray => row !== null);
  const codes = new Set(rows.map((row) => row[2]));
  const crossCheckDate = rows[0]?.[1].replaceAll("/", "-");
  if (
    rows.length !== 225 ||
    codes.size !== 225 ||
    !crossCheckDate ||
    current.sourceDate < crossCheckDate ||
    current.components.filter((item) => codes.has(item.code)).length < 215
  ) {
    throw new Error(
      "日経の公式CSVと構成銘柄一覧が整合しません。同期を中止しました。",
    );
  }
  return { ...current, crossCheckDate };
}

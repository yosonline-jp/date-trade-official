import { expect, test } from "@playwright/test";
import { getPagination } from "../src/lib/pagination";

test("empty and six-item boundaries use valid slice bounds and display ranges", () => {
  expect(getPagination(0, 20, 6)).toEqual({
    page: 1,
    pageCount: 1,
    startIndex: 0,
    endIndex: 0,
    from: 0,
    to: 0,
    pages: [1],
  });
  expect(getPagination(6, 1, 6)).toEqual({
    page: 1,
    pageCount: 1,
    startIndex: 0,
    endIndex: 6,
    from: 1,
    to: 6,
    pages: [1],
  });
  expect(getPagination(7, 1, 6)).toMatchObject({
    page: 1,
    pageCount: 2,
    startIndex: 0,
    endIndex: 6,
    from: 1,
    to: 6,
    pages: [1, 2],
  });
  expect(getPagination(7, 2, 6)).toMatchObject({
    page: 2,
    pageCount: 2,
    startIndex: 6,
    endIndex: 7,
    from: 7,
    to: 7,
  });
});

test("thirteen records retain order and occur exactly once across three pages", () => {
  const records = Array.from({ length: 13 }, (_, index) => ({
    id: 13 - index,
  }));
  const original = structuredClone(records);
  const bounds = [1, 2, 3].map((page) =>
    getPagination(records.length, page, 6),
  );
  expect(bounds.map(({ from, to }) => [from, to])).toEqual([
    [1, 6],
    [7, 12],
    [13, 13],
  ]);
  const chunks = bounds.map(({ startIndex, endIndex }) =>
    records.slice(startIndex, endIndex),
  );
  expect(chunks.map((chunk) => chunk.length)).toEqual([6, 6, 1]);
  expect(chunks.flat()).toEqual(original);
  expect(records).toEqual(original);
});

test("page requests clamp to available records after count changes", () => {
  for (const page of [0, -3, -2.5, NaN, Infinity, -Infinity]) {
    expect(getPagination(13, page, 6).page).toBe(1);
  }
  expect(getPagination(13, 2.9, 6).page).toBe(2);
  expect(getPagination(13, 9999, 6).page).toBe(3);
  expect(getPagination(6, 3, 6)).toMatchObject({
    page: 1,
    pageCount: 1,
    startIndex: 0,
    endIndex: 6,
  });
  expect(getPagination(7, 3, 6)).toMatchObject({
    page: 2,
    startIndex: 6,
    endIndex: 7,
  });
});

test("number controls remain bounded and include the current page at every boundary", () => {
  expect(getPagination(30, 3, 6).pages).toEqual([1, 2, 3, 4, 5]);
  expect(getPagination(36, 3, 6).pages).toEqual([1, 2, 3, "ellipsis", 6]);
  expect(getPagination(36, 4, 6).pages).toEqual([1, "ellipsis", 4, 5, 6]);
  expect(getPagination(42, 4, 6).pages).toEqual([
    1,
    "ellipsis",
    4,
    "ellipsis",
    7,
  ]);
  expect(getPagination(60, 1, 6).pages).toEqual([1, 2, 3, "ellipsis", 10]);
  expect(getPagination(60, 10, 6).pages).toEqual([1, "ellipsis", 8, 9, 10]);
  for (const pageCount of [1, 2, 5, 6, 7, 8, 10, 100]) {
    for (let page = 1; page <= pageCount; page++) {
      const result = getPagination(pageCount * 6, page, 6);
      const numbers = result.pages.filter(
        (value): value is number => typeof value === "number",
      );
      expect(result.pages.length).toBeLessThanOrEqual(5);
      expect(numbers).toContain(page);
      expect(numbers[0]).toBe(1);
      expect(numbers.at(-1)).toBe(pageCount);
      expect(new Set(numbers).size).toBe(numbers.length);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    }
  }
});

test("very large totals do not allocate controls for every page", () => {
  const total = Number.MAX_SAFE_INTEGER;
  const last = getPagination(total, Number.MAX_VALUE, 6);
  const pageCount = Math.ceil(total / 6);
  expect(last).toEqual({
    page: pageCount,
    pageCount,
    startIndex: total - 1,
    endIndex: total,
    from: total,
    to: total,
    pages: [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount],
  });
  const middle = getPagination(total, 1000000000, 6);
  expect(middle.pages).toEqual([
    1,
    "ellipsis",
    1000000000,
    "ellipsis",
    pageCount,
  ]);
  expect(middle.startIndex).toBe(5999999994);
  expect(middle.endIndex).toBe(6000000000);
});

test("invalid sizes fail explicitly while invalid totals remain empty", () => {
  for (const size of [0, -1, 1.5, NaN, Infinity, -Infinity]) {
    expect(() => getPagination(13, 1, size)).toThrow(
      "pageSize must be a positive integer",
    );
  }
  for (const total of [-1, NaN, Infinity, -Infinity]) {
    expect(getPagination(total, 1, 6)).toMatchObject({
      page: 1,
      pageCount: 1,
      startIndex: 0,
      endIndex: 0,
      from: 0,
      to: 0,
      pages: [1],
    });
  }
});

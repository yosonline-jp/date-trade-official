export type PaginationToken = number | "ellipsis";
export type Pagination = {
  page: number;
  pageCount: number;
  startIndex: number;
  endIndex: number;
  from: number;
  to: number;
  pages: PaginationToken[];
};

/**
 * Slice bounds and one-based display ranges share the same clamped page.
 * Non-finite page requests start at page 1. Invalid/negative totals are empty.
 * The page controls contain at most five tokens, even for very large totals.
 */
export function getPagination(
  total: number,
  requestedPage: number,
  pageSize: number,
): Pagination {
  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    throw new RangeError("pageSize must be a positive integer");
  }
  const count = Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0;
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const request = Number.isFinite(requestedPage)
    ? Math.trunc(requestedPage)
    : 1;
  const page = Math.max(1, Math.min(request, pageCount));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, count);
  let pages: PaginationToken[];
  if (pageCount <= 5) {
    pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  } else if (page <= 3) {
    pages = [1, 2, 3, "ellipsis", pageCount];
  } else if (page >= pageCount - 2) {
    pages = [1, "ellipsis", pageCount - 2, pageCount - 1, pageCount];
  } else {
    pages = [1, "ellipsis", page, "ellipsis", pageCount];
  }
  return {
    page,
    pageCount,
    startIndex,
    endIndex,
    from: count ? startIndex + 1 : 0,
    to: endIndex,
    pages,
  };
}

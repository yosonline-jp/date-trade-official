const LOCAL_ORIGIN = "https://daytrade.invalid";

/** Only accept local paths, including an optional query or fragment. */
export function safeRedirectPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/dashboard";

  try {
    const url = new URL(value, LOCAL_ORIGIN);
    const decodedPath = decodeURIComponent(url.pathname);
    if (
      url.origin !== LOCAL_ORIGIN ||
      decodedPath.startsWith("//") ||
      /[\\\u0000-\u001f\u007f]/.test(decodedPath)
    )
      return "/dashboard";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/dashboard";
  }
}

export function signInUrl(redirectTo: unknown, error?: string): string {
  const query = new URLSearchParams({
    redirect_to: safeRedirectPath(redirectTo),
  });
  if (error) query.set("error", error);
  return `/sign-in?${query.toString()}`;
}

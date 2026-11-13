// Client-side error reporting to this app's own endpoint. Reports land in the server logs
// (Vercel → Logs, search "cookmatch_error"), so no third-party service or key is needed.

export type ClientErrorReport = {
  kind: "error" | "unhandledrejection" | "boundary";
  message: string;
  stack?: string;
  path: string;
};

const MAX_REPORTS_PER_PAGE = 5;
const seen = new Set<string>();

export function buildReport(
  kind: ClientErrorReport["kind"],
  error: unknown,
  path: string,
): ClientErrorReport {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : String(error ?? "Unknown error");
  const stack = error instanceof Error && error.stack ? error.stack.slice(0, 2000) : undefined;
  // Path only: query strings can carry tokens (for example auth callbacks).
  return {
    kind,
    message: message.slice(0, 500),
    ...(stack ? { stack } : {}),
    path: path.split(/[?#]/)[0].slice(0, 300),
  };
}

export function reportClientError(kind: ClientErrorReport["kind"], error: unknown) {
  try {
    const report = buildReport(kind, error, window.location.pathname);
    if (seen.has(report.message) || seen.size >= MAX_REPORTS_PER_PAGE) return;
    seen.add(report.message);
    const body = JSON.stringify(report);
    if (!navigator.sendBeacon?.("/api/v1/client-errors", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/v1/client-errors", {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Reporting must never break the page.
  }
}

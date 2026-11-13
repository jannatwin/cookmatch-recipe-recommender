import type { Instrumentation } from "next";

// Server errors (rendering, route handlers, proxy) as one structured log line each.
// On Vercel these appear under Logs; search for "cookmatch_error".
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest =
    typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  console.error(
    JSON.stringify({
      event: "cookmatch_error",
      source: "server",
      message:
        error instanceof Error
          ? `${error.name}: ${error.message}`.slice(0, 500)
          : String(error).slice(0, 500),
      digest,
      method: request.method,
      path: request.path.split("?")[0], // query strings can carry tokens
      route: context.routePath,
      routeType: context.routeType,
    }),
  );
};

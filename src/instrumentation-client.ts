import { reportClientError } from "@/lib/report-error";

// Runs before the app becomes interactive: report uncaught browser errors to the server log.
window.addEventListener("error", (event) => reportClientError("error", event.error ?? event.message));
window.addEventListener("unhandledrejection", (event) =>
  reportClientError("unhandledrejection", event.reason),
);

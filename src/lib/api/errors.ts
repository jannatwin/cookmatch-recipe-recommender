export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Array<{ field: string; issue: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  console.error("Unhandled API error", error instanceof Error ? error.name : "unknown");
  return Response.json(
    { error: { code: "SERVER_ERROR", message: "An unexpected error occurred" } },
    { status: 500 },
  );
}

export function validationError(details: Array<{ field: string; issue: string }>) {
  return new ApiError(400, "VALIDATION_ERROR", "The request contains invalid fields", details);
}

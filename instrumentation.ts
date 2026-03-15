export async function register() {
  // Capture unhandled server-side errors for Vercel diagnostics
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    process.on('unhandledRejection', (reason) => {
      console.error('[instrumentation] Unhandled rejection:', reason);
    });
  }
}

export function onRequestError(
  err: unknown,
  request: { path: string },
  context: { routeType: string }
) {
  console.error('[instrumentation] Request error:', {
    path: request.path,
    routeType: context.routeType,
    error: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
}

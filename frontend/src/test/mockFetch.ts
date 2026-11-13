import { vi } from "vitest";

export interface RouteResponse {
  status?: number;
  body: unknown;
}

export type RouteHandler = (
  url: URL,
  init?: RequestInit,
) => RouteResponse | Promise<RouteResponse>;

export type Routes = Record<string, RouteHandler | RouteResponse>;

/**
 * Install a URL-routed `fetch` stub.
 *
 * Keys are `"METHOD /path"` (e.g. `"GET /api/health"`). Exact path matches
 * win; otherwise the longest registered prefix of the path matches, so
 * `"GET /api/predictions"` also serves `/api/predictions?page=2`.
 */
export function installFetch(routes: Routes) {
  const entries = Object.entries(routes);

  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(String(input), "http://localhost");
      const method = (init?.method ?? "GET").toUpperCase();

      const candidates = entries.filter(([key]) => {
        const [keyMethod, keyPath] = key.split(" ");
        return keyMethod === method && url.pathname.startsWith(keyPath);
      });
      candidates.sort(
        (a, b) => b[0].split(" ")[1].length - a[0].split(" ")[1].length,
      );

      const match = candidates[0];
      if (!match) {
        return new Response(
          JSON.stringify({ detail: `No mock for ${method} ${url.pathname}` }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      const handler = match[1];
      const response =
        typeof handler === "function" ? await handler(url, init) : handler;

      return new Response(JSON.stringify(response.body), {
        status: response.status ?? 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  );

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** Count calls whose method + path contain the given fragments. */
export function countCalls(
  fetchMock: ReturnType<typeof installFetch>,
  method: string,
  pathFragment: string,
): number {
  return fetchMock.mock.calls.filter((call) => {
    const init = (call[1] ?? {}) as RequestInit;
    const callMethod = (init.method ?? "GET").toUpperCase();
    return callMethod === method && String(call[0]).includes(pathFragment);
  }).length;
}

/** Last call body parsed as JSON (for POST assertions). */
export function lastPostBody<T>(
  fetchMock: ReturnType<typeof installFetch>,
  pathFragment: string,
): T | null {
  const calls = fetchMock.mock.calls.filter((call) => {
    const init = (call[1] ?? {}) as RequestInit;
    return (
      (init.method ?? "GET").toUpperCase() === "POST" &&
      String(call[0]).includes(pathFragment)
    );
  });
  const last = calls.at(-1);
  if (!last) return null;
  const init = (last[1] ?? {}) as RequestInit;
  return init.body ? (JSON.parse(String(init.body)) as T) : null;
}

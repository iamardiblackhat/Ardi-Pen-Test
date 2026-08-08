import {
  OpenCtiError,
  SUPPORTED_OPENCTI_MAJOR,
  type GraphQLError,
} from "./types";

export interface OpenCtiClientOptions {
  /** Base URL of the OpenCTI platform, e.g. https://cti.example.com */
  url: string;
  /** API token from OpenCTI → Profile → API access. */
  token: string;
  /** Per-request timeout. OpenCTI relationship traversals can be slow. */
  timeoutMs?: number;
  /** Retries for transport errors and 5xx. GraphQL errors are never retried. */
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * Minimal, dependency-free GraphQL client for OpenCTI.
 *
 * Deliberately not a generic GraphQL library: we issue a fixed set of
 * server-defined queries (see `queries.ts`), never interpolate caller input
 * into query strings, and always pass user-supplied values as variables.
 * That last point is the security property that matters — CVE IDs and
 * technique IDs reaching this client originate in scanner output, which is
 * attacker-influenceable.
 */
export class OpenCtiClient {
  readonly #endpoint: string;
  readonly #token: string;
  readonly #timeoutMs: number;
  readonly #maxRetries: number;
  readonly #fetch: typeof fetch;

  constructor(options: OpenCtiClientOptions) {
    const trimmed = options.url.replace(/\/+$/, "");
    if (!/^https?:\/\//.test(trimmed)) {
      throw new OpenCtiError(
        `OPENCTI_URL must be an absolute http(s) URL, received: ${options.url}`,
      );
    }
    if (!options.token) {
      throw new OpenCtiError("OPENCTI_TOKEN is required but was empty.");
    }

    this.#endpoint = `${trimmed}/graphql`;
    this.#token = options.token;
    this.#timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.#maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.#fetch = options.fetchImpl ?? globalThis.fetch;
  }

  async request<T>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.#timeoutMs);

      try {
        const response = await this.#fetch(this.#endpoint, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${this.#token}`,
          },
          body: JSON.stringify({ query, variables }),
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          // Never retry auth failures — the token is wrong, not the network.
          throw new OpenCtiError(
            "OpenCTI rejected the API token. Check OPENCTI_TOKEN and that the " +
              "associated user has read access to the requested entities.",
            { status: response.status },
          );
        }

        if (response.status >= 500) {
          lastError = new OpenCtiError(
            `OpenCTI returned ${response.status} ${response.statusText}`,
            { status: response.status },
          );
          continue;
        }

        if (!response.ok) {
          throw new OpenCtiError(
            `OpenCTI returned ${response.status} ${response.statusText}`,
            { status: response.status },
          );
        }

        const body = (await response.json()) as GraphQLResponse<T>;

        if (body.errors?.length) {
          throw new OpenCtiError(
            `OpenCTI GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`,
            { status: response.status, errors: body.errors },
          );
        }

        if (body.data === undefined) {
          throw new OpenCtiError(
            "OpenCTI returned a response with neither data nor errors.",
            { status: response.status },
          );
        }

        return body.data;
      } catch (error) {
        // Auth and GraphQL errors are terminal; transport errors are retried.
        if (error instanceof OpenCtiError && error.errors.length > 0) throw error;
        if (error instanceof OpenCtiError && error.status !== null && error.status < 500) {
          throw error;
        }
        lastError = error;
      } finally {
        clearTimeout(timer);
      }

      if (attempt < this.#maxRetries) {
        await sleep(2 ** attempt * 250);
      }
    }

    throw new OpenCtiError(
      `OpenCTI request failed after ${this.#maxRetries + 1} attempts.`,
      { cause: lastError },
    );
  }

  /**
   * Verify connectivity, token validity, and server major version in one call.
   * Run this at startup so a misconfigured OpenCTI surfaces as a clear boot
   * error rather than as silently-empty threat context on every finding.
   */
  async healthCheck(): Promise<{ version: string; supported: boolean }> {
    const data = await this.request<{ about: { version: string } }>(
      `query ArdiHealth { about { version } }`,
    );

    const version = data.about.version;
    const major = Number.parseInt(version.split(".")[0] ?? "", 10);

    return {
      version,
      supported: Number.isFinite(major) && major === SUPPORTED_OPENCTI_MAJOR,
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

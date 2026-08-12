import { API_BASE_URL } from '../config/api';
import { notifyUnauthorized } from './authBridge';

/**
 * A failed API call. `list` carries Laravel's `errors` bag (field -> messages)
 * when the failure was a 422; it is absent for transport failures and for
 * statuses that have no per-field detail.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly list?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    list?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.list = list;
  }
}

type Query = Record<string, string | string[] | null | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token: string | null;
  /** Sent as JSON. Mutually exclusive with `form`. */
  json?: unknown;
  /** Sent as multipart; Content-Type is left to the browser so it can add the boundary. */
  form?: FormData;
  query?: Query;
  /** Aborts the request; the rejection is a DOMException, not an `ApiError`. */
  signal?: AbortSignal;
}

const buildUrl = (path: string, query?: Query): string => {
  const url = new URL(`${API_BASE_URL}/${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((entry) => url.searchParams.append(`${key}[]`, entry));
    } else if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  }

  return url.toString();
};

/**
 * Laravel wraps `JsonResource` payloads in a `data` key, and paginated
 * collections add `links`/`meta` beside it. Callers want the payload, so peel
 * one `data` level when present and pass anything else through untouched.
 */
const unwrap = <T>(payload: unknown): T => {
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    // Unchecked by necessity: T is the caller's declared shape, so there is
    // nothing to validate it against here. The envelope key is the contract.
    const envelope = payload as { data: T };

    return envelope.data;
  }

  // Same: an unwrapped body is already T by the caller's declaration.
  const bare = payload as T;

  return bare;
};

const readMessage = (detail: object, status: number): string => {
  if ('message' in detail && typeof detail.message === 'string') {
    return detail.message;
  }

  return `Request failed with status ${status}`;
};

const readErrorBag = (detail: object): Record<string, string[]> | undefined => {
  if (
    !('errors' in detail) ||
    detail.errors === null ||
    typeof detail.errors !== 'object'
  ) {
    return undefined;
  }

  // Laravel's 422 body is `{message, errors: {field: [messages]}}`. The inner
  // shape is the framework's contract, not something we can narrow further
  // without walking every key.
  const bag = detail.errors as Record<string, string[]>;

  return bag;
};

/**
 * The transport. Both readers below share it: the difference between them is
 * only how much of a successful envelope they keep.
 */
const send = async (
  path: string,
  { method = 'GET', token, json, form, query, signal }: RequestOptions
): Promise<unknown> => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (json !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: form ?? (json !== undefined ? JSON.stringify(json) : undefined),
    signal,
  });

  const body = await response.text();
  const payload: unknown = body.length > 0 ? JSON.parse(body) : null;

  if (!response.ok) {
    // An expired or revoked token must end the session rather than surface as a
    // per-call error in whichever component happened to make the request.
    if (response.status === 401) {
      notifyUnauthorized();
    }

    const detail =
      payload !== null && typeof payload === 'object' ? payload : {};

    throw new ApiError(
      readMessage(detail, response.status),
      response.status,
      readErrorBag(detail)
    );
  }

  return payload;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions
): Promise<T> => unwrap<T>(await send(path, options));

/** One page of a paginated collection, as the feed needs to walk it. */
export interface Page<T> {
  items: T[];
  page: number;
  lastPage: number;
}

/**
 * Laravel's paginator reports the position in `meta`, so a caller can ask for
 * the next page without trusting the absolute URLs in `links` - those are built
 * from the API's own `APP_URL`, which need not match the browser's origin.
 */
const readPage = <T>(payload: unknown): Page<T> => {
  const envelope =
    payload !== null && typeof payload === 'object'
      ? (payload as { data?: unknown; meta?: Record<string, unknown> })
      : {};

  // Same unchecked cast as `unwrap`: the envelope key is the contract.
  const items = Array.isArray(envelope.data) ? (envelope.data as T[]) : [];
  const meta = envelope.meta ?? {};

  const at = (key: string, fallback: number): number =>
    typeof meta[key] === 'number' ? (meta[key] as number) : fallback;

  // An unpaginated collection has no `meta`, and reads as a single full page.
  return { items, page: at('current_page', 1), lastPage: at('last_page', 1) };
};

export const apiPage = async <T>(
  path: string,
  options: RequestOptions
): Promise<Page<T>> => readPage<T>(await send(path, options));

/**
 * A request cancelled through its `signal` rejects with an `AbortError`
 * DOMException. That is a component unmounting or a newer keystroke winning,
 * never a failure the user should be told about.
 */
export const isAbort = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError';

/**
 * Flattens a caught error into lines for `ErrorList`. Only a 422 carries a
 * per-field bag; everything else (network failure, 403, 500) has a single
 * message, so callers must not assume `list` exists.
 */
export const errorSummary = (error: unknown): string[] => {
  if (error instanceof ApiError && error.list !== undefined) {
    return Object.values(error.list).flat();
  }

  if (error instanceof Error) {
    return [error.message];
  }

  return ['Something went wrong.'];
};

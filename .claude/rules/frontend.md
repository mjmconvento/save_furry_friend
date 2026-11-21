---
paths:
  - "frontend_react/src/**/*.{ts,tsx,css}"
  - "frontend_react/*.{ts,js,json,jsonc}"
---

# Frontend rules (React 19, Vite, MUI 7, Vitest)

Run everything through `docker compose exec -T react yarn …`; there is no Node on the host. Yarn only.

## Layout

- `src/page/` route components (lazy-loaded in `App.tsx`), `src/component/<area>/` building blocks,
  `src/service/<area>/<thing>Api.ts` network calls, `src/interface/` API shapes, `src/config/` constants.
- Endpoint paths are constants in `src/config/api.ts` (`'api/posts'`, no leading slash). Never inline a
  path string in a component.
- Every request goes through `apiRequest<T>` (unwraps `{data}`) or `apiPage<T>` (returns
  `{items, page, lastPage}` from Laravel's `meta`). Both take `{ token, signal, query, json | form }`.
  A 401 ends the session centrally via `authBridge`; do not handle it per component.
- Service functions take `token: string | null` and an optional `AbortSignal`; callers abort on
  unmount and ignore `isAbort(error)`.

## State and UX patterns already in use

- Optimistic updates with rollback on failure (likes, follow buttons): update local state, call the
  API, replace with the server's copy on success, restore and `useNotify()` on failure.
- Errors render through `errorSummary(error)` + `ErrorList`; 422 bags are per-field.
- Tone vocabulary comes from `src/config/tags.ts` (`POST_TAGS`, `TONE_LABEL`). Never write a tag
  literal like `'happy_post'` in a component.
- Account-level preferences are saved to the API (`PATCH api/user/preferences`), not `localStorage`.
- Accessible names drive the tests: buttons and regions need labels a user would read.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, no `any`, no non-null `!` to silence the checker. Narrow.
- Unused args/vars prefixed `_`. `eqeqeq` and `react-hooks/exhaustive-deps` are errors.
- Prettier: single quotes, semicolons, 80 columns, `trailingComma: es5`.

## Tests (Vitest + Testing Library)

- `src/App.test.tsx` renders the whole app and stubs **`fetch`** by URL fragment, so `apiClient` and
  the auth bridge execute for real. Do not `vi.mock` service modules.
- Fragment matching is first-match: put narrower fragments (`api/posts/post-1/like`) before broader
  ones (`api/posts`) in the `routes` object.
- Query by role and accessible name (`getByRole('button', { name: /^like$/i })`); lazy routes need
  `findBy…(…, undefined, { timeout: 5000 })` on first paint.
- Tests need `VITE_API_BASE_URL`; the `react` container provides it.

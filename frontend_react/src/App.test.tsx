import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './component/template/ToastProvider';
import App from './App';
import theme from './theme';
import { API_BASE_URL } from './config/api';

/**
 * `fetch` is stubbed rather than the service modules, so `apiClient`, the
 * service layer and the 401 auth bridge all execute for real. Mocking
 * `postApi` instead would have made the 401 test assert the mock: the bridge
 * lives inside `apiRequest`, which a module mock skips entirely.
 */
type Route = { status: number; body: unknown };

let routes: Record<string, Route>;

const respond = (input: RequestInfo | URL): Response => {
  const url = typeof input === 'string' ? input : input.toString();

  for (const [fragment, route] of Object.entries(routes)) {
    if (url.includes(fragment)) {
      return new Response(JSON.stringify(route.body), { status: route.status });
    }
  }

  return new Response(JSON.stringify({ data: [] }), { status: 200 });
};

const renderApp = () =>
  render(
    <ThemeProvider theme={theme}>
      <ToastProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );

const signIn = () => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('loggedInUserId', 'user-1');
  localStorage.setItem('loggedInUserName', 'Test User');
};

beforeEach(() => {
  localStorage.clear();
  window.history.pushState({}, '', '/');
  routes = {
    'api/posts': { status: 200, body: { data: [], links: {}, meta: {} } },
    'api/users': { status: 200, body: { data: [], links: {}, meta: {} } },
    'api/logout': { status: 200, body: { message: 'Logout successful' } },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => Promise.resolve(respond(input)))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('unauthenticated', () => {
  it('shows the login form and does not render the app shell', async () => {
    renderApp();

    expect(
      await screen.findByRole('button', { name: /login/i })
    ).toBeInTheDocument();
    // The shell must not paint for a logged-out visitor. F12: the gate used to
    // be an early return above the router, so there was no /login route.
    expect(screen.queryByRole('navigation', { name: /sidebar/i })).toBeNull();
  });

  it('redirects a protected deep link to /login', async () => {
    window.history.pushState({}, '', '/users');

    renderApp();

    await screen.findByRole('button', { name: /login/i });
    expect(window.location.pathname).toBe('/login');
  });
});

describe('authenticated', () => {
  beforeEach(signIn);

  it('renders the app shell and lands on the happy feed', async () => {
    renderApp();

    expect(
      await screen.findByRole('navigation', { name: /sidebar/i })
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/happy_posts'));
  });

  it('sends the bearer token and no cookies', async () => {
    // F4/F5: the app used to send `credentials: 'include'` and an
    // `X-XSRF-Token` header alongside the bearer token.
    renderApp();

    // The feed page is a lazy chunk behind a Suspense boundary, so the first
    // request cannot fire until the shell has mounted.
    await screen.findByRole('navigation', { name: /sidebar/i });
    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 5000 });

    const [, init] = vi.mocked(fetch).mock.calls[0] ?? [];
    // The client builds a plain object literal for headers, which is what the
    // assertions below read; narrowing keeps it honest if that ever changes.
    const headers =
      init?.headers &&
      !Array.isArray(init.headers) &&
      !(init.headers instanceof Headers)
        ? init.headers
        : {};

    expect(headers.Authorization).toBe('Bearer test-token');
    expect(init?.credentials).toBeUndefined();
    expect(Object.keys(headers)).not.toContain('X-XSRF-Token');
  });

  it('logs out on a 401 instead of throwing', async () => {
    // F1: nothing reacted to a 401, so an expired token surfaced as a
    // TypeError from Object.values(undefined) rather than a re-login prompt.
    routes['api/posts'] = {
      status: 401,
      body: { message: 'Unauthenticated.' },
    };

    renderApp();

    expect(
      await screen.findByRole('button', { name: /login/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('loggedInUserId')).toBeNull();
  });

  it('revokes the token server-side and clears every stored key on logout', async () => {
    // F3: logout removed `token` only - it never called POST /api/logout, so
    // the server-side token stayed valid, and `loggedInUserId` survived to make
    // the next session render the previous user's edit affordances.
    renderApp();

    // jsdom does not evaluate MUI's breakpoint media queries, so both the
    // desktop text button and the mobile icon button are in the tree.
    const [logout] = await screen.findAllByRole('button', { name: /log out/i });

    if (!logout) {
      throw new Error('no log out control rendered');
    }

    await userEvent.click(logout);

    await waitFor(() => {
      const calledLogout = vi
        .mocked(fetch)
        .mock.calls.some(([input]) => String(input).includes('api/logout'));

      expect(calledLogout).toBe(true);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('loggedInUserId')).toBeNull();
      expect(localStorage.getItem('loggedInUserName')).toBeNull();
    });
  });
});

describe('config', () => {
  it('reads the API base URL from the environment', () => {
    // F6: this was a hardcoded literal, so no other environment could be built.
    expect(API_BASE_URL).toBe(import.meta.env.VITE_API_BASE_URL);
    expect(API_BASE_URL).toBeTruthy();
  });
});

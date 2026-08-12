import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from '@mui/material/styles';
import { AuthProvider } from './AuthContext';
import { ToastProvider } from './component/template/ToastProvider';
import App from './App';
import theme from './theme';
import { API_BASE_URL } from './config/api';
import type { Post } from './interface/Post';
import type { UserRole } from './interface/User';

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

/**
 * Roles are part of the stored session: without them `AuthContext` treats the
 * session as incomplete and sends it back through login, which is what happens
 * to sessions predating the field.
 *
 * Admins carry `user` too, matching what the seeder and the API produce.
 */
const signIn = (...roles: UserRole[]) => {
  localStorage.setItem('token', 'test-token');
  localStorage.setItem('loggedInUserId', 'user-1');
  localStorage.setItem('loggedInUserName', 'Test User');
  localStorage.setItem(
    'loggedInUserRoles',
    JSON.stringify(roles.length > 0 ? roles : ['user'])
  );
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
  // Wrapped, not passed by reference: `beforeEach` hands its callback a test
  // context, which would arrive as the `role` argument.
  beforeEach(() => signIn());

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
    await waitFor(() => expect(fetch).toHaveBeenCalled(), { timeout: 15_000 });

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

  it('appends the next page of a feed instead of hiding it', async () => {
    // The feed is paginated at 20 server-side, and the client used to type the
    // response as a bare array - so every post past the first page was
    // unreachable once the sample corpus grew past 20.
    const post = (id: string, content: string): Post => ({
      id,
      content,
      authorId: 'user-9',
      authorName: 'Other Author',
      tags: ['happy_post'],
      createdAt: '2026-08-01T10:00:00.000Z',
      updatedAt: '2026-08-01T10:00:00.000Z',
      medias: [],
    });

    // First match wins, so the narrower `page=2` fragment is registered first.
    routes = {
      'page=2': {
        status: 200,
        body: {
          data: [post('p2', 'Second page post')],
          meta: { current_page: 2, last_page: 2 },
        },
      },
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: [post('p1', 'First page post')],
          meta: { current_page: 1, last_page: 2 },
        },
      },
    };

    renderApp();

    expect(await screen.findByText('First page post')).toBeInTheDocument();
    expect(screen.queryByText('Second page post')).not.toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: /load more/i })
    );

    expect(await screen.findByText('Second page post')).toBeInTheDocument();
    // Appended, not replaced.
    expect(screen.getByText('First page post')).toBeInTheDocument();

    const askedForPage2 = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).includes('page=2'));

    expect(askedForPage2).toBe(true);

    // The last page has been reached, so there is nothing left to offer.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /load more/i })
      ).not.toBeInTheDocument()
    );
  });
});

describe('roles', () => {
  it('hides user administration from a non-admin', async () => {
    signIn('user');
    renderApp();

    await screen.findByRole('navigation', { name: /sidebar/i });

    expect(
      screen.queryByRole('link', { name: /users/i })
    ).not.toBeInTheDocument();
  });

  it('keeps a non-admin off /users even by direct navigation', async () => {
    // Hiding the link is not the gate: the path stays typeable.
    signIn('user');
    window.history.pushState({}, '', '/users');
    renderApp();

    await screen.findByRole('navigation', { name: /sidebar/i });
    await waitFor(() => expect(window.location.pathname).toBe('/happy_posts'));
  });

  it('offers user administration to an admin, who also carries the user role', async () => {
    signIn('admin', 'user');
    window.history.pushState({}, '', '/users');
    renderApp();

    expect(
      await screen.findByRole('link', { name: /users/i })
    ).toBeInTheDocument();
    // Stayed put rather than being redirected away.
    expect(window.location.pathname).toBe('/users');
  });

  it('reads admin from membership, whatever else the list holds', async () => {
    // The list is unordered and open-ended: `admin` anywhere in it is an admin.
    signIn('user', 'admin');
    renderApp();

    expect(
      await screen.findByRole('link', { name: /users/i })
    ).toBeInTheDocument();
  });

  it('ignores an unrecognised role instead of trusting it', async () => {
    // Mirrors the API's cast: an unknown value is not an implicit grant, but the
    // known roles beside it still count, so the session survives.
    localStorage.setItem('token', 'test-token');
    localStorage.setItem('loggedInUserId', 'user-1');
    localStorage.setItem('loggedInUserName', 'Test User');
    localStorage.setItem(
      'loggedInUserRoles',
      JSON.stringify(['superuser', 'user'])
    );
    renderApp();

    await screen.findByRole('navigation', { name: /sidebar/i });

    expect(
      screen.queryByRole('link', { name: /users/i })
    ).not.toBeInTheDocument();
  });

  it('ends a session whose stored roles are missing or all unrecognised', async () => {
    // Sessions predating the field, and anyone who edits the value by hand into
    // nonsense, go back through login rather than rendering a half-known identity.
    signIn('user');
    localStorage.setItem('loggedInUserRoles', JSON.stringify(['superuser']));
    renderApp();

    expect(
      await screen.findByRole('button', { name: /login/i })
    ).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('ends a session whose stored roles are not even valid json', async () => {
    signIn('user');
    localStorage.setItem('loggedInUserRoles', 'admin');
    renderApp();

    expect(
      await screen.findByRole('button', { name: /login/i })
    ).toBeInTheDocument();
  });
});

describe('config', () => {
  it('reads the API base URL from the environment', () => {
    // F6: this was a hardcoded literal, so no other environment could be built.
    expect(API_BASE_URL).toBe(import.meta.env.VITE_API_BASE_URL);
    expect(API_BASE_URL).toBeTruthy();
  });
});

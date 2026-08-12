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
  // The content warning remembers acknowledgement per tab, which would
  // otherwise leak between tests.
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
  routes = {
    // Registered before `api/posts`, which would otherwise match this URL too.
    'api/posts/summary': {
      status: 200,
      body: {
        data: {
          date: '2026-08-12',
          counts: { happy_post: 0, neutral_post: 0, heartbreaking_post: 0 },
        },
      },
    },
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

  it('renders the app shell and stays on the home page', async () => {
    // `/` used to redirect to the happy feed, which left the sidebar's Home
    // entry pointing at another page's content.
    renderApp();

    expect(
      await screen.findByRole('navigation', { name: /sidebar/i })
    ).toBeInTheDocument();
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
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

    // Explicitly a feed: `/` is the home page now, and its summary request is a
    // different route than the one stubbed above.
    window.history.pushState({}, '', '/happy_posts');
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
      authorAvatar: null,
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

    // The home page does not render a feed, so ask for one.
    window.history.pushState({}, '', '/happy_posts');
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

describe('home page summary', () => {
  beforeEach(() => signIn());

  const withCounts = (counts: Record<string, number>) => {
    routes = {
      ...routes,
      'api/posts/summary': {
        status: 200,
        body: { data: { date: '2026-08-12', counts } },
      },
    };
  };

  it('counts up to each tone total for today', async () => {
    withCounts({ happy_post: 7, neutral_post: 3, heartbreaking_post: 1 });
    renderApp();

    // The label carries the real number immediately; the rendered text is what
    // animates, so this waits for the count-up to land rather than racing it.
    await waitFor(
      () =>
        expect(screen.getByLabelText('7 happy posts today')).toHaveTextContent(
          '7'
        ),
      { timeout: 5000 }
    );
    await waitFor(() =>
      expect(screen.getByLabelText('3 neutral posts today')).toHaveTextContent(
        '3'
      )
    );
    // Singular, because one post is not "1 posts".
    await waitFor(() =>
      expect(
        screen.getByLabelText('1 heartbreaking post today')
      ).toHaveTextContent('1')
    );
  });

  it('links each tone to its feed', async () => {
    withCounts({ happy_post: 2, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    const links = await screen.findAllByRole('link', { name: /posts today/i });
    const targets = links.map((link) => link.getAttribute('href'));

    expect(targets).toEqual([
      '/happy_posts',
      '/neutral_posts',
      '/heartbreaking_posts',
    ]);
  });

  it('says so when nobody has posted today', async () => {
    withCounts({ happy_post: 0, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    expect(
      await screen.findByText(/nothing shared today yet/i)
    ).toBeInTheDocument();
  });

  it("reports the day the API counted rather than assuming the browser's", async () => {
    // The API counts its own midnight; the browser may already be on the next day.
    withCounts({ happy_post: 1, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    expect(
      await screen.findByText(/counted for 2026-08-12/i)
    ).toBeInTheDocument();
  });

  it('surfaces a failed summary without blanking the page', async () => {
    routes = {
      ...routes,
      'api/posts/summary': { status: 500, body: { message: 'Server error' } },
    };
    renderApp();

    expect(await screen.findByRole('alert')).toHaveTextContent(/server error/i);
    // The cards still render, at zero, rather than the page collapsing.
    expect(
      await screen.findByLabelText('0 happy posts today')
    ).toBeInTheDocument();
  });
});

describe('heartbreaking content warning', () => {
  beforeEach(() => {
    signIn();
    window.history.pushState({}, '', '/heartbreaking_posts');
  });

  const askedForTheFeed = (): boolean =>
    vi
      .mocked(fetch)
      .mock.calls.some(([input]) =>
        String(input).includes('heartbreaking_post')
      );

  it('warns before the feed, and does not load it yet', async () => {
    renderApp();

    expect(await screen.findByText(/before you read on/i)).toBeInTheDocument();
    // The point of the gate: `PostFeed` fetches on mount, so the posts must not
    // have been requested behind the warning.
    expect(askedForTheFeed()).toBe(false);
  });

  it('offers a way out that is not the feed', async () => {
    renderApp();

    await screen.findByText(/before you read on/i);

    // The sidebar links to the same feed, so match the warning's own wording.
    expect(
      screen.getByRole('link', { name: /take me to happy posts/i })
    ).toHaveAttribute('href', '/happy_posts');
  });

  it('loads the feed once the reader continues', async () => {
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /show the posts/i })
    );

    await waitFor(() => expect(askedForTheFeed()).toBe(true));
    expect(screen.queryByText(/before you read on/i)).not.toBeInTheDocument();
  });

  it('does not save anything when the box is left unticked', async () => {
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /show the posts/i })
    );
    await waitFor(() => expect(askedForTheFeed()).toBe(true));

    const saved = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).includes('user/preferences'));

    expect(saved).toBe(false);
  });

  it('saves the preference to the account when the box is ticked', async () => {
    routes = {
      ...routes,
      'user/preferences': {
        status: 200,
        body: {
          data: { preferences: { hide_heartbreaking_warning: true } },
        },
      },
    };
    renderApp();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: /don't show this warning/i })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );

    await waitFor(() => {
      const [url, init] =
        vi
          .mocked(fetch)
          .mock.calls.find(([input]) =>
            String(input).includes('user/preferences')
          ) ?? [];

      expect(url).toBeDefined();
      expect(init?.method).toBe('PATCH');
      expect(String(init?.body)).toContain('hide_heartbreaking_warning');
    });

    // Cached locally too, so the next page load does not need the round trip.
    await waitFor(() =>
      expect(localStorage.getItem('loggedInUserPreferences')).toContain(
        'hide_heartbreaking_warning'
      )
    );
  });

  it('skips the warning entirely once the account has dismissed it', async () => {
    localStorage.setItem(
      'loggedInUserPreferences',
      JSON.stringify({ hide_heartbreaking_warning: true })
    );
    renderApp();

    await waitFor(() => expect(askedForTheFeed()).toBe(true));
    expect(screen.queryByText(/before you read on/i)).not.toBeInTheDocument();
  });

  it('does not warn twice in the same tab', async () => {
    // Acknowledgement is per tab, so leaving and coming back a minute later must
    // not warn again even without the box ticked.
    sessionStorage.setItem('heartbreakingWarningAcknowledged', 'true');
    renderApp();

    await waitFor(() => expect(askedForTheFeed()).toBe(true));
    expect(screen.queryByText(/before you read on/i)).not.toBeInTheDocument();
  });

  it('still shows the posts when saving the preference fails', async () => {
    // Consent was given; a failed save must not hold the reader up, but it must
    // not pass silently either.
    routes = {
      ...routes,
      'user/preferences': { status: 500, body: { message: 'Nope' } },
    };
    renderApp();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: /don't show this warning/i })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );

    await waitFor(() => expect(askedForTheFeed()).toBe(true));
    expect(await screen.findByText(/could not save that/i)).toBeInTheDocument();
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

describe('profile picture and header', () => {
  const profile = (over: Record<string, unknown> = {}) => ({
    id: 'user-1',
    first_name: 'Test',
    middle_name: null,
    last_name: 'User',
    email: 'test@user.com',
    avatar: null,
    roles: ['user'],
    preferences: { hide_heartbreaking_warning: false },
    is_following: false,
    stats: { posts: 4, followers: 2, following: 7 },
    ...over,
  });

  beforeEach(() => {
    signIn();
    window.history.pushState({}, '', '/my_profile');
  });

  it('shows the counts the profile endpoint reports', async () => {
    // Registered before the spread: `api/users` would otherwise match this URL
    // first and answer with the empty list.
    routes = {
      'api/users/user-1': { status: 200, body: { data: profile() } },
      ...routes,
    };
    renderApp();

    expect(await screen.findByText('4')).toBeInTheDocument();
    expect(await screen.findByText('2')).toBeInTheDocument();
    expect(await screen.findByText('7')).toBeInTheDocument();
  });

  it('falls back to an initial when there is no picture', async () => {
    renderApp();

    // The header renders from the cached session, so it does not wait on a
    // request to show who you are.
    const header = await screen.findByRole('heading', { name: 'Test User' });

    expect(header).toBeInTheDocument();
    expect(document.querySelector('main img')).toBeNull();
  });

  it('renders the cached picture without waiting for a request', async () => {
    localStorage.setItem('loggedInUserAvatar', 'http://minio/uploads/me.jpg');
    renderApp();

    // Decorative next to the visible name, so `alt` is empty and there is no
    // `img` role to query by.
    await waitFor(() =>
      expect(document.querySelector('main img')).toHaveAttribute(
        'src',
        'http://minio/uploads/me.jpg'
      )
    );
  });

  it('uploads a picture and shows it straight away', async () => {
    routes = {
      ...routes,
      'api/user/avatar': {
        status: 200,
        body: { data: profile({ avatar: 'http://minio/uploads/new.jpg' }) },
      },
    };
    renderApp();

    const input = await screen.findByTestId('avatar-input');

    await userEvent.upload(
      input,
      new File(['x'], 'me.jpg', { type: 'image/jpeg' })
    );

    // No reload: the context caches what the API returned.
    await waitFor(() =>
      expect(document.querySelector('main img')).toHaveAttribute(
        'src',
        'http://minio/uploads/new.jpg'
      )
    );
    expect(localStorage.getItem('loggedInUserAvatar')).toBe(
      'http://minio/uploads/new.jpg'
    );

    const [, init] =
      vi
        .mocked(fetch)
        .mock.calls.find(([url]) => String(url).includes('user/avatar')) ?? [];

    expect(init?.method).toBe('POST');
    // Multipart, like post media - not JSON.
    expect(init?.body).toBeInstanceOf(FormData);
  });

  it('removes a picture and drops back to the initial', async () => {
    localStorage.setItem('loggedInUserAvatar', 'http://minio/uploads/me.jpg');
    routes = {
      ...routes,
      'api/user/avatar': { status: 200, body: { data: profile() } },
    };
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /remove/i })
    );

    await waitFor(() => expect(document.querySelector('main img')).toBeNull());
    expect(localStorage.getItem('loggedInUserAvatar')).toBeNull();
  });

  it('reports a rejected upload instead of pretending it worked', async () => {
    routes = {
      ...routes,
      'api/user/avatar': {
        status: 422,
        body: {
          message: 'A profile picture must be a JPEG, PNG or WebP image.',
          errors: {
            avatar: ['A profile picture must be a JPEG, PNG or WebP image.'],
          },
        },
      },
    };
    renderApp();

    await userEvent.upload(
      await screen.findByTestId('avatar-input'),
      new File(['x'], 'me.jpg', { type: 'image/jpeg' })
    );

    expect(await screen.findByText(/must be a JPEG/i)).toBeInTheDocument();
    expect(document.querySelector('main img')).toBeNull();
  });

  it('shows an author picture on a post card', async () => {
    window.history.pushState({}, '', '/happy_posts');
    routes = {
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: [
            {
              id: 'p1',
              authorId: 'user-9',
              authorName: 'Other Author',
              authorAvatar: 'http://minio/uploads/other.jpg',
              content: 'A post',
              tags: ['happy_post'],
              createdAt: '2026-08-01T10:00:00.000Z',
              updatedAt: '2026-08-01T10:00:00.000Z',
              medias: [],
            },
          ],
          meta: { current_page: 1, last_page: 1 },
        },
      },
    };
    renderApp();

    await screen.findByText('A post');

    // The avatar is decorative beside the author's name, so `alt` is empty and
    // it carries no `img` role.
    expect(
      document.querySelector('img[src="http://minio/uploads/other.jpg"]')
    ).not.toBeNull();
  });
});

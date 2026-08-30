import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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
          from: '2026-08-06',
          to: '2026-08-12',
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
      likeCount: 0,
      likedByViewer: false,
      commentCount: 0,
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
        body: { data: { from: '2026-08-06', to: '2026-08-12', counts } },
      },
    };
  };

  it('counts up to each tone total for the week', async () => {
    withCounts({ happy_post: 7, neutral_post: 3, heartbreaking_post: 1 });
    renderApp();

    // The label carries the real number immediately; the rendered text is what
    // animates, so this waits for the count-up to land rather than racing it.
    await waitFor(
      () =>
        expect(
          screen.getByLabelText('7 happy posts this week')
        ).toHaveTextContent('7'),
      { timeout: 5000 }
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText('3 neutral posts this week')
      ).toHaveTextContent('3')
    );
    // Singular, because one post is not "1 posts".
    await waitFor(() =>
      expect(
        screen.getByLabelText('1 heartbreaking post this week')
      ).toHaveTextContent('1')
    );
  });

  it('links each tone to its feed', async () => {
    withCounts({ happy_post: 2, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    const links = await screen.findAllByRole('link', {
      name: /posts this week/i,
    });
    const targets = links.map((link) => link.getAttribute('href'));

    expect(targets).toEqual([
      '/happy_posts',
      '/neutral_posts',
      '/heartbreaking_posts',
    ]);
  });

  it('says so when nobody has posted all week', async () => {
    withCounts({ happy_post: 0, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    expect(
      await screen.findByText(/nothing shared this past week/i)
    ).toBeInTheDocument();
  });

  it('reports the window the API counted rather than working it out locally', async () => {
    // Both ends, and from the payload: the browser's clock may already be on the
    // next day, and it does not know how many days the API spans.
    withCounts({ happy_post: 1, neutral_post: 0, heartbreaking_post: 0 });
    renderApp();

    expect(
      await screen.findByText(/counted from 2026-08-06 to 2026-08-12/i)
    ).toBeInTheDocument();
  });

  it('flags the heartbreaking feed at the link, not just behind it', async () => {
    withCounts({ happy_post: 1, neutral_post: 0, heartbreaking_post: 2 });
    renderApp();

    const caution = await screen.findByText(/upsetting content/i);
    const card = caution.closest('a');

    // On that card specifically, so it warns before the click as well as after.
    expect(card).toHaveAttribute('href', '/heartbreaking_posts');
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
      await screen.findByLabelText('0 happy posts this week')
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

  it('warns again on a later visit, unless the box was ticked', async () => {
    // Regression: continuing once used to be remembered for the whole browser
    // session, so the warning never appeared again - indistinguishable from it
    // being broken. Only the account preference may suppress it.
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /show the posts/i })
    );
    await waitFor(() => expect(askedForTheFeed()).toBe(true));

    // Leave and come back, as navigating away and returning would.
    cleanup();
    window.history.pushState({}, '', '/heartbreaking_posts');
    renderApp();

    expect(await screen.findByText(/before you read on/i)).toBeInTheDocument();
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

describe('registration and email verification', () => {
  const account = (over: Record<string, unknown> = {}) => ({
    id: 'user-1',
    first_name: 'New',
    middle_name: null,
    last_name: 'Volunteer',
    email: 'new@user.com',
    email_verified: false,
    avatar: null,
    roles: ['user'],
    preferences: { hide_heartbreaking_warning: false },
    is_following: false,
    stats: { posts: 0, followers: 0, following: 0 },
    ...over,
  });

  const fillForm = async () => {
    await userEvent.type(await screen.findByLabelText(/first name/i), 'New');
    await userEvent.type(screen.getByLabelText(/last name/i), 'Volunteer');
    await userEvent.type(screen.getByLabelText(/email/i), 'new@user.com');
    await userEvent.type(screen.getByLabelText(/^password/i), 'password112233');
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      'password112233'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /create account/i })
    );
  };

  it('offers a way to register from the login screen', async () => {
    window.history.pushState({}, '', '/login');
    renderApp();

    expect(
      await screen.findByRole('link', { name: /create an account/i })
    ).toHaveAttribute('href', '/register');
  });

  it('registers and signs the new account straight in', async () => {
    routes = {
      'api/register': {
        status: 201,
        body: { message: 'Registered', token: 'new-token', user: account() },
      },
      ...routes,
    };
    window.history.pushState({}, '', '/register');
    renderApp();

    await fillForm();

    // No second trip through login: the register response carried a token.
    await waitFor(() =>
      expect(localStorage.getItem('token')).toBe('new-token')
    );
    await screen.findByRole('navigation', { name: /sidebar/i });
  });

  it('reports why a registration was refused', async () => {
    routes = {
      'api/register': {
        status: 422,
        body: {
          message: 'The email has already been taken.',
          errors: { email: ['The email has already been taken.'] },
        },
      },
      ...routes,
    };
    window.history.pushState({}, '', '/register');
    renderApp();

    await fillForm();

    expect(await screen.findByText(/already been taken/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('nags an unverified account on every page', async () => {
    signIn();
    localStorage.setItem('loggedInUserVerified', '0');
    renderApp();

    const banner = await screen.findByText(/not confirmed yet/i);

    expect(banner).toBeInTheDocument();
    // Regression: rendered above the shell's flex row, the fixed sidebar painted
    // over its first 240px and ate the start of the sentence. Inside `main` it
    // sits in the column that already reserves the drawer's width.
    expect(banner.closest('main')).not.toBeNull();
  });

  it('says nothing once the address is verified', async () => {
    signIn();
    renderApp();

    await screen.findByRole('navigation', { name: /sidebar/i });

    expect(screen.queryByText(/not confirmed yet/i)).not.toBeInTheDocument();
  });

  it('re-reads the account when the reader says they have verified', async () => {
    // The link is opened outside this tab, so the flag cannot update itself.
    signIn();
    localStorage.setItem('loggedInUserVerified', '0');
    routes = {
      'api/users/user-1': {
        status: 200,
        body: { data: account({ email_verified: true }) },
      },
      ...routes,
    };
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /i have verified/i })
    );

    await waitFor(() =>
      expect(screen.queryByText(/not confirmed yet/i)).not.toBeInTheDocument()
    );
    expect(localStorage.getItem('loggedInUserVerified')).toBe('1');
  });

  it('confirms and clears the flag when arriving from a verification link', async () => {
    signIn();
    localStorage.setItem('loggedInUserVerified', '0');
    routes = {
      'api/users/user-1': {
        status: 200,
        body: { data: account({ email_verified: true }) },
      },
      ...routes,
    };
    window.history.pushState({}, '', '/?verified=1');
    renderApp();

    expect(await screen.findByText(/address confirmed/i)).toBeInTheDocument();
    // Stripped, so a reload does not toast again.
    await waitFor(() => expect(window.location.search).toBe(''));
  });
});

describe('people search', () => {
  const person = (over: Record<string, unknown> = {}) => ({
    id: 'user-9',
    first_name: 'Daniel',
    middle_name: 'Chukwu',
    last_name: 'Okafor',
    email: 'daniel@user.com',
    email_verified: true,
    avatar: null,
    roles: ['user'],
    preferences: { hide_heartbreaking_warning: false },
    is_following: false,
    stats: null,
    ...over,
  });

  const withResults = (data: unknown[]) => {
    routes = {
      'api/users/search': { status: 200, body: { data } },
      ...routes,
    };
  };

  const type = async (text: string) => {
    const field = await screen.findByPlaceholderText(/search people/i);
    await userEvent.type(field, text);

    return field;
  };

  beforeEach(() => signIn());

  it('shows a match with its picture', async () => {
    withResults([person({ avatar: 'http://minio/uploads/daniel.jpg' })]);
    renderApp();

    await type('Daniel Okafor');

    expect(
      await screen.findByText('Daniel Okafor', {}, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(
      document.querySelector('img[src="http://minio/uploads/daniel.jpg"]')
    ).not.toBeNull();
  });

  it('says so when nobody matches, rather than looking dead', async () => {
    // The popup used to be gated on having rows, so an empty result set showed
    // nothing at all and read as a broken field.
    withResults([]);
    renderApp();

    await type('zzznobody');

    expect(
      await screen.findByText(/no people match/i, {}, { timeout: 5000 })
    ).toBeInTheDocument();
  });

  it('reports that it is searching before the results land', async () => {
    withResults([person()]);
    renderApp();

    await type('Dan');

    // Before the debounce elapses, the field is already saying something.
    expect(await screen.findByText(/searching/i)).toBeInTheDocument();
  });

  it('offers a way to clear the field', async () => {
    withResults([person()]);
    renderApp();

    const field = await type('Daniel');

    await userEvent.click(
      await screen.findByRole('button', { name: /clear search/i })
    );

    expect(field).toHaveValue('');
  });

  it('sends the whole phrase to the API, spaces included', async () => {
    // The fix is server-side, so what matters here is that the client does not
    // mangle or split the query on its way out.
    withResults([person()]);
    renderApp();

    await type('Daniel Okafor');

    await waitFor(() =>
      expect(
        vi
          .mocked(fetch)
          .mock.calls.some(([url]) =>
            decodeURIComponent(String(url)).includes(
              'api/users/search/Daniel Okafor'
            )
          )
      ).toBe(true)
    );
  });
});

describe('followers and following', () => {
  const person = (
    id: string,
    first: string,
    over: Record<string, unknown> = {}
  ) => ({
    id,
    first_name: first,
    middle_name: null,
    last_name: 'Walker',
    email: `${first.toLowerCase()}@user.com`,
    email_verified: true,
    avatar: null,
    roles: ['user'],
    preferences: { hide_heartbreaking_warning: false },
    is_following: false,
    stats: { posts: 4, followers: 2, following: 1 },
    ...over,
  });

  const me = person('user-1', 'Test');

  const withGraph = (over: Record<string, unknown>) => {
    routes = {
      'api/users/user-1/followers': {
        status: 200,
        body: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      },
      'api/users/user-1/following': {
        status: 200,
        body: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      },
      'api/users/suggestions': { status: 200, body: { data: [] } },
      'api/users/user-1': { status: 200, body: { data: me } },
      ...over,
      ...routes,
    };
  };

  beforeEach(() => signIn());

  it('reaches the lists from the counts on a profile', async () => {
    withGraph({});
    window.history.pushState({}, '', '/my_profile');
    renderApp();

    expect(
      await screen.findByRole('link', { name: /followers: 2/i })
    ).toHaveAttribute('href', '/profile/user-1/followers');
    expect(screen.getByRole('link', { name: /following: 1/i })).toHaveAttribute(
      'href',
      '/profile/user-1/following'
    );
  });

  it('lists the followers', async () => {
    withGraph({
      'api/users/user-1/followers': {
        status: 200,
        body: {
          data: [person('user-9', 'Ines')],
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      },
    });
    window.history.pushState({}, '', '/profile/user-1/followers');
    renderApp();

    expect(await screen.findByText('Ines Walker')).toBeInTheDocument();
    // The row says what they have posted, not just their name.
    expect(await screen.findByText(/4 posts/i)).toBeInTheDocument();
  });

  it('says so when a list is empty', async () => {
    withGraph({});
    window.history.pushState({}, '', '/profile/user-1/followers');
    renderApp();

    expect(await screen.findByText(/nobody yet/i)).toBeInTheDocument();
  });

  it('follows somebody straight from a list', async () => {
    withGraph({
      'api/users/user-1/followers': {
        status: 200,
        body: {
          data: [person('user-9', 'Ines')],
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      },
      'api/users/user-9/follow': { status: 200, body: { message: 'Followed' } },
    });
    window.history.pushState({}, '', '/profile/user-1/followers');
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /^follow$/i })
    );

    // Flips in place rather than needing a reload.
    expect(
      await screen.findByRole('button', { name: /unfollow/i })
    ).toBeInTheDocument();
  });

  it('offers suggestions on your own following list', async () => {
    withGraph({
      'api/users/suggestions': {
        status: 200,
        body: {
          data: [
            person('user-7', 'Kwame', {
              stats: { posts: 9, followers: 3, following: 2 },
            }),
          ],
        },
      },
    });
    window.history.pushState({}, '', '/profile/user-1/following');
    renderApp();

    expect(await screen.findByText(/who to follow/i)).toBeInTheDocument();
    expect(await screen.findByText(/9 posts/i)).toBeInTheDocument();
  });

  it('does not suggest people while looking at somebody else', async () => {
    // "Who to follow" belongs on your own list; on a stranger's it is a non
    // sequitur.
    withGraph({
      'api/users/user-2/following': {
        status: 200,
        body: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      },
      'api/users/user-2': {
        status: 200,
        body: { data: person('user-2', 'Other') },
      },
      'api/users/suggestions': {
        status: 200,
        body: { data: [person('user-7', 'Kwame')] },
      },
    });
    window.history.pushState({}, '', '/profile/user-2/following');
    renderApp();

    await screen.findByText(/people other walker follows/i);

    expect(screen.queryByText(/who to follow/i)).not.toBeInTheDocument();
  });
});

describe('trivia', () => {
  beforeEach(() => signIn());

  const withTrivia = (
    items: { id: number; text: string; tone: string; species: string }[]
  ) => {
    routes = {
      ...routes,
      'api/trivia': { status: 200, body: { data: items } },
    };
  };

  /** Every trivia request so far, decoded so `tones[]=happy` is greppable. */
  const triviaRequests = (): string[] =>
    vi
      .mocked(fetch)
      .mock.calls.map(([input]) => decodeURIComponent(String(input)))
      .filter((url) => url.includes('api/trivia'));

  it('shows a fact on the dashboard, asking for happy and neutral only', async () => {
    withTrivia([
      {
        id: 1,
        text: 'Kittens start purring when they are only a few days old.',
        tone: 'happy',
        species: 'cat',
      },
    ]);
    renderApp();

    expect(
      await screen.findByText(/kittens start purring/i)
    ).toBeInTheDocument();
    // Heartbreaking stays on its own page, behind its warning.
    const [request] = triviaRequests();
    expect(request).toContain('tones[]=happy');
    expect(request).toContain('tones[]=neutral');
    expect(request).not.toContain('heartbreaking');
  });

  it('moves to the other fact on Next instead of repeating', async () => {
    withTrivia([
      {
        id: 1,
        text: 'Fact about dogs number one.',
        tone: 'happy',
        species: 'dog',
      },
      {
        id: 2,
        text: 'Fact about cats number two.',
        tone: 'neutral',
        species: 'cat',
      },
    ]);
    renderApp();

    // The deck is shuffled, so pin behavior, not order: whichever fact opens,
    // Next must show the other, and a third click must still show one of them.
    const first = (await screen.findByText(/fact about \w+ number/i))
      .textContent;
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    const second = screen.getByText(/fact about \w+ number/i).textContent;

    expect(second).not.toBe(first);

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/fact about \w+ number/i)).toBeInTheDocument();
  });

  it('shows only its own tone on the happy feed page', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withTrivia([
      { id: 1, text: 'A happy dog fact.', tone: 'happy', species: 'dog' },
    ]);
    renderApp();

    // 5s, not the default 1s: on a cold module cache the lazy page chunk
    // pulls the whole PostFeed graph, same as the home summary tests allow.
    expect(
      await screen.findByText(/a happy dog fact/i, undefined, {
        timeout: 5000,
      })
    ).toBeInTheDocument();
    // The species label rides along on the card.
    expect(screen.getByText('Dog')).toBeInTheDocument();
    const [request] = triviaRequests();
    expect(request).toContain('tones[]=happy');
    expect(request).not.toContain('neutral');
  });

  it('keeps heartbreaking trivia behind the content warning', async () => {
    window.history.pushState({}, '', '/heartbreaking_posts');
    withTrivia([
      {
        id: 1,
        text: 'A heartbreaking cat fact.',
        tone: 'heartbreaking',
        species: 'cat',
      },
    ]);
    renderApp();

    // Same rule as the posts: nothing heartbreaking is even requested until
    // the reader continues past the warning.
    await screen.findByText(/before you read on/i, undefined, {
      timeout: 5000,
    });
    expect(triviaRequests()).toHaveLength(0);

    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );

    expect(
      await screen.findByText(/a heartbreaking cat fact/i)
    ).toBeInTheDocument();
    const [request] = triviaRequests();
    expect(request).toContain('tones[]=heartbreaking');
  });
});

describe('design refinements', () => {
  const happyPost = {
    id: 'post-1',
    authorId: 'user-2',
    authorName: 'Sam Rivera',
    authorAvatar: null,
    content: 'A dog found his family today.',
    tags: ['happy_post', 'heartbreaking_post'],
    medias: [],
    createdAt: '2026-08-29T10:02:21Z',
    updatedAt: '2026-08-29T10:02:21Z',
  };

  const withPosts = (posts: unknown[]) => {
    routes = {
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: posts,
          links: {},
          meta: { current_page: 1, last_page: 1 },
        },
      },
    };
  };

  it('invites the first post when a feed is empty', async () => {
    signIn();
    window.history.pushState({}, '', '/happy_posts');
    renderApp();

    expect(
      await screen.findByText(/yours could be the first/i, undefined, {
        timeout: 5000,
      })
    ).toBeInTheDocument();
  });

  it('asks for their story, not what is on your mind, on the heartbreaking feed', async () => {
    signIn();
    window.history.pushState({}, '', '/heartbreaking_posts');
    renderApp();

    await screen.findByText(/before you read on/i, undefined, {
      timeout: 5000,
    });
    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );

    expect(
      await screen.findByLabelText(/tell their story/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/what's on your mind/i)).toBeNull();
  });

  it('drops only the redundant badge on a single-tone feed', async () => {
    signIn();
    window.history.pushState({}, '', '/happy_posts');
    withPosts([happyPost]);
    renderApp();

    await screen.findByText(/a dog found his family/i, undefined, {
      timeout: 5000,
    });
    // The page already says Happy; the badge would repeat it on every card.
    expect(screen.queryByText('Happy')).toBeNull();
    // A second tone the feed does NOT imply still shows.
    expect(screen.getByText('Heartbreaking')).toBeInTheDocument();
  });

  it('keeps the page title above the trivia card', async () => {
    signIn();
    window.history.pushState({}, '', '/happy_posts');
    routes = {
      ...routes,
      'api/trivia': {
        status: 200,
        body: {
          data: [
            { id: 1, text: 'An ordering fact.', tone: 'happy', species: 'dog' },
          ],
        },
      },
    };
    renderApp();

    const fact = await screen.findByText(/an ordering fact/i, undefined, {
      timeout: 5000,
    });
    const title = screen.getByRole('heading', { name: /happy posts/i });

    // The page identity must come first in reading and tab order.
    expect(
      title.compareDocumentPosition(fact) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('keeps Post disabled until there is something to post', async () => {
    signIn();
    window.history.pushState({}, '', '/happy_posts');
    renderApp();

    const post = await screen.findByRole(
      'button',
      { name: 'Post' },
      {
        timeout: 5000,
      }
    );
    expect(post).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText(/what's on your mind/i),
      'A first story'
    );
    expect(post).toBeEnabled();
  });

  it('names the recovery when a login fails', async () => {
    routes = { ...routes, 'api/login': { status: 401, body: {} } };
    renderApp();

    await userEvent.type(await screen.findByLabelText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'nope');
    await userEvent.click(screen.getByRole('button', { name: /login/i }));

    expect(
      await screen.findByText(/don't match|do not match/i)
    ).toBeInTheDocument();
  });
});

describe('password reset', () => {
  it('offers a way out from the login screen', async () => {
    renderApp();

    expect(
      await screen.findByRole('link', { name: /forgot your password/i })
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('confirms without revealing whether the address has an account', async () => {
    window.history.pushState({}, '', '/forgot-password');
    routes = {
      ...routes,
      'api/password/forgot': {
        status: 200,
        body: {
          message:
            'If that address has an account, a reset link is on its way.',
        },
      },
    };
    renderApp();

    await userEvent.type(
      await screen.findByLabelText(/email/i, undefined, { timeout: 5000 }),
      'someone@example.com'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /send.*link|reset link/i })
    );

    expect(
      await screen.findByText(/if that address has an account/i)
    ).toBeInTheDocument();
  });

  it('sends the token and address from the link, then points at sign-in', async () => {
    window.history.pushState(
      {},
      '',
      '/reset-password?token=tok-123&email=a%40b.test'
    );
    routes = {
      ...routes,
      'api/password/reset': {
        status: 200,
        body: { message: 'Your password has been reset.' },
      },
    };
    renderApp();

    await userEvent.type(
      await screen.findByLabelText(/^new password/i, undefined, {
        timeout: 5000,
      }),
      'new-password-1'
    );
    await userEvent.type(screen.getByLabelText(/confirm/i), 'new-password-1');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));

    await waitFor(() => {
      const sent = vi
        .mocked(fetch)
        .mock.calls.find(([input]) =>
          String(input).includes('api/password/reset')
        );
      expect(sent).toBeDefined();
      // The token is the authority; the address is what the broker checks it
      // against. Both come from the emailed link, not from the person.
      const body = JSON.parse(String((sent?.[1] as RequestInit)?.body));
      expect(body.token).toBe('tok-123');
      expect(body.email).toBe('a@b.test');
      expect(body.password_confirmation).toBe('new-password-1');
    });

    expect(
      await screen.findByRole('link', { name: /sign in|login/i })
    ).toBeInTheDocument();
  });

  it('says so when the link has expired', async () => {
    window.history.pushState(
      {},
      '',
      '/reset-password?token=stale&email=a%40b.test'
    );
    routes = {
      ...routes,
      'api/password/reset': {
        status: 422,
        body: {
          message: 'This password reset token is invalid.',
          errors: { email: ['This password reset token is invalid.'] },
        },
      },
    };
    renderApp();

    await userEvent.type(
      await screen.findByLabelText(/^new password/i, undefined, {
        timeout: 5000,
      }),
      'new-password-1'
    );
    await userEvent.type(screen.getByLabelText(/confirm/i), 'new-password-1');
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));

    expect(await screen.findByText(/token is invalid/i)).toBeInTheDocument();
  });

  it('states which tone the feed will tag a new post with', async () => {
    signIn();
    window.history.pushState({}, '', '/happy_posts');
    renderApp();

    // Closes the "feed decides the tag, silently" gap: the rule is stated
    // where the decision is actually made.
    expect(
      await screen.findByText(/tagged happy/i, undefined, { timeout: 5000 })
    ).toBeInTheDocument();
  });
});

describe('welcome card', () => {
  beforeEach(() => signIn());

  it('orients a new account on the dashboard', async () => {
    renderApp();

    const card = await screen.findByRole('region', {
      name: /getting started/i,
    });

    // The two things the app never explained: what the three feeds are, and
    // that the dashboard fills up as you follow people.
    expect(card).toHaveTextContent(/happy/i);
    expect(card).toHaveTextContent(/heartbreaking/i);
    expect(card).toHaveTextContent(/follow/i);
  });

  it('points at the people directory, where following starts', async () => {
    renderApp();

    const card = await screen.findByRole('region', {
      name: /getting started/i,
    });

    expect(
      within(card).getByRole('link', { name: /find people/i })
    ).toHaveAttribute('href', '/discover');
  });

  it('stays gone once the account has dismissed it', async () => {
    localStorage.setItem(
      'loggedInUserPreferences',
      JSON.stringify({ dismissed_welcome: true })
    );
    renderApp();

    // The dashboard still has to render; only the card is suppressed.
    await screen.findByText(/welcome back, test user/i);
    expect(
      screen.queryByRole('region', { name: /getting started/i })
    ).toBeNull();
  });

  it('writes the dismissal to the account, not just this tab', async () => {
    routes = {
      ...routes,
      'user/preferences': {
        status: 200,
        body: { data: { preferences: { dismissed_welcome: true } } },
      },
    };
    renderApp();

    const card = await screen.findByRole('region', {
      name: /getting started/i,
    });
    await userEvent.click(
      within(card).getByRole('button', { name: /dismiss|got it/i })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: /getting started/i })
      ).toBeNull()
    );

    // Same rule as the content warning: the account is the source of truth, so
    // dismissing on a phone must not leave it showing on a laptop.
    const saved = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).includes('user/preferences'));

    expect(saved).toBe(true);
  });

  it('keeps the card if the dismissal could not be saved', async () => {
    // Otherwise it vanishes locally and returns on the next device, which is
    // indistinguishable from the button being broken.
    routes = {
      ...routes,
      'user/preferences': { status: 500, body: { message: 'nope' } },
    };
    renderApp();

    const card = await screen.findByRole('region', {
      name: /getting started/i,
    });
    await userEvent.click(
      within(card).getByRole('button', { name: /dismiss|got it/i })
    );

    expect(
      await screen.findByRole('region', { name: /getting started/i })
    ).toBeInTheDocument();
  });
});

describe('discover people', () => {
  beforeEach(() => signIn());

  const person = (id: string, name: string, posts: number) => ({
    id,
    first_name: name,
    last_name: 'Stranger',
    email: `${id}@example.com`,
    roles: ['user'],
    preferences: {},
    avatar: null,
    is_following: false,
    stats: { posts, followers: 2, following: 1 },
  });

  const withDiscoverable = (people: unknown[]) => {
    routes = {
      // FIRST, not spread last: `respond` returns the first fragment that
      // matches, and `api/users` in the base routes would otherwise swallow
      // this URL and answer with an empty page.
      'api/users/discover': {
        status: 200,
        body: {
          data: people,
          links: {},
          meta: { current_page: 1, last_page: 1, total: people.length },
        },
      },
      ...routes,
    };
  };

  it('lists people you do not follow yet, most active first', async () => {
    window.history.pushState({}, '', '/discover');
    withDiscoverable([person('u9', 'Ada', 12), person('u8', 'Grace', 3)]);
    renderApp();

    expect(
      await screen.findByText(/ada stranger/i, undefined, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.getByText(/grace stranger/i)).toBeInTheDocument();

    // Server-ranked; the page must not re-sort and must not invent an order.
    const names = screen
      .getAllByText(/stranger$/i)
      .map((node) => node.textContent);
    expect(names[0]).toMatch(/ada/i);
  });

  it('offers a follow button per person', async () => {
    window.history.pushState({}, '', '/discover');
    withDiscoverable([person('u9', 'Ada', 12)]);
    renderApp();

    await screen.findByText(/ada stranger/i, undefined, { timeout: 5000 });
    expect(
      screen.getByRole('button', { name: /^follow$/i })
    ).toBeInTheDocument();
  });

  it('says so when there is nobody left to follow', async () => {
    window.history.pushState({}, '', '/discover');
    withDiscoverable([]);
    renderApp();

    expect(
      await screen.findByText(/already follow everyone/i, undefined, {
        timeout: 5000,
      })
    ).toBeInTheDocument();
  });

  it('is reachable from the sidebar by a non-admin', async () => {
    renderApp();

    // Scoped to the nav landmark: the dashboard's own card also links to
    // /discover, so an unscoped query matches two links.
    const nav = await screen.findByRole('navigation', { name: /sidebar/i });

    expect(
      within(nav).getByRole('link', { name: /find people/i })
    ).toHaveAttribute('href', '/discover');
    // The admin-only Users entry must stay hidden from a plain account.
    expect(within(nav).queryByRole('link', { name: /^users$/i })).toBeNull();
  });

  it('is where the dashboard card sends you, not the admin user list', async () => {
    renderApp();

    const card = await screen.findByRole('region', {
      name: /getting started/i,
    });

    // Regression: this pointed at /users, which AdminRoute bounces for a
    // non-admin - the button was broken for exactly the people it was for.
    expect(
      within(card).getByRole('link', { name: /find people/i })
    ).toHaveAttribute('href', '/discover');
  });

  it('trims the following page prompt and links to the full page', async () => {
    signIn();
    window.history.pushState({}, '', '/profile/user-1/following');
    routes = {
      'api/users/suggestions': {
        status: 200,
        body: {
          data: [
            person('u1', 'One', 9),
            person('u2', 'Two', 8),
            person('u3', 'Three', 7),
          ],
        },
      },
      'api/users/user-1/following': {
        status: 200,
        body: { data: [], meta: { current_page: 1, last_page: 1, total: 0 } },
      },
      ...routes,
    };
    renderApp();

    expect(
      await screen.findByRole(
        'link',
        { name: /see everyone/i },
        {
          timeout: 5000,
        }
      )
    ).toHaveAttribute('href', '/discover');
  });
});

describe('liking posts', () => {
  beforeEach(() => signIn());

  const post = (over: Record<string, unknown> = {}) => ({
    id: 'post-1',
    authorId: 'user-2',
    authorName: 'Sam Rivera',
    authorAvatar: null,
    content: 'A dog found his family today.',
    tags: ['happy_post'],
    medias: [],
    likeCount: 3,
    likedByViewer: false,
    createdAt: '2026-08-29T10:02:21Z',
    updatedAt: '2026-08-29T10:02:21Z',
    ...over,
  });

  const liker = (id: string, first: string) => ({
    id,
    first_name: first,
    last_name: 'Walker',
    email: `${first.toLowerCase()}@user.com`,
    roles: ['user'],
    preferences: {},
    avatar: null,
    is_following: false,
    stats: { posts: 2, followers: 1, following: 1 },
  });

  const withPost = (body: unknown, extra: Record<string, unknown> = {}) => {
    routes = {
      // `extra` first so a narrower fragment like `api/posts/post-1/like` is
      // matched before `api/posts`. Then the base routes for position, then
      // `api/posts` LAST so its value is ours rather than the empty feed - in
      // an object literal the first mention fixes the order and the last one
      // fixes the value.
      ...extra,
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: [body],
          links: {},
          meta: { current_page: 1, last_page: 1 },
        },
      },
    };
  };

  it('separates affirming a post from reading who already did', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post());
    renderApp();

    // Two controls, one number: the icon toggles, the count opens the roster.
    // One control doing both would make every roster peek a like.
    expect(
      await screen.findByRole('button', { name: /^like$/i }, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /see who liked this, 3/i })
    ).toBeInTheDocument();
  });

  it('offers nothing to open when nobody has affirmed it', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post({ likeCount: 0 }));
    renderApp();

    await screen.findByRole('button', { name: /^like$/i }, { timeout: 5000 });
    expect(screen.queryByRole('button', { name: /see who/i })).toBeNull();
  });

  it('counts up immediately and tells the API', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post(), {
      'api/posts/post-1/like': {
        status: 200,
        body: { data: post({ likeCount: 4, likedByViewer: true }) },
      },
    });
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /^like$/i }, { timeout: 5000 })
    );

    // Optimistic: the number moves before the response lands.
    expect(
      await screen.findByRole('button', { name: /^unlike$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /see who liked this, 4/i })
    ).toBeInTheDocument();

    const called = vi
      .mocked(fetch)
      .mock.calls.some(
        ([input, init]) =>
          String(input).includes('api/posts/post-1/like') &&
          (init as RequestInit)?.method === 'POST'
      );
    expect(called).toBe(true);
  });

  it('takes the like back when the API refuses', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post(), {
      'api/posts/post-1/like': { status: 500, body: { message: 'nope' } },
    });
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /^like$/i }, { timeout: 5000 })
    );

    // Back to three: a count that stays wrong is worse than one that flickers.
    expect(
      await screen.findByRole('button', { name: /see who liked this, 3/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^like$/i })).toBeInTheDocument();
  });

  it('unlikes a post it already likes', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post({ likeCount: 5, likedByViewer: true }), {
      'api/posts/post-1/like': {
        status: 200,
        body: { data: post({ likeCount: 4, likedByViewer: false }) },
      },
    });
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /^unlike$/i },
        {
          timeout: 5000,
        }
      )
    );

    expect(
      await screen.findByRole('button', { name: /^like$/i })
    ).toBeInTheDocument();

    const deleted = vi
      .mocked(fetch)
      .mock.calls.some(
        ([input, init]) =>
          String(input).includes('api/posts/post-1/like') &&
          (init as RequestInit)?.method === 'DELETE'
      );
    expect(deleted).toBe(true);
  });

  it('says Remember, not Like, on a heartbreaking post', async () => {
    // "Like" on a story about an animal that ran out of time reads badly, so
    // the verb follows the tone the way the colour already does.
    window.history.pushState({}, '', '/heartbreaking_posts');
    withPost(post({ tags: ['heartbreaking_post'] }));
    renderApp();

    await screen.findByText(/before you read on/i, undefined, {
      timeout: 5000,
    });
    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );

    expect(
      await screen.findByRole('button', { name: /^remember$/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /see who remembered this, 3/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^like$/i })).toBeNull();
  });

  it('names the people behind the count', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post(), {
      'api/posts/post-1/likes': {
        status: 200,
        body: {
          data: [liker('u1', 'Ada'), liker('u2', 'Grace')],
          links: {},
          meta: { current_page: 1, last_page: 1, total: 2 },
        },
      },
    });
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /see who liked this, 3/i },
        {
          timeout: 5000,
        }
      )
    );

    const dialog = await screen.findByRole('dialog', { name: /liked by/i });

    expect(within(dialog).getByText(/ada walker/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/grace walker/i)).toBeInTheDocument();
    // The dialog reuses PersonRow, so it is also a place to follow from.
    expect(
      within(dialog).getAllByRole('button', { name: /^follow$/i })
    ).toHaveLength(2);
  });

  it('titles the roster for the tone', async () => {
    window.history.pushState({}, '', '/heartbreaking_posts');
    withPost(post({ tags: ['heartbreaking_post'] }), {
      'api/posts/post-1/likes': {
        status: 200,
        body: {
          data: [liker('u1', 'Ada')],
          links: {},
          meta: { current_page: 1, last_page: 1, total: 1 },
        },
      },
    });
    renderApp();

    await screen.findByText(/before you read on/i, undefined, {
      timeout: 5000,
    });
    await userEvent.click(
      screen.getByRole('button', { name: /show the posts/i })
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /see who remembered this, 3/i })
    );

    expect(
      await screen.findByRole('dialog', { name: /remembered by/i })
    ).toBeInTheDocument();
  });

  it('does not ask the API for a roster until it is opened', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withPost(post());
    renderApp();

    await screen.findByRole('button', { name: /^like$/i }, { timeout: 5000 });

    // A feed page carries twenty posts; fetching every roster up front would
    // ship a lot of bytes nobody asked for.
    const asked = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).includes('/likes'));
    expect(asked).toBe(false);
  });
});

describe('commenting on posts', () => {
  beforeEach(() => signIn());

  const post = (over: Record<string, unknown> = {}) => ({
    id: 'post-1',
    authorId: 'user-2',
    authorName: 'Sam Rivera',
    authorAvatar: null,
    content: 'A dog found his family today.',
    tags: ['happy_post'],
    medias: [],
    likeCount: 0,
    likedByViewer: false,
    commentCount: 2,
    createdAt: '2026-08-29T10:02:21Z',
    updatedAt: '2026-08-29T10:02:21Z',
    ...over,
  });

  const comment = (over: Record<string, unknown> = {}) => ({
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-3',
    authorName: 'Ada Lovelace',
    authorAvatar: null,
    content: 'What a good boy.',
    createdAt: '2026-08-29T11:00:00Z',
    ...over,
  });

  const withThread = (
    comments: unknown[],
    postOver: Record<string, unknown> = {},
    extra: Record<string, unknown> = {}
  ) => {
    routes = {
      ...extra,
      'api/posts/post-1/comments': {
        status: 200,
        body: {
          data: comments,
          links: {},
          meta: { current_page: 1, last_page: 1, total: comments.length },
        },
      },
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: [post(postOver)],
          links: {},
          meta: { current_page: 1, last_page: 1 },
        },
      },
    };
  };

  it('shows the comment count without opening the thread', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread([comment()]);
    renderApp();

    expect(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    ).toBeInTheDocument();
    // Collapsed by default: a feed of twenty open threads is unreadable, and
    // fetching them all would be a lot of bytes nobody asked for.
    expect(screen.queryByText(/what a good boy/i)).toBeNull();

    const asked = vi
      .mocked(fetch)
      .mock.calls.some(([input]) => String(input).includes('/comments'));
    expect(asked).toBe(false);
  });

  it('loads the thread when it is opened', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread([comment()]);
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );

    expect(await screen.findByText(/what a good boy/i)).toBeInTheDocument();
    expect(screen.getByText(/ada lovelace/i)).toBeInTheDocument();
  });

  it('says the author is missing rather than inventing a name', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread([comment({ authorName: null })]);
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );

    expect(await screen.findByText(/deleted account/i)).toBeInTheDocument();
    // The comment itself survives; only the name is gone.
    expect(screen.getByText(/what a good boy/i)).toBeInTheDocument();
  });

  it('posts a comment and shows it without a reload', async () => {
    window.history.pushState({}, '', '/happy_posts');
    // `respond` matches on URL fragment only, not method, so GET and POST of
    // the thread share one stub. It answers with a single comment: the initial
    // list reads it as no page (`readPage` needs an array) and the POST reads
    // it as the created comment, which is exactly what this test needs.
    routes = {
      'api/posts/post-1/comments': {
        status: 200,
        body: { data: comment({ content: 'Brand new thought.' }) },
      },
      ...routes,
      'api/posts': {
        status: 200,
        body: {
          data: [post({ commentCount: 0 })],
          links: {},
          meta: { current_page: 1, last_page: 1 },
        },
      },
    };
    renderApp();

    await userEvent.click(
      await screen.findByRole('button', { name: /comment/i }, { timeout: 5000 })
    );

    await userEvent.type(
      await screen.findByLabelText(/add a comment/i),
      'Brand new thought.'
    );
    await userEvent.click(
      screen.getByRole('button', { name: /post comment/i })
    );

    expect(await screen.findByText(/brand new thought/i)).toBeInTheDocument();
  });

  it('keeps Post disabled until there is something to say', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread([]);
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );

    expect(await screen.findByLabelText(/add a comment/i)).toBeInTheDocument();
    // Named distinctly from the feed composer's own Post button, so this needs
    // no scoping to find the right control.
    expect(
      screen.getByRole('button', { name: /post comment/i })
    ).toBeDisabled();
  });

  it("offers no delete on somebody else's comment", async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread([comment()]);
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );
    await screen.findByText(/what a good boy/i);

    expect(
      screen.queryByRole('button', { name: /delete comment/i })
    ).toBeNull();
  });

  it('lets you delete your own comment', async () => {
    window.history.pushState({}, '', '/happy_posts');
    withThread(
      [comment({ authorId: 'user-1', authorName: 'Test User' })],
      {},
      {
        'api/comments/comment-1': {
          status: 200,
          body: { message: 'Comment deleted successfully' },
        },
      }
    );
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );
    await userEvent.click(
      await screen.findByRole('button', { name: /delete comment/i })
    );

    await waitFor(() =>
      expect(screen.queryByText(/what a good boy/i)).toBeNull()
    );
  });

  it('lets the post author remove a comment on their own story', async () => {
    window.history.pushState({}, '', '/happy_posts');
    // The signed-in account owns the post, the comment belongs to someone else.
    withThread(
      [comment()],
      { authorId: 'user-1', authorName: 'Test User' },
      {
        'api/comments/comment-1': {
          status: 200,
          body: { message: 'Comment deleted successfully' },
        },
      }
    );
    renderApp();

    await userEvent.click(
      await screen.findByRole(
        'button',
        { name: /2 comments/i },
        {
          timeout: 5000,
        }
      )
    );
    await screen.findByText(/what a good boy/i);

    // Moderation over what hangs off your own story, matching CommentPolicy.
    expect(
      screen.getByRole('button', { name: /delete comment/i })
    ).toBeInTheDocument();
  });
});

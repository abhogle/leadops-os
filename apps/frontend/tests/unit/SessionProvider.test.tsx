/**
 * SessionProvider Component Tests
 * Tests for session initialization and routing logic
 */

import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from '../../src/providers/SessionProvider';
import { useSessionStore } from '../../src/state/sessionStore';
import { server } from '../msw/server';
import { adminHandlers, adminIncompleteOnboardingHandlers, errorHandlers } from '../msw/handlers';
import { TOKEN_KEY } from '../../src/config';
import { useRouter } from 'next/navigation';

// Mock Next.js router
jest.mock('next/navigation');
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue(mockRouter);

describe('SessionProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('Bootstrap', () => {
    it('should call /me and /onboarding/state exactly once on mount', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      let meCallCount = 0;
      let stateCallCount = 0;

      server.use(
        server.listHandlers()[0], // Use default /me handler
        server.listHandlers()[1]  // Use default /onboarding/state handler
      );

      // Track call counts
      const originalFetch = global.fetch;
      global.fetch = jest.fn(async (url, ...args) => {
        if (typeof url === 'string') {
          if (url.includes('/me')) meCallCount++;
          if (url.includes('/onboarding/state')) stateCallCount++;
        }
        return originalFetch(url, ...args);
      }) as any;

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Test Children')).toBeInTheDocument();
      });

      expect(meCallCount).toBe(1);
      expect(stateCallCount).toBe(1);

      global.fetch = originalFetch;
    });

    it('should store user, org, role, and onboardingStatus in session', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        const session = useSessionStore.getState().session;
        expect(session).not.toBeNull();
        expect(session?.user).toBeDefined();
        expect(session?.org).toBeDefined();
        expect(session?.role).toBeDefined();
        expect(session?.onboardingStatus).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error message on 401 unauthorized', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'invalid-token');
      server.use(errorHandlers.unauthorized);

      // Mock window.location
      delete (window as any).location;
      window.location = { href: '' } as any;

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
      });

      // Should clear token
      expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('should show friendly error message on network failure', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');
      server.use(errorHandlers.networkError);

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/trouble connecting/i)).toBeInTheDocument();
      });
    });

    it('should handle missing token cleanly', async () => {
      // No token in localStorage

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
      });
    });

    it('should provide retry button on error', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');
      server.use(errorHandlers.serverError);

      render(
        <SessionProvider>
          <div>Test Children</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('Redirect Logic - Non-Admin', () => {
    it('should allow non-admin to access app regardless of onboarding status', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      // Default handlers use role: 'owner' (non-admin)
      render(
        <SessionProvider>
          <div>App Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('App Content')).toBeInTheDocument();
      });

      // Should NOT redirect non-admin users
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Redirect Logic - Admin with Incomplete Onboarding', () => {
    it('should redirect admin to /onboarding if onboarding incomplete', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminIncompleteOnboardingHandlers);

      render(
        <SessionProvider>
          <div>App Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('Redirect Logic - Admin with Completed Onboarding', () => {
    it('should render App Shell for admin with completed onboarding', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminHandlers);

      render(
        <SessionProvider>
          <div>App Shell Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('App Shell Content')).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('should show loading state while session is being fetched', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      render(
        <SessionProvider>
          <div>App Content</div>
        </SessionProvider>
      );

      // Should show loading initially
      expect(screen.getByText(/loading session/i)).toBeInTheDocument();

      // Then show content
      await waitFor(() => {
        expect(screen.getByText('App Content')).toBeInTheDocument();
      });
    });
  });

  describe('No Session State', () => {
    it('should show "no active session" message when session is null and not loading', async () => {
      // Don't set a token, and make sure we're not in loading state
      useSessionStore.setState({
        session: null,
        isLoading: false,
        error: null,
      });

      render(
        <SessionProvider>
          <div>App Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
      });
    });
  });
});

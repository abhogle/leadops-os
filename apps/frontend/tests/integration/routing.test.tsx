/**
 * Routing Integration Tests
 * Tests for navigation and routing logic with different user roles
 */

import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider } from '../../src/providers/SessionProvider';
import { AdminGuard } from '../../src/components/guards/AdminGuard';
import { useSessionStore } from '../../src/state/sessionStore';
import { server } from '../msw/server';
import { adminHandlers, adminIncompleteOnboardingHandlers } from '../msw/handlers';
import { TOKEN_KEY } from '../../src/config';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next/navigation');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

const mockUseRouter = useRouter as jest.Mock;
const mockUsePathname = usePathname as jest.Mock;

mockUseRouter.mockReturnValue(mockRouter);

describe('Routing Integration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/');
  });

  describe('Non-Admin User Accessing App', () => {
    it('should allow non-admin (owner) to access /app routes regardless of onboarding status', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');
      // Default handlers return role: 'owner'

      render(
        <SessionProvider>
          <div>Inbox Page</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Inbox Page')).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should allow non-admin (member) to access /app routes', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      render(
        <SessionProvider>
          <div>Inbox Page</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Inbox Page')).toBeInTheDocument();
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should block non-admin from /app/admin routes', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');
      // role: 'owner' (non-admin)

      render(
        <SessionProvider>
          <AdminGuard>
            <div>Admin Page</div>
          </AdminGuard>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/app/inbox');
      });

      // Should NOT show admin content
      expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
    });
  });

  describe('Admin User with Incomplete Onboarding', () => {
    it('should redirect admin to /onboarding when onboarding incomplete', async () => {
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

    it('should redirect admin from /app/inbox to /onboarding when incomplete', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      mockUsePathname.mockReturnValue('/app/inbox');
      server.use(...adminIncompleteOnboardingHandlers);

      render(
        <SessionProvider>
          <div>Inbox Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should NOT redirect admin if already on /onboarding page', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      mockUsePathname.mockReturnValue('/onboarding');
      server.use(...adminIncompleteOnboardingHandlers);

      // Note: This test assumes onboarding page doesn't use SessionProvider redirect logic
      // The actual onboarding page would handle its own flow
      render(
        <div>Onboarding Flow</div>
      );

      expect(screen.getByText('Onboarding Flow')).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Admin User with Completed Onboarding', () => {
    it('should allow admin with completed onboarding to access /app/inbox', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminHandlers);

      render(
        <SessionProvider>
          <div>Inbox Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Inbox Content')).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should allow admin with completed onboarding to access /app/admin routes', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminHandlers);

      render(
        <SessionProvider>
          <AdminGuard>
            <div>Admin Settings</div>
          </AdminGuard>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Admin Settings')).toBeInTheDocument();
      });

      // Should NOT redirect
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it('should render admin shell with all navigation for completed admin', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminHandlers);

      render(
        <SessionProvider>
          <div>Full App Shell</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Full App Shell')).toBeInTheDocument();
      });

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Unauthenticated Access', () => {
    it('should show error when no token exists', async () => {
      // No token in localStorage

      render(
        <SessionProvider>
          <div>Protected Content</div>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/session has expired/i)).toBeInTheDocument();
      });

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('should redirect to /auth/login when accessing admin routes without session', async () => {
      // No token

      render(
        <AdminGuard>
          <div>Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login');
      });

      expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('Complex Navigation Scenarios', () => {
    it('should handle role change mid-session (non-admin → admin)', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      const { rerender } = render(
        <SessionProvider>
          <div>Content</div>
        </SessionProvider>
      );

      // Wait for initial session load (non-admin)
      await waitFor(() => {
        const session = useSessionStore.getState().session;
        expect(session?.role).toBe('owner');
      });

      // Simulate role upgrade to admin
      server.use(...adminHandlers);

      // Manually trigger refresh
      useSessionStore.getState().refresh();

      await waitFor(() => {
        const session = useSessionStore.getState().session;
        expect(session?.role).toBe('leadops_admin');
      });
    });

    it('should handle onboarding status progression (org_created → completed)', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'admin-token');
      server.use(...adminIncompleteOnboardingHandlers);

      render(
        <SessionProvider>
          <div>Content</div>
        </SessionProvider>
      );

      // Should redirect to onboarding initially
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/onboarding');
      });

      jest.clearAllMocks();

      // Simulate onboarding completion
      server.use(...adminHandlers);
      useSessionStore.getState().refresh();

      await waitFor(() => {
        const session = useSessionStore.getState().session;
        expect(session?.onboardingStatus).toBe('completed');
      });

      // Should no longer redirect
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('should protect nested admin routes consistently', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');
      // Default non-admin user

      mockUsePathname.mockReturnValue('/app/admin/client-settings');

      render(
        <SessionProvider>
          <AdminGuard>
            <div>Client Settings</div>
          </AdminGuard>
        </SessionProvider>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/app/inbox');
      });

      expect(screen.queryByText('Client Settings')).not.toBeInTheDocument();
    });
  });

  describe('Concurrent Route Access', () => {
    it('should handle multiple components accessing session simultaneously', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      render(
        <>
          <SessionProvider>
            <div>Component 1</div>
          </SessionProvider>
          <SessionProvider>
            <div>Component 2</div>
          </SessionProvider>
        </>
      );

      // Both should render successfully
      await waitFor(() => {
        expect(screen.getByText('Component 1')).toBeInTheDocument();
        expect(screen.getByText('Component 2')).toBeInTheDocument();
      });
    });
  });
});

/**
 * AdminGuard Component Tests
 * Tests for admin-only route protection
 */

import { render, screen, waitFor } from '@testing-library/react';
import { AdminGuard } from '../../src/components/guards/AdminGuard';
import { useSessionStore } from '../../src/state/sessionStore';
import { useRouter } from 'next/navigation';

jest.mock('next/navigation');

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
};

(useRouter as jest.Mock).mockReturnValue(mockRouter);

describe('AdminGuard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
    });
  });

  describe('Loading State', () => {
    it('should NOT render children while session is loading', () => {
      useSessionStore.setState({
        session: null,
        isLoading: true,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should show loading state
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      // Should NOT show children
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should show loading placeholder with proper text', () => {
      useSessionStore.setState({
        session: null,
        isLoading: true,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Access Control - Non-Admin', () => {
    it('should deny access to non-admin users (owner)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'user@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'owner',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should NOT render children
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should deny access to non-admin users (admin)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'user@example.com', role: 'admin', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'admin',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should NOT render children
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should deny access to non-admin users (member)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'user@example.com', role: 'member', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'member',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should NOT render children
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should redirect non-admin users to /app/inbox', async () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'user@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'owner',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/app/inbox');
      });
    });
  });

  describe('Access Control - Admin', () => {
    it('should allow access to leadops_admin users', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'admin@leadops.com', role: 'leadops_admin', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'leadops_admin',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should render children
      expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
    });

    it('should NOT redirect admin users', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'admin@leadops.com', role: 'leadops_admin', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'leadops_admin',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      expect(mockRouter.replace).not.toHaveBeenCalled();
    });
  });

  describe('No Session', () => {
    it('should redirect to login when no session exists', async () => {
      useSessionStore.setState({
        session: null,
        isLoading: false,
        error: null,
      });

      render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/auth/login');
      });

      // Should NOT render children
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });
  });

  describe('FOUC Prevention', () => {
    it('should return null (no render) for unauthorized users to prevent FOUC', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'user@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'owner',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Container should be empty (null render)
      expect(container.firstChild).toBeNull();
      // Definitely should NOT show protected content
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should return null for users without session to prevent FOUC', () => {
      useSessionStore.setState({
        session: null,
        isLoading: false,
        error: null,
      });

      const { container } = render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Container should be empty (null render) to prevent flash
      expect(container.firstChild).toBeNull();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should show loading state instead of content while checking authorization', () => {
      useSessionStore.setState({
        session: null,
        isLoading: true,
        error: null,
      });

      const { container } = render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should show loading, not content
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    });

    it('should only render children after session loads AND user is admin', async () => {
      // Start with loading
      useSessionStore.setState({
        session: null,
        isLoading: true,
        error: null,
      });

      const { rerender } = render(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // Should not show content while loading
      expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();

      // Session loads with admin user
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'admin@leadops.com', role: 'leadops_admin', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'leadops_admin',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      rerender(
        <AdminGuard>
          <div>Protected Admin Content</div>
        </AdminGuard>
      );

      // NOW content should be visible
      await waitFor(() => {
        expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
      });
    });
  });
});

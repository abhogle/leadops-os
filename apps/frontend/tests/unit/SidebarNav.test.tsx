/**
 * SidebarNav Component Tests
 * Tests for navigation sidebar with role-based access
 */

import { render, screen } from '@testing-library/react';
import { SidebarNav } from '../../src/components/navigation/SidebarNav';
import { useSessionStore } from '../../src/state/sessionStore';
import { usePathname } from 'next/navigation';

jest.mock('next/navigation');

const mockUsePathname = usePathname as jest.Mock;

describe('SidebarNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/app/inbox');
  });

  describe('Navigation Items Rendering', () => {
    it('should render all shared nav items for any logged-in user', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'owner',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(<SidebarNav />);

      // Should show all main nav items
      expect(screen.getByText('Inbox')).toBeInTheDocument();
      expect(screen.getByText('Workflows')).toBeInTheDocument();
      expect(screen.getByText('Prompts')).toBeInTheDocument();
      expect(screen.getByText('Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Connectors')).toBeInTheDocument();
    });

    it('should hide Admin nav item for non-admin roles (owner)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'owner',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(<SidebarNav />);

      // Admin link should NOT be visible
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should hide Admin nav item for non-admin roles (admin)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'test@example.com', role: 'admin', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'admin',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(<SidebarNav />);

      // Admin link should NOT be visible for regular admin role
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should hide Admin nav item for non-admin roles (member)', () => {
      useSessionStore.setState({
        session: {
          user: { id: 'usr_1', email: 'test@example.com', role: 'member', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
          role: 'member',
          onboardingStatus: 'completed',
          featureFlags: {},
        },
        isLoading: false,
        error: null,
      });

      render(<SidebarNav />);

      // Admin link should NOT be visible
      expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    });

    it('should show Admin nav item for leadops_admin role', () => {
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

      render(<SidebarNav />);

      // Admin link SHOULD be visible
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('Active State', () => {
    beforeEach(() => {
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
    });

    it('should show correct active state for /app/inbox', () => {
      mockUsePathname.mockReturnValue('/app/inbox');

      const { container } = render(<SidebarNav />);

      const inboxLink = screen.getByText('Inbox').closest('a');
      expect(inboxLink).toHaveStyle({ fontWeight: 600 });
    });

    it('should show correct active state for /app/workflows', () => {
      mockUsePathname.mockReturnValue('/app/workflows');

      const { container } = render(<SidebarNav />);

      const workflowsLink = screen.getByText('Workflows').closest('a');
      expect(workflowsLink).toHaveStyle({ fontWeight: 600 });
    });

    it('should show correct active state for /app/admin', () => {
      mockUsePathname.mockReturnValue('/app/admin');

      const { container } = render(<SidebarNav />);

      const adminLink = screen.getByText('Admin').closest('a');
      expect(adminLink).toHaveStyle({ fontWeight: 600 });
    });

    it('should show correct active state for nested admin routes', () => {
      mockUsePathname.mockReturnValue('/app/admin/client-settings');

      const { container } = render(<SidebarNav />);

      const adminLink = screen.getByText('Admin').closest('a');
      expect(adminLink).toHaveStyle({ fontWeight: 600 });
    });

    it('should not have active state when on different route', () => {
      mockUsePathname.mockReturnValue('/app/inbox');

      const { container } = render(<SidebarNav />);

      const workflowsLink = screen.getByText('Workflows').closest('a');
      expect(workflowsLink).toHaveStyle({ fontWeight: 400 });
    });
  });

  describe('Navigation Links', () => {
    beforeEach(() => {
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
    });

    it('should have correct href for each nav item', () => {
      render(<SidebarNav />);

      expect(screen.getByText('Inbox').closest('a')).toHaveAttribute('href', '/app/inbox');
      expect(screen.getByText('Workflows').closest('a')).toHaveAttribute('href', '/app/workflows');
      expect(screen.getByText('Prompts').closest('a')).toHaveAttribute('href', '/app/prompts');
      expect(screen.getByText('Intelligence').closest('a')).toHaveAttribute('href', '/app/intelligence');
      expect(screen.getByText('Connectors').closest('a')).toHaveAttribute('href', '/app/connectors');
      expect(screen.getByText('Admin').closest('a')).toHaveAttribute('href', '/app/admin');
    });
  });
});

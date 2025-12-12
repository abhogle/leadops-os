/**
 * AppShellLayout Component Tests
 * Tests for the main application layout structure
 */

import { render, screen } from '@testing-library/react';
import { AppShellLayout } from '../../src/components/layout/AppShellLayout';
import { useSessionStore } from '../../src/state/sessionStore';

// Mock the navigation components
jest.mock('../../src/components/navigation/SidebarNav', () => ({
  SidebarNav: () => <div data-testid="sidebar-nav">SidebarNav</div>,
}));

jest.mock('../../src/components/navigation/TopBar', () => ({
  TopBar: () => <div data-testid="top-bar">TopBar</div>,
}));

describe('AppShellLayout', () => {
  beforeEach(() => {
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
    });
  });

  describe('Successful Session Load', () => {
    it('should render sidebar + topbar + children after session loads', () => {
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

      render(
        <AppShellLayout>
          <div>Main Content</div>
        </AppShellLayout>
      );

      // Should render all components
      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument();
      expect(screen.getByTestId('top-bar')).toBeInTheDocument();
      expect(screen.getByText('Main Content')).toBeInTheDocument();
    });

    it('should render children in the main content area', () => {
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

      render(
        <AppShellLayout>
          <div data-testid="test-content">Test Page Content</div>
        </AppShellLayout>
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Page Content')).toBeInTheDocument();
    });

    it('should render correctly for admin users', () => {
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
        <AppShellLayout>
          <div>Admin Content</div>
        </AppShellLayout>
      );

      expect(screen.getByTestId('sidebar-nav')).toBeInTheDocument();
      expect(screen.getByTestId('top-bar')).toBeInTheDocument();
      expect(screen.getByText('Admin Content')).toBeInTheDocument();
    });
  });

  describe('Layout Structure', () => {
    it('should have proper layout structure with sidebar and main area', () => {
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

      const { container } = render(
        <AppShellLayout>
          <div>Content</div>
        </AppShellLayout>
      );

      // Check that container has flexbox layout
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveStyle({ display: 'flex' });
    });
  });

  describe('Multiple Children', () => {
    it('should render multiple children correctly', () => {
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

      render(
        <AppShellLayout>
          <div>First Child</div>
          <div>Second Child</div>
          <div>Third Child</div>
        </AppShellLayout>
      );

      expect(screen.getByText('First Child')).toBeInTheDocument();
      expect(screen.getByText('Second Child')).toBeInTheDocument();
      expect(screen.getByText('Third Child')).toBeInTheDocument();
    });
  });
});

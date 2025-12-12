/**
 * sessionStore Unit Tests
 * Tests for Zustand session state management
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useSessionStore } from '../../src/state/sessionStore';
import { server } from '../msw/server';
import { http, HttpResponse } from 'msw';
import { TOKEN_KEY } from '../../src/config';

describe('sessionStore', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    window.localStorage.clear();
    // Reset store state
    useSessionStore.setState({
      session: null,
      isLoading: false,
      error: null,
    });
  });

  describe('initialize()', () => {
    it('should be idempotent - only execute once even if called multiple times', async () => {
      // Set up a valid token
      window.localStorage.setItem(TOKEN_KEY, 'valid-token');

      let fetchCount = 0;
      server.use(
        http.get('http://localhost:3000/me', () => {
          fetchCount++;
          return HttpResponse.json({
            user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            tokenClaims: { sub: 'usr_1', org: 'org_1', role: 'owner' },
            onboardingStatus: 'completed',
          });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      // Call initialize multiple times in parallel
      await act(async () => {
        await Promise.all([
          result.current.initialize(),
          result.current.initialize(),
          result.current.initialize(),
        ]);
      });

      // Should only have made ONE request
      expect(fetchCount).toBe(1);
      expect(result.current.session).not.toBeNull();
    });

    it('should not re-initialize if session already exists', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'valid-token');

      let fetchCount = 0;
      server.use(
        http.get('http://localhost:3000/me', () => {
          fetchCount++;
          return HttpResponse.json({
            user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            tokenClaims: { sub: 'usr_1', org: 'org_1', role: 'owner' },
            onboardingStatus: 'completed',
          });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      // First initialization
      await act(async () => {
        await result.current.initialize();
      });

      expect(fetchCount).toBe(1);

      // Second initialization - should not fetch again
      await act(async () => {
        await result.current.initialize();
      });

      expect(fetchCount).toBe(1); // Still only 1 fetch
    });

    it('should handle missing token gracefully', async () => {
      // No token in localStorage
      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('Your session has expired. Please log in again.');
    });

    it('should handle empty token string', async () => {
      window.localStorage.setItem(TOKEN_KEY, '   '); // Whitespace only

      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.initialize();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.error).toBe('Your session has expired. Please log in again.');
    });
  });

  describe('Error Mapping', () => {
    beforeEach(() => {
      window.localStorage.setItem(TOKEN_KEY, 'valid-token');
    });

    it('should map 401 errors to user-friendly message', async () => {
      server.use(
        http.get('http://localhost:3000/me', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Your session has expired. Please log in again.');
      });
    });

    it('should map network errors to user-friendly message', async () => {
      server.use(
        http.get('http://localhost:3000/me', () => {
          return HttpResponse.error();
        })
      );

      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        expect(result.current.error).toContain('trouble connecting');
      });
    });

    it('should handle 401 by clearing token', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'expired-token');

      server.use(
        http.get('http://localhost:3000/me', () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      await act(async () => {
        await result.current.initialize();
      });

      await waitFor(() => {
        // Token should be cleared on 401
        expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
        // Error should be set
        expect(result.current.error).toBe('Your session has expired. Please log in again.');
      });
    });
  });

  describe('refresh()', () => {
    it('should not refresh if already loading', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'valid-token');

      let fetchCount = 0;
      server.use(
        http.get('http://localhost:3000/me', async () => {
          fetchCount++;
          // Simulate slow response
          await new Promise((resolve) => setTimeout(resolve, 100));
          return HttpResponse.json({
            user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            tokenClaims: { sub: 'usr_1', org: 'org_1', role: 'owner' },
            onboardingStatus: 'completed',
          });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      // Manually set loading state
      act(() => {
        useSessionStore.setState({ isLoading: true });
      });

      // Try to refresh - should be ignored
      await act(async () => {
        await result.current.refresh();
      });

      expect(fetchCount).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear session and remove token from localStorage', () => {
      window.localStorage.setItem(TOKEN_KEY, 'test-token');

      const { result } = renderHook(() => useSessionStore());

      // Set a mock session
      act(() => {
        useSessionStore.setState({
          session: {
            user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            role: 'owner',
            onboardingStatus: 'completed',
            featureFlags: {},
          },
        });
      });

      // Clear session
      act(() => {
        result.current.clear();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  describe('Parallel Request Deduplication', () => {
    it('should deduplicate concurrent fetch requests', async () => {
      window.localStorage.setItem(TOKEN_KEY, 'valid-token');

      let meCallCount = 0;
      let stateCallCount = 0;

      server.use(
        http.get('http://localhost:3000/me', () => {
          meCallCount++;
          return HttpResponse.json({
            user: { id: 'usr_1', email: 'test@example.com', role: 'owner', orgId: 'org_1', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            tokenClaims: { sub: 'usr_1', org: 'org_1', role: 'owner' },
            onboardingStatus: 'completed',
          });
        }),
        http.get('http://localhost:3000/onboarding/state', () => {
          stateCallCount++;
          return HttpResponse.json({
            org: { id: 'org_1', name: 'Test Org', createdAt: '2024-01-01', updatedAt: '2024-01-01' },
            onboardingStatus: 'completed',
            config: {
              leadFields: [],
              workflows: [],
              settings: {},
            },
          });
        })
      );

      const { result } = renderHook(() => useSessionStore());

      // Call initialize 5 times concurrently
      await act(async () => {
        await Promise.all([
          result.current.initialize(),
          result.current.initialize(),
          result.current.initialize(),
          result.current.initialize(),
          result.current.initialize(),
        ]);
      });

      // Should only make ONE call to each endpoint
      expect(meCallCount).toBe(1);
      expect(stateCallCount).toBe(1);
    });
  });
});

/**
 * MSW Request Handlers
 * Mock API responses for testing
 */

import { http, HttpResponse } from 'msw';
import type { User, Org, TokenClaims, OnboardingStatus, OrgConfig } from '@leadops/types';

const API_BASE_URL = 'http://localhost:3000';

// Mock data factories
export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'usr_test123',
  orgId: 'org_test123',
  email: 'test@example.com',
  role: 'owner',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockOrg = (overrides?: Partial<Org>): Org => ({
  id: 'org_test123',
  name: 'Test Organization',
  industry: 'dental',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockTokenClaims = (overrides?: Partial<TokenClaims>): TokenClaims => ({
  sub: 'usr_test123',
  org: 'org_test123',
  role: 'owner',
  ...overrides,
});

export const createMockOrgConfig = (overrides?: Partial<OrgConfig>): OrgConfig => ({
  leadFields: [
    { key: 'firstName', label: 'First Name', type: 'string', required: true },
    { key: 'lastName', label: 'Last Name', type: 'string', required: true },
  ],
  workflows: [],
  settings: {},
  vertical: {
    id: 'dental',
    industry: 'dental',
  },
  ...overrides,
});

// Default handlers
export const handlers = [
  // GET /me - Returns user session data
  http.get(`${API_BASE_URL}/me`, () => {
    const user = createMockUser();
    const org = createMockOrg();
    const tokenClaims = createMockTokenClaims();

    return HttpResponse.json({
      user,
      org,
      tokenClaims,
      onboardingStatus: 'completed' as OnboardingStatus,
    });
  }),

  // GET /onboarding/state - Returns onboarding configuration
  http.get(`${API_BASE_URL}/onboarding/state`, () => {
    const user = createMockUser();
    const org = createMockOrg();
    const config = createMockOrgConfig();

    return HttpResponse.json({
      user,
      org,
      onboardingStatus: 'completed' as OnboardingStatus,
      config,
    });
  }),

  // GET /onboarding/available-industries
  http.get(`${API_BASE_URL}/onboarding/available-industries`, () => {
    return HttpResponse.json({
      industries: ['dental', 'insurance', 'real-estate'],
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  unauthorized: http.get(`${API_BASE_URL}/me`, () => {
    return new HttpResponse(null, {
      status: 401,
      statusText: 'Unauthorized',
    });
  }),

  networkError: http.get(`${API_BASE_URL}/me`, () => {
    return HttpResponse.error();
  }),

  serverError: http.get(`${API_BASE_URL}/me`, () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }),
};

// Role-specific handlers
export const adminHandlers = [
  http.get(`${API_BASE_URL}/me`, () => {
    const user = createMockUser({ role: 'leadops_admin' });
    const org = createMockOrg();
    const tokenClaims = createMockTokenClaims({ role: 'leadops_admin' });

    return HttpResponse.json({
      user,
      org,
      tokenClaims,
      onboardingStatus: 'completed' as OnboardingStatus,
    });
  }),
];

export const adminIncompleteOnboardingHandlers = [
  http.get(`${API_BASE_URL}/me`, () => {
    const user = createMockUser({ role: 'leadops_admin' });
    const org = createMockOrg();
    const tokenClaims = createMockTokenClaims({ role: 'leadops_admin' });

    return HttpResponse.json({
      user,
      org,
      tokenClaims,
      onboardingStatus: 'org_created' as OnboardingStatus,
    });
  }),

  http.get(`${API_BASE_URL}/onboarding/state`, () => {
    const user = createMockUser({ role: 'leadops_admin' });
    const org = createMockOrg();
    const config = createMockOrgConfig();

    return HttpResponse.json({
      user,
      org,
      onboardingStatus: 'org_created' as OnboardingStatus,
      config,
    });
  }),
];

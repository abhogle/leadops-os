# LeadOps Frontend

Next.js 14 application for the LeadOps platform.

## Development

```bash
# Install dependencies (from monorepo root)
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

The development server runs on [http://localhost:3001](http://localhost:3001).

## Testing

### Unit & Integration Tests (Jest + React Testing Library)

Run all unit and integration tests:

```bash
pnpm test
```

Run tests in watch mode:

```bash
pnpm test:watch
```

Run tests with coverage:

```bash
pnpm test:coverage
```

#### Test Structure

- `/tests/unit/` - Unit tests for individual components and stores
- `/tests/integration/` - Integration tests for component interactions and routing
- `/tests/msw/` - Mock Service Worker configuration and handlers
- `/tests/setupTests.ts` - Global test setup (runs before all tests)
- `/tests/jestPolyfills.ts` - Polyfills for jsdom environment

#### Writing Tests

Tests use Jest and React Testing Library. Example:

```typescript
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### Mocking API Requests

API requests are mocked using MSW (Mock Service Worker). Add handlers in `/tests/msw/handlers.ts`:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/endpoint', () => {
    return HttpResponse.json({ data: 'mock data' });
  }),
];
```

### E2E Tests (Playwright)

Run end-to-end tests:

```bash
pnpm test:e2e
```

Run E2E tests with UI:

```bash
pnpm test:e2e:ui
```

Debug E2E tests:

```bash
pnpm test:e2e:debug
```

#### E2E Test Structure

- `/tests-e2e/` - Playwright E2E tests
- `playwright.config.ts` - Playwright configuration

#### Writing E2E Tests

E2E tests use Playwright. Example:

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to inbox', async ({ page }) => {
  await page.goto('/app/inbox');
  await expect(page.getByRole('heading', { name: /inbox/i })).toBeVisible();
});
```

**Note:** Most E2E tests are currently skipped as they require full authentication and onboarding systems to be implemented. Un-skip tests as features become available.

### Continuous Integration

All tests run automatically on:
- Pull requests to `main`/`master`
- Pushes to `main`/`master`

The CI pipeline (`frontend-tests.yml`) runs:
1. Unit & integration tests (Jest)
2. E2E tests (Playwright)
3. Linting & type checking

See `.github/workflows/frontend-tests.yml` for details.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **State Management:** Zustand
- **Testing:** Jest, React Testing Library, Playwright, MSW
- **TypeScript:** Strict mode enabled

## Project Structure

```
apps/frontend/
├── app/                    # Next.js App Router pages
├── src/
│   ├── components/         # React components
│   │   ├── guards/        # Route guards (AdminGuard, etc.)
│   │   ├── layout/        # Layout components
│   │   └── navigation/    # Navigation components
│   ├── providers/         # React context providers
│   ├── state/             # Zustand stores
│   └── config.ts          # App configuration
├── tests/                 # Unit & integration tests
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── msw/              # MSW mocks
│   ├── setupTests.ts     # Test setup
│   └── jestPolyfills.ts  # Polyfills
├── tests-e2e/            # E2E tests
└── playwright.config.ts  # Playwright config
```

## Architecture

### State Management

Global state is managed with Zustand. See `/src/state/sessionStore.ts` for the session management store.

### Routing & Guards

- **AdminGuard:** Protects `/app/admin/*` routes (requires `leadops_admin` role)
- **SessionProvider:** Handles session initialization and onboarding redirects

### Session Flow

1. User loads app
2. `SessionProvider` fetches session data from `/me` and `/onboarding/state`
3. If admin with incomplete onboarding → redirect to `/onboarding`
4. If session valid → render app shell
5. If session invalid → show error/login prompt

## Contributing

When adding new features:

1. Write unit tests for components/stores
2. Write integration tests for complex flows
3. Add E2E tests for critical user journeys
4. Ensure all tests pass before creating PR
5. Maintain test coverage above 80%

## License

Proprietary - All rights reserved

# LeadOps OS API

Backend API for LeadOps OS - Lead Intelligence & Automation Platform.

## Environment Configuration

### Required Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: Secret key for JWT token signing and verification

### AUTH_SECRET Security

**Important**: The API will fail to start in non-development environments if `AUTH_SECRET` is set to the default placeholder value `"change-this-secret-before-production"`.

To generate a secure secret:

```bash
# Generate a random 32-byte secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Add the generated secret to your `.env` file:

```
AUTH_SECRET="your-generated-secret-here"
```

## Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:push

# Start development server
pnpm dev
```

## Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build for production
- `pnpm start` - Start production server

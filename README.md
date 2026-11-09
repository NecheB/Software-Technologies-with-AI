# Borough

A multi-page neighbourhood business directory built for the Software Technologies with AI capstone. Visitors discover approved local businesses, reviews, photos, documents and community conversations. Members submit listings and contributions; staff review content; administrators manage roles, restrictions and settings.

**Live website:** https://borough-necheb.netlify.app

**Status:** Supabase database installed and public REST access verified. The deployed pages return HTTP 200. Live account, email, role, file-transfer and browser acceptance checks are still pending; the three-development-day requirement remains unmet.

## Run locally

Requires Node.js 22.12 or newer and npm.

```sh
npm ci
```

Copy `.env.example` to `.env` and fill in the Supabase project URL and publishable key. Never use a secret or service-role key in a `VITE_` variable.

```sh
npm run dev
npm test
npm run build
npm run preview
```

Without configuration, the screens show an explicit connection message. No fake accounts or local database substitutes are used by the app.

## Database setup

Read [SETUP.md](docs/SETUP.md). The canonical SQL lives in `supabase/migrations/`. `npm run db:prepare` produces `supabase/INSTALL.sql` for a one-time installation through the SQL Editor in a new, empty Supabase project. It records the applied migration history. Do not run the installer twice or use it against an existing application database.

## Architecture and folders

The browser loads separate HTML entry points built by Vite. Plain JavaScript modules use Supabase Auth, the PostgREST API and private Storage. PostgreSQL row-level security is the authorization boundary. UI visibility is only a convenience.

| Folder                | Purpose                                                               |
| --------------------- | --------------------------------------------------------------------- |
| Root HTML files       | 17 independently navigable screens                                    |
| `src/pages`           | Page-specific behavior                                                |
| `src/components`      | Navigation, forms and staff access helpers                            |
| `src/services`        | Supabase client, sessions and file operations                         |
| `src/utils`           | HTML escaping and safe links                                          |
| `src/styles`          | Responsive visual system                                              |
| `supabase/migrations` | Ordered schema and policy changes                                     |
| `tests`               | Real PostgreSQL-engine migration and authorization tests using PGlite |
| `docs`                | Requirements, architecture, setup and development evidence            |

See [architecture](docs/ARCHITECTURE.md), [acceptance checklist](docs/ACCEPTANCE.md), [AI development log](docs/AI-LOG.md) and [implementation plan](docs/IMPLEMENTATION-PLAN.md).

## Verification limits

Local tests exercise SQL through a PostgreSQL-compatible engine with simulated Supabase roles and schemas. They do not replace live JWT, email delivery, Storage service or browser testing. The assignment requires at least 15 commits across three separate days: the count has been reached, but three genuine development dates have not yet been established. Commit dates are never fabricated.

The original assignment document is intentionally excluded from this public repository. Existing repository licensing is retained in `LICENSE`.

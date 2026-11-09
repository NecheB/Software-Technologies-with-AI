# Setup and release

## Supabase

1. Create a Supabase project. This repository is being configured for project `fnddptmmjpzxfsylcbrr`.
2. Run `npm run db:prepare` locally. Open `supabase/INSTALL.sql`, copy its entire contents, paste into a new Supabase SQL Editor query and run once. The transaction installs tables, policies, functions, a private bucket, categories and migration history together. An error rolls back the installation; report the error before retrying.
3. Copy the project URL and publishable key to `.env`, using `.env.example` as the template. `.env` is ignored by Git.
4. In Supabase Authentication URL configuration, set the final website URL and allow the local and deployed `/reset.html` callback addresses. Test confirmation email and password recovery with an inbox you control.
5. Register a real account through the app and confirm its email. A project administrator then promotes the intended staff account using the SQL Editor:

```sql
update public.user_roles
set role = 'admin'
where user_id = (select id from auth.users where email = 'YOUR_ADMIN_EMAIL');
```

Replace the placeholder with the intended account. Never allow public registration to choose administrator privileges.

## Migration workflow

The ordered files in `supabase/migrations` are the source of truth. Add future changes as new migrations rather than editing applied migrations. After authenticating the Supabase CLI locally, link the project, inspect migration history and push only pending migrations. Keep a record that remote versions match local filenames before submission.

Official references: [migration deployment](https://supabase.com/docs/guides/deployment/database-migrations) and [publishable keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Current deployment

The site is live at https://borough-necheb.netlify.app. Netlify site ID: `5c9e1e53-4f07-40a4-9c0c-654ea6c5c687`. The current deploy was uploaded from the local production build. Automatic Git deployment has not been connected. Preserve the local `.env` for future builds, or set the two build variables in Netlify before enabling automated deployment. The connector could not save them (HTTP 403); no successful remote setting is claimed.

## Hosting

Build with the two `VITE_SUPABASE_*` environment variables set. Publish `dist`. This is a multi-page application: do not add an SPA fallback that serves `index.html` for missing HTML pages. The app currently uses root-relative URLs, so host it at a domain root rather than a repository subpath.

## Test accounts

Create dedicated normal, owner, moderator and admin accounts in the actual project. Record the tester credentials privately for the assessor. Do not reuse a personal password or put an administrator password into the public repository. No test accounts have been created yet.

## Required live acceptance

Register and confirm an email, sign in/out, recover a password, save a profile, submit/edit/delete a listing, approve it as staff, search as a visitor, upload and download a photo and PDF, and verify that another member cannot edit the listing or read pending files. Test moderator permission removal, temporary and permanent restrictions, and audit entries. Repeat navigation at narrow mobile width and on the final public domain.

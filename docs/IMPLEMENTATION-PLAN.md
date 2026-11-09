# Borough implementation plan

Source: Soft-Tech-with-AI-Capstone-Project.docx, reviewed 9 November 2026. The original assignment remains outside the public repository because its footer prohibits copying without permission.

## Mandatory course requirements

| Requirement                                                     | Implementation and acceptance evidence                                                                                                                                                              |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HTML, CSS, JavaScript, Bootstrap; no UI framework or TypeScript | Vite multi-page HTML entry points, JavaScript modules, Bootstrap and custom CSS                                                                                                                     |
| Node, npm, Vite                                                 | package.json scripts, lockfile, production build                                                                                                                                                    |
| Client/server REST architecture                                 | Supabase JS client communicating with hosted Supabase Auth, PostgREST and Storage                                                                                                                   |
| Separate screens; at least five                                 | Home, directory, business detail, sign in, register, reset password, account, owner dashboard, business editor, community, topic, advertising, moderation, users, taxonomy, settings, audit history |
| Modular structure                                               | pages, components, services, utils, styles                                                                                                                                                          |
| AI agent instructions                                           | .github/copilot-instructions.md                                                                                                                                                                     |
| Supabase DB, Auth, JWT, RLS                                     | SQL migrations, real authentication; no local fake auth                                                                                                                                             |
| Normal/admin roles and user_roles                               | user, owner, moderator, admin; database permission evaluation                                                                                                                                       |
| At least four related tables                                    | profiles, user_roles, role_permissions, restrictions, categories, businesses, business_files, reviews, topics, posts, advertisements, audit_log, settings                                           |
| Normalization, indexing, relationships                          | FK constraints, checks and lookup indexes in migrations                                                                                                                                             |
| Migration history committed and synced                          | supabase/migrations; remote verification pending connection                                                                                                                                         |
| File upload and download                                        | Private Supabase bucket, scoped object policies, signed downloads                                                                                                                                   |
| Live public deployment                                          | Production build and public host; verify configured backend                                                                                                                                         |
| Sample credentials                                              | Create real test accounts after Supabase connection; document test access                                                                                                                           |
| Public GitHub repo; push successful changes                     | New repository; incremental meaningful commits and pushes                                                                                                                                           |
| At least 15 commits on at least three days                      | Real development history; never backdate. Three-day requirement remains pending until actual work on three dates                                                                                    |
| Documentation                                                   | README, architecture diagram, setup, security model, acceptance checklist, AI log                                                                                                                   |
| AI assisted prompt/implement/test/refine loop                   | Real AI development log and tested incremental commits                                                                                                                                              |

## Additional requested functionality

- Search by keyword, category/subcategory, location, price and rating; sorting and pagination.
- Owner-managed listings, contact details, website, opening hours, amenities, photographs and downloadable documents.
- Profiles and four roles; moderator permission configuration; admin-only role and system control.
- Review queues for listings, reviews, topics, posts and advertisements. Owners' edits return content to pending.
- Temporary suspensions, permanent bans and expiring permission restrictions, enforced in the database.
- Moderator edits to user profiles and business details, with protected administrator accounts.
- Categories and subcategories, community topics/replies, owner advertisements, platform settings.
- Append-only moderation/action history written by database triggers.
- Responsive editorial visual identity, accessible labels, keyboard controls, loading/error/empty states.

## Delivery sequence

1. Requirements, architecture, repository foundations.
2. Normalized schema and indexes.
3. Database roles, restrictions, RLS and safe moderation functions.
4. Storage access and audit trail.
5. Vite multi-page shell and visual system.
6. Auth and account management.
7. Directory search and business detail.
8. Owner CRUD and file management.
9. Community, reviews and advertisements.
10. Moderator queue, users, categories, settings and history.
11. Automated validation and security checks; refine observed defects.
12. Connect real Supabase, apply migrations, create test accounts and verify access by role.
13. Create/push GitHub repository and deploy publicly.
14. Browser acceptance testing, documentation and handoff.
15. Continue genuine development/verification on two additional days to meet the date requirement.

## Completion gate

Do not label the application production-ready before migrations, live role/security tests, uploads/downloads, browser flows and deployment pass. Track connection-dependent requirements explicitly. No invented credentials, fake success messages or fabricated commit dates.

# Assignment acceptance checklist

Reviewed directly against the supplied Word assignment on 9 November 2026. Implemented means source code exists; verified live means the deployed service has actually passed the check.

| Requirement                                               | Evidence                                       | Status                                          |
| --------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------- |
| HTML, CSS, JavaScript, Bootstrap; no React/Vue/TypeScript | Source and package manifest                    | Implemented                                     |
| Node, npm, Vite                                           | Lockfile, scripts, multi-page build            | Local build passed                              |
| Client/server REST architecture                           | Supabase client and PostgreSQL policies        | Implemented; live backend pending               |
| Modular design                                            | pages/components/services/utils/styles         | Implemented                                     |
| Agent instructions                                        | `.github/copilot-instructions.md`              | Present                                         |
| At least five distinct screens                            | 17 HTML entry points                           | Build passed; browser QA pending                |
| Responsive styling and visual cues                        | Bootstrap grid, custom styles and focus states | Implemented; visual QA pending                  |
| Supabase database, Auth and Storage                       | Client plus migrations and private bucket      | Installed; public REST checks passed            |
| Registration, login, logout, JWT                          | Auth and session modules                       | Live acceptance pending                         |
| Normal/admin roles and admin panel                        | user_roles, role_permissions, staff pages      | SQL tests passed; live acceptance pending       |
| RLS server-side authorization                             | Policies, guard functions and restrictions     | SQL tests passed                                |
| At least four related normalized tables                   | 14 application tables and indexes              | SQL migration tests passed                      |
| Migration history local and remote                        | Canonical migrations and installer records     | Installer completed; migration history recorded |
| Upload and download user files                            | Owner editor and signed public downloads       | SQL access tests passed; live transfer pending  |
| Public Internet deployment                                | Production bundle ready                        | Pending                                         |
| Sample login credentials                                  | Dedicated accounts must be created             | Pending                                         |
| Public GitHub repository                                  | NecheB/Software-Technologies-with-AI           | Published                                       |
| At least 15 commits                                       | Real feature commits pushed to main            | Met                                             |
| Commits on at least 3 days                                | Genuine development dates only                 | Not met                                         |
| Description, architecture, DB diagram, setup and folders  | README and docs                                | Present                                         |
| AI prompt/implement/test/refine history                   | AI-LOG and Git history                         | Recorded                                        |

No claim of full completion should be made while live checks or the three-day requirement remain outstanding.

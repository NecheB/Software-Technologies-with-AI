-- Borough's canonical schema. Apply through Supabase migrations.
create type public.app_role as enum ('user','owner','moderator','admin');
create type public.content_status as enum ('pending','approved','rejected','archived');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '' check(length(full_name)<=100),
 bio text not null default '' check(length(bio)<=2000),
 phone text not null default '' check(length(phone)<=40),
 city text not null default '' check(length(city)<=100),
 created_at timestamptz not null default now()
);
create table public.user_roles (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 role public.app_role not null default 'user'
);
create table public.role_permissions (
 role public.app_role not null,
 permission text not null check(permission in ('listings.manage','content.manage','users.manage','categories.manage','audit.read')),
 primary key(role,permission)
);
insert into public.role_permissions values ('moderator','listings.manage'),('moderator','content.manage'),('moderator','users.manage'),('moderator','categories.manage'),('moderator','audit.read');
create table public.restrictions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 permission text not null check(permission in ('all','listings.write','content.write','files.write','profile.write','ads.write')),
 reason text not null check(length(reason) between 3 and 1000),
 expires_at timestamptz,
 created_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(),
 revoked_at timestamptz
);
create table public.categories (
 id uuid primary key default gen_random_uuid(),
 parent_id uuid references public.categories(id) on delete restrict,
 name text not null unique check(length(name) between 2 and 80),
 icon text not null default 'shop' check(icon ~ '^[a-z0-9-]+$'),
 check(parent_id is distinct from id)
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 category_id uuid not null references public.categories(id) on delete restrict,
 name text not null check(length(name) between 2 and 120),
 tagline text not null default '' check(length(tagline)<=180),
 description text not null check(length(description) between 30 and 10000),
 email text not null check(length(email)<=254),
 phone text not null default '' check(length(phone)<=40),
 website text not null default '' check(website='' or website ~ '^https?://'),
 address text not null check(length(address) between 3 and 300),
 city text not null check(length(city) between 2 and 100),
 postcode text not null default '' check(length(postcode)<=20),
 price_level smallint not null default 2 check(price_level between 1 and 4),
 opening_hours text not null default '' check(length(opening_hours)<=2000),
 amenities text[] not null default '{}' check(cardinality(amenities)<=20),
 status public.content_status not null default 'pending',
 moderation_note text not null default '' check(length(moderation_note)<=1000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 search_vector tsvector generated always as (to_tsvector('english',name || ' ' || tagline || ' ' || description || ' ' || city)) stored
);
create table public.business_files (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 uploaded_by uuid not null references public.profiles(id),
 path text not null unique,
 name text not null check(length(name)<=200),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 created_at timestamptz not null default now()
);
create table public.reviews (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 rating smallint not null check(rating between 1 and 5),
 body text not null check(length(body) between 10 and 3000),
 status public.content_status not null default 'pending',
 moderation_note text not null default '' check(length(moderation_note)<=1000),
 created_at timestamptz not null default now(),
 unique(business_id,author_id)
);
create table public.topics (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(title) between 5 and 180),
 body text not null check(length(body) between 10 and 10000),
 status public.content_status not null default 'pending',
 moderation_note text not null default '' check(length(moderation_note)<=1000),
 created_at timestamptz not null default now()
);
create table public.posts (
 id uuid primary key default gen_random_uuid(),
 topic_id uuid not null references public.topics(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body) between 2 and 5000),
 status public.content_status not null default 'pending',
 moderation_note text not null default '' check(length(moderation_note)<=1000),
 created_at timestamptz not null default now()
);
create table public.advertisements (
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete cascade,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(length(title) between 5 and 100),
 body text not null check(length(body) between 10 and 1000),
 starts_at timestamptz not null default now(),
 ends_at timestamptz not null,
 status public.content_status not null default 'pending',
 moderation_note text not null default '' check(length(moderation_note)<=1000),
 created_at timestamptz not null default now(),
 check(ends_at>starts_at)
);
create table public.settings (
 id boolean primary key default true check(id),
 site_name text not null default 'Borough' check(length(site_name) between 2 and 60),
 announcement text not null default '' check(length(announcement)<=300),
 submissions_open boolean not null default true
);
insert into public.settings(id) values(true);
create table public.audit_log (
 id bigint generated always as identity primary key,
 actor_id uuid,
 action text not null,
 entity_type text not null,
 entity_id text not null,
 details jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create index businesses_search_idx on public.businesses using gin(search_vector);
create index businesses_directory_idx on public.businesses(status,category_id,city,created_at desc);
create index businesses_owner_idx on public.businesses(owner_id);
create index categories_parent_idx on public.categories(parent_id);
create index restrictions_user_idx on public.restrictions(user_id,permission,expires_at) where revoked_at is null;
create index files_business_idx on public.business_files(business_id);
create index reviews_business_idx on public.reviews(business_id,status);
create index reviews_author_idx on public.reviews(author_id);
create index topics_author_idx on public.topics(author_id);
create index posts_topic_idx on public.posts(topic_id,status);
create index posts_author_idx on public.posts(author_id);
create index ads_owner_idx on public.advertisements(owner_id);
create index ads_business_idx on public.advertisements(business_id);
create index audit_created_idx on public.audit_log(created_at desc);

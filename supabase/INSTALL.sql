-- Borough installation for a NEW empty Supabase project. Run once in SQL Editor.
BEGIN;
CREATE SCHEMA IF NOT EXISTS supabase_migrations;
CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (version text PRIMARY KEY, statements text[], name text);

-- 202611090001_schema.sql
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

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('202611090001','schema',ARRAY[$migration$-- Borough's canonical schema. Apply through Supabase migrations.
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
$migration$]);

-- 202611090002_security.sql
-- All tables deny access unless an explicit policy allows it.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.restrictions enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_files enable row level security;
alter table public.reviews enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.advertisements enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;
create function public.has_permission(required text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles r where r.user_id=auth.uid() and (r.role='admin' or exists(select 1 from public.role_permissions p where p.role=r.role and p.permission=required)))
 and not exists(select 1 from public.restrictions where user_id=auth.uid() and permission='all' and revoked_at is null and (expires_at is null or expires_at>now()));
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;
create function public.can_write(required text) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and not exists(select 1 from public.restrictions where user_id=auth.uid() and permission in ('all',required) and revoked_at is null and (expires_at is null or expires_at>now()));
$$;
create function public.new_user() returns trigger language plpgsql security definer set search_path = '' as $$
 begin
 insert into public.profiles(id) values(new.id);
 insert into public.user_roles(user_id) values(new.id);
 return new;
 end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_user();
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.has_permission('users.manage'));
create policy profiles_edit on public.profiles for update to authenticated using((id=auth.uid() and public.can_write('profile.write')) or public.is_admin()) with check((id=auth.uid() and public.can_write('profile.write')) or public.is_admin());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));
create policy roles_admin on public.user_roles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy permissions_read on public.role_permissions for select to authenticated using(true);
create policy permissions_admin on public.role_permissions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy restrictions_read on public.restrictions for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));
create policy restrictions_admin on public.restrictions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy categories_read on public.categories for select using(true);
create policy categories_manage on public.categories for all to authenticated using(public.has_permission('categories.manage')) with check(public.has_permission('categories.manage'));
create policy settings_read on public.settings for select using(true);
create policy settings_admin on public.settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy audit_read on public.audit_log for select to authenticated using(public.has_permission('audit.read'));
create function public.submissions_open() returns boolean language sql stable security definer set search_path = '' as $$ select submissions_open from public.settings where id=true $$;
-- A trigger protects immutable ownership and resets owner edits to pending.
create function public.guard_content() returns trigger language plpgsql security definer set search_path = '' as $$
 declare owner_key text; permission_key text;
 begin
 owner_key := case when tg_table_name in ('businesses','advertisements') then 'owner_id' else 'author_id' end;
 permission_key := case when tg_table_name='businesses' then 'listings.manage' else 'content.manage' end;
 if tg_op='UPDATE' and (to_jsonb(new)->>owner_key is distinct from to_jsonb(old)->>owner_key or new.id<>old.id) then raise exception 'Ownership and ID cannot change'; end if;
 if not public.has_permission(permission_key) then
 new.status := 'pending'; new.moderation_note := '';
 end if;
 if tg_table_name='businesses' then new.updated_at := now(); end if;
 return new;
 end;
$$;

create policy businesses_read on public.businesses for select using(status='approved' or owner_id=auth.uid() or public.has_permission('listings.manage'));
create policy businesses_insert on public.businesses for insert to authenticated with check(owner_id=auth.uid() and public.can_write('listings.write') and public.submissions_open());
create policy businesses_update on public.businesses for update to authenticated using((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage')) with check((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage'));
create policy businesses_delete on public.businesses for delete to authenticated using((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage'));
create trigger guard_businesses before insert or update on public.businesses for each row execute function public.guard_content();

create policy reviews_read on public.reviews for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy reviews_insert on public.reviews for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open() and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved' and b.owner_id<>auth.uid()));
create policy reviews_update on public.reviews for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write') and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved' and b.owner_id<>auth.uid())) or public.has_permission('content.manage'));
create policy reviews_delete on public.reviews for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_reviews before insert or update on public.reviews for each row execute function public.guard_content();

create policy topics_read on public.topics for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy topics_insert on public.topics for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open());
create policy topics_update on public.topics for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create policy topics_delete on public.topics for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_topics before insert or update on public.topics for each row execute function public.guard_content();

create policy posts_read on public.posts for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy posts_insert on public.posts for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open() and exists(select 1 from public.topics t where t.id=topic_id and t.status='approved'));
create policy posts_update on public.posts for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write') and exists(select 1 from public.topics t where t.id=topic_id and t.status='approved')) or public.has_permission('content.manage'));
create policy posts_delete on public.posts for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_posts before insert or update on public.posts for each row execute function public.guard_content();

create policy advertisements_read on public.advertisements for select using(status='approved' or owner_id=auth.uid() or public.has_permission('content.manage'));
create policy advertisements_insert on public.advertisements for insert to authenticated with check(owner_id=auth.uid() and public.can_write('ads.write') and public.submissions_open() and exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
create policy advertisements_update on public.advertisements for update to authenticated using((owner_id=auth.uid() and public.can_write('ads.write')) or public.has_permission('content.manage')) with check((owner_id=auth.uid() and public.can_write('ads.write') and exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) or public.has_permission('content.manage'));
create policy advertisements_delete on public.advertisements for delete to authenticated using((owner_id=auth.uid() and public.can_write('ads.write')) or public.has_permission('content.manage'));
create trigger guard_advertisements before insert or update on public.advertisements for each row execute function public.guard_content();

create function public.log_change() returns trigger language plpgsql security definer set search_path = '' as $$
 declare row_data jsonb;
 begin
 row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details) values(auth.uid(),tg_op,tg_table_name,coalesce(row_data->>'id',row_data->>'user_id',row_data->>'role','settings'),jsonb_build_object('status',row_data->>'status'));
 if tg_op='DELETE' then return old; end if; return new;
 end;
$$;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.log_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.log_change();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions for each row execute function public.log_change();
create trigger audit_restrictions after insert or update or delete on public.restrictions for each row execute function public.log_change();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.log_change();
create trigger audit_businesses after insert or update or delete on public.businesses for each row execute function public.log_change();
create trigger audit_business_files after insert or update or delete on public.business_files for each row execute function public.log_change();
create trigger audit_reviews after insert or update or delete on public.reviews for each row execute function public.log_change();
create trigger audit_topics after insert or update or delete on public.topics for each row execute function public.log_change();
create trigger audit_posts after insert or update or delete on public.posts for each row execute function public.log_change();
create trigger audit_advertisements after insert or update or delete on public.advertisements for each row execute function public.log_change();
create trigger audit_settings after insert or update or delete on public.settings for each row execute function public.log_change();

-- Explicit grants: RLS remains the authority for every request.
grant usage on schema public to anon, authenticated;
grant select on public.categories,public.businesses,public.reviews,public.topics,public.posts,public.advertisements,public.settings to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke insert,update,delete on public.audit_log from authenticated;
revoke all on function public.new_user(),public.guard_content(),public.log_change() from public;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('202611090002','security',ARRAY[$migration$-- All tables deny access unless an explicit policy allows it.
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.restrictions enable row level security;
alter table public.categories enable row level security;
alter table public.businesses enable row level security;
alter table public.business_files enable row level security;
alter table public.reviews enable row level security;
alter table public.topics enable row level security;
alter table public.posts enable row level security;
alter table public.advertisements enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;
create function public.has_permission(required text) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles r where r.user_id=auth.uid() and (r.role='admin' or exists(select 1 from public.role_permissions p where p.role=r.role and p.permission=required)))
 and not exists(select 1 from public.restrictions where user_id=auth.uid() and permission='all' and revoked_at is null and (expires_at is null or expires_at>now()));
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin');
$$;
create function public.can_write(required text) returns boolean language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and not exists(select 1 from public.restrictions where user_id=auth.uid() and permission in ('all',required) and revoked_at is null and (expires_at is null or expires_at>now()));
$$;
create function public.new_user() returns trigger language plpgsql security definer set search_path = '' as $$
 begin
 insert into public.profiles(id) values(new.id);
 insert into public.user_roles(user_id) values(new.id);
 return new;
 end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_user();
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or public.has_permission('users.manage'));
create policy profiles_edit on public.profiles for update to authenticated using((id=auth.uid() and public.can_write('profile.write')) or public.is_admin()) with check((id=auth.uid() and public.can_write('profile.write')) or public.is_admin());
create policy roles_read on public.user_roles for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));
create policy roles_admin on public.user_roles for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy permissions_read on public.role_permissions for select to authenticated using(true);
create policy permissions_admin on public.role_permissions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy restrictions_read on public.restrictions for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));
create policy restrictions_admin on public.restrictions for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy categories_read on public.categories for select using(true);
create policy categories_manage on public.categories for all to authenticated using(public.has_permission('categories.manage')) with check(public.has_permission('categories.manage'));
create policy settings_read on public.settings for select using(true);
create policy settings_admin on public.settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy audit_read on public.audit_log for select to authenticated using(public.has_permission('audit.read'));
create function public.submissions_open() returns boolean language sql stable security definer set search_path = '' as $$ select submissions_open from public.settings where id=true $$;
-- A trigger protects immutable ownership and resets owner edits to pending.
create function public.guard_content() returns trigger language plpgsql security definer set search_path = '' as $$
 declare owner_key text; permission_key text;
 begin
 owner_key := case when tg_table_name in ('businesses','advertisements') then 'owner_id' else 'author_id' end;
 permission_key := case when tg_table_name='businesses' then 'listings.manage' else 'content.manage' end;
 if tg_op='UPDATE' and (to_jsonb(new)->>owner_key is distinct from to_jsonb(old)->>owner_key or new.id<>old.id) then raise exception 'Ownership and ID cannot change'; end if;
 if not public.has_permission(permission_key) then
 new.status := 'pending'; new.moderation_note := '';
 end if;
 if tg_table_name='businesses' then new.updated_at := now(); end if;
 return new;
 end;
$$;

create policy businesses_read on public.businesses for select using(status='approved' or owner_id=auth.uid() or public.has_permission('listings.manage'));
create policy businesses_insert on public.businesses for insert to authenticated with check(owner_id=auth.uid() and public.can_write('listings.write') and public.submissions_open());
create policy businesses_update on public.businesses for update to authenticated using((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage')) with check((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage'));
create policy businesses_delete on public.businesses for delete to authenticated using((owner_id=auth.uid() and public.can_write('listings.write')) or public.has_permission('listings.manage'));
create trigger guard_businesses before insert or update on public.businesses for each row execute function public.guard_content();

create policy reviews_read on public.reviews for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy reviews_insert on public.reviews for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open() and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved' and b.owner_id<>auth.uid()));
create policy reviews_update on public.reviews for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write') and exists(select 1 from public.businesses b where b.id=business_id and b.status='approved' and b.owner_id<>auth.uid())) or public.has_permission('content.manage'));
create policy reviews_delete on public.reviews for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_reviews before insert or update on public.reviews for each row execute function public.guard_content();

create policy topics_read on public.topics for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy topics_insert on public.topics for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open());
create policy topics_update on public.topics for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create policy topics_delete on public.topics for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_topics before insert or update on public.topics for each row execute function public.guard_content();

create policy posts_read on public.posts for select using(status='approved' or author_id=auth.uid() or public.has_permission('content.manage'));
create policy posts_insert on public.posts for insert to authenticated with check(author_id=auth.uid() and public.can_write('content.write') and public.submissions_open() and exists(select 1 from public.topics t where t.id=topic_id and t.status='approved'));
create policy posts_update on public.posts for update to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage')) with check((author_id=auth.uid() and public.can_write('content.write') and exists(select 1 from public.topics t where t.id=topic_id and t.status='approved')) or public.has_permission('content.manage'));
create policy posts_delete on public.posts for delete to authenticated using((author_id=auth.uid() and public.can_write('content.write')) or public.has_permission('content.manage'));
create trigger guard_posts before insert or update on public.posts for each row execute function public.guard_content();

create policy advertisements_read on public.advertisements for select using(status='approved' or owner_id=auth.uid() or public.has_permission('content.manage'));
create policy advertisements_insert on public.advertisements for insert to authenticated with check(owner_id=auth.uid() and public.can_write('ads.write') and public.submissions_open() and exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid()));
create policy advertisements_update on public.advertisements for update to authenticated using((owner_id=auth.uid() and public.can_write('ads.write')) or public.has_permission('content.manage')) with check((owner_id=auth.uid() and public.can_write('ads.write') and exists(select 1 from public.businesses b where b.id=business_id and b.owner_id=auth.uid())) or public.has_permission('content.manage'));
create policy advertisements_delete on public.advertisements for delete to authenticated using((owner_id=auth.uid() and public.can_write('ads.write')) or public.has_permission('content.manage'));
create trigger guard_advertisements before insert or update on public.advertisements for each row execute function public.guard_content();

create function public.log_change() returns trigger language plpgsql security definer set search_path = '' as $$
 declare row_data jsonb;
 begin
 row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 insert into public.audit_log(actor_id,action,entity_type,entity_id,details) values(auth.uid(),tg_op,tg_table_name,coalesce(row_data->>'id',row_data->>'user_id',row_data->>'role','settings'),jsonb_build_object('status',row_data->>'status'));
 if tg_op='DELETE' then return old; end if; return new;
 end;
$$;
create trigger audit_profiles after insert or update or delete on public.profiles for each row execute function public.log_change();
create trigger audit_user_roles after insert or update or delete on public.user_roles for each row execute function public.log_change();
create trigger audit_role_permissions after insert or update or delete on public.role_permissions for each row execute function public.log_change();
create trigger audit_restrictions after insert or update or delete on public.restrictions for each row execute function public.log_change();
create trigger audit_categories after insert or update or delete on public.categories for each row execute function public.log_change();
create trigger audit_businesses after insert or update or delete on public.businesses for each row execute function public.log_change();
create trigger audit_business_files after insert or update or delete on public.business_files for each row execute function public.log_change();
create trigger audit_reviews after insert or update or delete on public.reviews for each row execute function public.log_change();
create trigger audit_topics after insert or update or delete on public.topics for each row execute function public.log_change();
create trigger audit_posts after insert or update or delete on public.posts for each row execute function public.log_change();
create trigger audit_advertisements after insert or update or delete on public.advertisements for each row execute function public.log_change();
create trigger audit_settings after insert or update or delete on public.settings for each row execute function public.log_change();

-- Explicit grants: RLS remains the authority for every request.
grant usage on schema public to anon, authenticated;
grant select on public.categories,public.businesses,public.reviews,public.topics,public.posts,public.advertisements,public.settings to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
revoke insert,update,delete on public.audit_log from authenticated;
revoke all on function public.new_user(),public.guard_content(),public.log_change() from public;
$migration$]);

-- 202611090003_storage.sql
-- Private objects are available only through signed downloads authorized by RLS.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-files','business-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create function public.owns_business(business uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.businesses where id=business and owner_id=auth.uid()) $$;
create policy files_read on public.business_files for select using(exists(select 1 from public.businesses b where b.id=business_id and (b.status='approved' or b.owner_id=auth.uid())) or public.has_permission('listings.manage'));
create policy files_insert on public.business_files for insert to authenticated with check(uploaded_by=auth.uid() and public.owns_business(business_id) and public.can_write('files.write') and split_part(path,'/',1)=auth.uid()::text and split_part(path,'/',2)=business_id::text);
create policy files_delete on public.business_files for delete to authenticated using((public.owns_business(business_id) and public.can_write('files.write')) or public.has_permission('listings.manage'));
create policy objects_read on storage.objects for select using(bucket_id='business-files' and (exists(select 1 from public.business_files f join public.businesses b on b.id=f.business_id where f.path=storage.objects.name and b.status='approved') or (split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write')) or public.has_permission('listings.manage')));
create policy objects_insert on storage.objects for insert to authenticated with check(bucket_id='business-files' and split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write') and exists(select 1 from public.businesses b where b.id::text=split_part(storage.objects.name,'/',2) and b.owner_id=auth.uid()));
create policy objects_delete on storage.objects for delete to authenticated using(bucket_id='business-files' and ((split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write')) or public.has_permission('listings.manage')));


INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('202611090003','storage',ARRAY[$migration$-- Private objects are available only through signed downloads authorized by RLS.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('business-files','business-files',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create function public.owns_business(business uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.businesses where id=business and owner_id=auth.uid()) $$;
create policy files_read on public.business_files for select using(exists(select 1 from public.businesses b where b.id=business_id and (b.status='approved' or b.owner_id=auth.uid())) or public.has_permission('listings.manage'));
create policy files_insert on public.business_files for insert to authenticated with check(uploaded_by=auth.uid() and public.owns_business(business_id) and public.can_write('files.write') and split_part(path,'/',1)=auth.uid()::text and split_part(path,'/',2)=business_id::text);
create policy files_delete on public.business_files for delete to authenticated using((public.owns_business(business_id) and public.can_write('files.write')) or public.has_permission('listings.manage'));
create policy objects_read on storage.objects for select using(bucket_id='business-files' and (exists(select 1 from public.business_files f join public.businesses b on b.id=f.business_id where f.path=storage.objects.name and b.status='approved') or (split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write')) or public.has_permission('listings.manage')));
create policy objects_insert on storage.objects for insert to authenticated with check(bucket_id='business-files' and split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write') and exists(select 1 from public.businesses b where b.id::text=split_part(storage.objects.name,'/',2) and b.owner_id=auth.uid()));
create policy objects_delete on storage.objects for delete to authenticated using(bucket_id='business-files' and ((split_part(storage.objects.name,'/',1)=auth.uid()::text and public.can_write('files.write')) or public.has_permission('listings.manage')));

$migration$]);

-- 202611090004_integrity.sql
-- Public directory aggregation observes underlying RLS.
create view public.directory_entries with (security_invoker=true) as
select b.*, c.name category_name, coalesce(r.rating,0) average_rating, coalesce(r.total,0) review_count
from public.businesses b join public.categories c on c.id=b.category_id
left join (select business_id,round(avg(rating),1) rating,count(*) total from public.reviews where status='approved' group by business_id) r on r.business_id=b.id
where b.status='approved';
grant select on public.directory_entries,public.business_files to anon,authenticated;
create function public.protect_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.user_roles where user_id=new.user_id and role='admin') then raise exception 'Administrator accounts cannot be restricted';end if;
 return new;
end;
$$;
create trigger protect_admin before insert or update on public.restrictions for each row execute function public.protect_admin();
create function public.category_depth() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.parent_id is not null and (exists(select 1 from public.categories where id=new.parent_id and parent_id is not null) or exists(select 1 from public.categories where parent_id=new.id)) then raise exception 'Categories support one subcategory level';end if;
 return new;
end;
$$;
create trigger category_depth before insert or update on public.categories for each row execute function public.category_depth();
create function public.file_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.businesses set status='pending' where id=case when tg_op='DELETE' then old.business_id else new.business_id end;
 if tg_op='DELETE' then return old;end if;return new;
end;
$$;
create trigger file_review after insert or delete on public.business_files for each row execute function public.file_review();
create function public.is_admin_user(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles where user_id=target and role='admin')$$;
create policy profiles_staff_edit on public.profiles for update to authenticated using(public.has_permission('users.manage') and not public.is_admin_user(id)) with check(public.has_permission('users.manage') and not public.is_admin_user(id));
create function public.protect_profile_id() returns trigger language plpgsql as $$begin if new.id<>old.id then raise exception 'Profile ID cannot change';end if;return new;end;$$;
create trigger protect_profile_id before update on public.profiles for each row execute function public.protect_profile_id();
insert into public.categories(name,icon) values('Food and drink','cup-hot'),('Shopping','bag'),('Services','tools'),('Health and wellbeing','heart'),('Arts and culture','palette');
revoke all on function public.protect_admin(),public.category_depth(),public.file_review(),public.protect_profile_id() from public;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('202611090004','integrity',ARRAY[$migration$-- Public directory aggregation observes underlying RLS.
create view public.directory_entries with (security_invoker=true) as
select b.*, c.name category_name, coalesce(r.rating,0) average_rating, coalesce(r.total,0) review_count
from public.businesses b join public.categories c on c.id=b.category_id
left join (select business_id,round(avg(rating),1) rating,count(*) total from public.reviews where status='approved' group by business_id) r on r.business_id=b.id
where b.status='approved';
grant select on public.directory_entries,public.business_files to anon,authenticated;
create function public.protect_admin() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.user_roles where user_id=new.user_id and role='admin') then raise exception 'Administrator accounts cannot be restricted';end if;
 return new;
end;
$$;
create trigger protect_admin before insert or update on public.restrictions for each row execute function public.protect_admin();
create function public.category_depth() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.parent_id is not null and (exists(select 1 from public.categories where id=new.parent_id and parent_id is not null) or exists(select 1 from public.categories where parent_id=new.id)) then raise exception 'Categories support one subcategory level';end if;
 return new;
end;
$$;
create trigger category_depth before insert or update on public.categories for each row execute function public.category_depth();
create function public.file_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.businesses set status='pending' where id=case when tg_op='DELETE' then old.business_id else new.business_id end;
 if tg_op='DELETE' then return old;end if;return new;
end;
$$;
create trigger file_review after insert or delete on public.business_files for each row execute function public.file_review();
create function public.is_admin_user(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.user_roles where user_id=target and role='admin')$$;
create policy profiles_staff_edit on public.profiles for update to authenticated using(public.has_permission('users.manage') and not public.is_admin_user(id)) with check(public.has_permission('users.manage') and not public.is_admin_user(id));
create function public.protect_profile_id() returns trigger language plpgsql as $$begin if new.id<>old.id then raise exception 'Profile ID cannot change';end if;return new;end;$$;
create trigger protect_profile_id before update on public.profiles for each row execute function public.protect_profile_id();
insert into public.categories(name,icon) values('Food and drink','cup-hot'),('Shopping','bag'),('Services','tools'),('Health and wellbeing','heart'),('Arts and culture','palette');
revoke all on function public.protect_admin(),public.category_depth(),public.file_review(),public.protect_profile_id() from public;
$migration$]);

-- 202611090005_admin_publication.sql
-- Administrators publish their edits directly; explicit moderation decisions are preserved.
create or replace function public.guard_content() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_key text; permission_key text;
begin
 owner_key := case when tg_table_name in ('businesses','advertisements') then 'owner_id' else 'author_id' end;
 permission_key := case when tg_table_name='businesses' then 'listings.manage' else 'content.manage' end;
 if tg_op='UPDATE' and (to_jsonb(new)->>owner_key is distinct from to_jsonb(old)->>owner_key or new.id<>old.id) then raise exception 'Ownership and ID cannot change'; end if;
 if public.is_admin() then
   if tg_op='INSERT' then
     if new.status='pending' then new.status := 'approved'; end if;
   elsif new.status=old.status then
     new.status := 'approved';
   end if;
 elsif not public.has_permission(permission_key) then
   new.status := 'pending'; new.moderation_note := '';
 end if;
 if tg_table_name='businesses' then new.updated_at := now(); end if;
 return new;
end;
$$;
create or replace function public.file_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.businesses set status=case when public.is_admin() then 'approved'::public.content_status else 'pending'::public.content_status end
 where id=case when tg_op='DELETE' then old.business_id else new.business_id end;
 if tg_op='DELETE' then return old;end if;return new;
end;
$$;

INSERT INTO supabase_migrations.schema_migrations(version,name,statements) VALUES ('202611090005','admin_publication',ARRAY[$migration$-- Administrators publish their edits directly; explicit moderation decisions are preserved.
create or replace function public.guard_content() returns trigger language plpgsql security definer set search_path = '' as $$
declare owner_key text; permission_key text;
begin
 owner_key := case when tg_table_name in ('businesses','advertisements') then 'owner_id' else 'author_id' end;
 permission_key := case when tg_table_name='businesses' then 'listings.manage' else 'content.manage' end;
 if tg_op='UPDATE' and (to_jsonb(new)->>owner_key is distinct from to_jsonb(old)->>owner_key or new.id<>old.id) then raise exception 'Ownership and ID cannot change'; end if;
 if public.is_admin() then
   if tg_op='INSERT' then
     if new.status='pending' then new.status := 'approved'; end if;
   elsif new.status=old.status then
     new.status := 'approved';
   end if;
 elsif not public.has_permission(permission_key) then
   new.status := 'pending'; new.moderation_note := '';
 end if;
 if tg_table_name='businesses' then new.updated_at := now(); end if;
 return new;
end;
$$;
create or replace function public.file_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 update public.businesses set status=case when public.is_admin() then 'approved'::public.content_status else 'pending'::public.content_status end
 where id=case when tg_op='DELETE' then old.business_id else new.business_id end;
 if tg_op='DELETE' then return old;end if;return new;
end;
$$;
$migration$]);
COMMIT;
NOTIFY pgrst, 'reload schema';

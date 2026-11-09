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

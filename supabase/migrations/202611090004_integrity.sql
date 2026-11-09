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

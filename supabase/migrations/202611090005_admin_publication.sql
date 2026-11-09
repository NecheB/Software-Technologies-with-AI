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

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { escapeHtml, safeUrl } from "../src/utils/html.js";
test("HTML text and links cannot introduce active content", () => {
  assert.equal(
    escapeHtml('<img onerror="x">'),
    "&lt;img onerror=&quot;x&quot;&gt;",
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://example.com"), "https://example.com/");
});
test("migrations enforce private profiles, moderation and immutable ownership", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;`);
    const installer = await readFile('supabase/INSTALL.sql','utf8');
    for (const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql'))) {
      assert.ok(installer.includes(await readFile(`supabase/migrations/${file}`,'utf8')), `Installer is current: ${file}`);
    }
    await db.exec(installer);
    assert.equal((await db.query('select count(*)::int n from supabase_migrations.schema_migrations')).rows[0].n,4);
    const owner = "00000000-0000-4000-8000-000000000001",
      other = "00000000-0000-4000-8000-000000000002",
      admin = "00000000-0000-4000-8000-000000000003";
    await db.exec(
      `insert into auth.users values('${owner}'),('${other}'),('${admin}');update public.user_roles set role='admin' where user_id='${admin}';insert into public.categories(id,name) values('00000000-0000-4000-8000-000000000004','Coffee');set role authenticated;set request.jwt.claim.sub='${owner}';`,
    );
    const business = (
      await db.query(
        `insert into public.businesses(owner_id,category_id,name,description,email,address,city,status) values('${owner}','00000000-0000-4000-8000-000000000004','Cafe','A lovely independent neighbourhood coffee shop.','hello@example.com','1 High Street','London','approved') returning id,status`,
      )
    ).rows[0];
    assert.equal(business.status, "pending");
    assert.equal(
      (await db.query("select * from public.profiles")).rows.length,
      1,
    );
    await assert.rejects(
      db.exec(
        `update public.businesses set owner_id='${other}' where id='${business.id}'`,
      ),
      /Ownership/,
    );
    await db.exec(`set request.jwt.claim.sub='${other}'`);
    assert.equal(
      (await db.query("select * from public.businesses")).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(`insert into public.user_roles values('${other}','admin')`),
    );
    await db.exec(
      `set request.jwt.claim.sub='${admin}';update public.businesses set status='approved' where id='${business.id}';set role anon;set request.jwt.claim.sub=''`,
    );
    assert.equal(
      (await db.query("select * from public.businesses")).rows.length,
      1,
    );
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${owner}';update public.businesses set tagline='Updated' where id='${business.id}'`,
    );
    assert.equal(
      (await db.query("select status from public.businesses")).rows[0].status,
      "pending",
    );
    await db.exec(
      `set request.jwt.claim.sub='${admin}';insert into public.restrictions(user_id,permission,reason) values('${owner}','all','Test suspension');set request.jwt.claim.sub='${owner}'`,
    );
    assert.equal(
      (
        await db.query(
          `update public.businesses set tagline='Blocked' returning id`,
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.exec(
        `insert into public.audit_log(action,entity_type,entity_id) values('fake','business','fake')`,
      ),
    );
    // Expired restrictions stop applying, without an administrative cleanup job.
    await db.exec(
      `set request.jwt.claim.sub='${admin}';update public.restrictions set expires_at=now()-interval '1 minute' where user_id='${owner}';set request.jwt.claim.sub='${owner}'`,
    );
    assert.equal(
      (
        await db.query(
          `update public.businesses set tagline='Allowed again' returning id`,
        )
      ).rows.length,
      1,
    );
    // Only the owner can upload into this business's object prefix.
    const path = `${owner}/${business.id}/sample.pdf`;
    await db.exec(
      `insert into storage.objects(bucket_id,name) values('business-files','${path}');insert into public.business_files(business_id,uploaded_by,path,name,mime_type,size_bytes) values('${business.id}','${owner}','${path}','sample.pdf','application/pdf',123)`,
    );
    await db.exec(`set request.jwt.claim.sub='${other}'`);
    await assert.rejects(
      db.exec(
        `insert into storage.objects(bucket_id,name) values('business-files','${owner}/${business.id}/forged.pdf')`,
      ),
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await db.exec(
      `set request.jwt.claim.sub='${admin}';update public.businesses set status='approved' where id='${business.id}';set role anon;set request.jwt.claim.sub=''`,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      1,
    );
    assert.equal(
      (await db.query("select * from public.directory_entries")).rows.length,
      1,
    );
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${owner}';insert into public.business_files(business_id,uploaded_by,path,name,mime_type,size_bytes) values('${business.id}','${owner}','${owner}/${business.id}/second.pdf','second.pdf','application/pdf',12);set role anon;set request.jwt.claim.sub=''`,
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from public.directory_entries")).rows.length,
      0,
    );
    // Moderator abilities are read from current database permissions, not token claims.
    await db.exec(
      `set role authenticated;set request.jwt.claim.sub='${admin}';update public.user_roles set role='moderator' where user_id='${other}';set request.jwt.claim.sub='${other}'`,
    );
    assert.equal(
      (
        await db.query(
          "select public.has_permission('listings.manage') allowed",
        )
      ).rows[0].allowed,
      true,
    );
    await db.exec(
      `set request.jwt.claim.sub='${admin}';delete from public.role_permissions where role='moderator' and permission='listings.manage';set request.jwt.claim.sub='${other}'`,
    );
    assert.equal(
      (
        await db.query(
          "select public.has_permission('listings.manage') allowed",
        )
      ).rows[0].allowed,
      false,
    );
    await db.exec(`set request.jwt.claim.sub='${admin}'`);
    await assert.rejects(
      db.exec(
        `insert into public.restrictions(user_id,permission,reason) values('${admin}','all','Cannot restrict admin')`,
      ),
      /Administrator/,
    );
  } finally {
    await db.close();
  }
});

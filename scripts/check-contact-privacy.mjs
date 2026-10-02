import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd());
const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(
  ".",
)[0];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token)
  throw new Error(
    "SUPABASE_ACCESS_TOKEN is required for read-only permission inspection.",
  );
const query =
  "select has_table_privilege('anon','public.contact','select') as anon_read,has_table_privilege('authenticated','public.contact','select') as member_read,has_table_privilege('anon','public.contact','insert') as anon_insert,has_table_privilege('authenticated','public.contact','insert') as member_insert,has_table_privilege('service_role','public.contact','select') as server_read,(select relrowsecurity from pg_class where oid='public.contact'::regclass) as rls,not exists(select 1 from pg_policies where schemaname='public' and tablename='contact' and cmd in ('SELECT','ALL')) as insert_only";
const r = await fetch(
  "https://api.supabase.com/v1/projects/" + ref + "/database/query",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, read_only: true }),
  },
);
if (!r.ok)
  throw new Error(
    "Contact permission inspection failed (HTTP " + r.status + ").",
  );
const [result] = await r.json();
if (
  result.anon_read ||
  result.member_read ||
  !result.anon_insert ||
  !result.member_insert ||
  !result.server_read ||
  !result.rls ||
  !result.insert_only
)
  throw new Error("Contact privacy update or grant inspection is required.");
console.log(
  "Contact privacy: visitors and members can INSERT only; private server read, RLS, and policies verified.",
);

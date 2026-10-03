create table if not exists public.collaborators (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    website_url text,
    logo_url text not null,
    logo_path text,
    display_order integer not null default 0 check (display_order >= 0),
    is_published boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists collaborators_public_order_idx
on public.collaborators (is_published, display_order, name);

alter table public.collaborators enable row level security;

drop policy if exists "Public can view published collaborators" on public.collaborators;
create policy "Public can view published collaborators"
on public.collaborators for select to anon, authenticated
using (is_published = true);

drop policy if exists "Admins manage collaborators" on public.collaborators;
create policy "Admins manage collaborators"
on public.collaborators for all to authenticated
using (public.is_smaj_admin())
with check (public.is_smaj_admin());

grant select on public.collaborators to anon, authenticated;
grant insert, update, delete on public.collaborators to authenticated;

drop trigger if exists set_collaborator_updated_at on public.collaborators;
create trigger set_collaborator_updated_at
before update on public.collaborators
for each row execute function public.set_team_member_updated_at();

insert into storage.buckets (id, name, public)
values ('collaborator-logos', 'collaborator-logos', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Collaborator logos are public" on storage.objects;
create policy "Collaborator logos are public"
on storage.objects for select to anon, authenticated
using (bucket_id = 'collaborator-logos');

drop policy if exists "Admins upload collaborator logos" on storage.objects;
create policy "Admins upload collaborator logos"
on storage.objects for insert to authenticated
with check (bucket_id = 'collaborator-logos' and public.is_smaj_admin());

drop policy if exists "Admins update collaborator logos" on storage.objects;
create policy "Admins update collaborator logos"
on storage.objects for update to authenticated
using (bucket_id = 'collaborator-logos' and public.is_smaj_admin())
with check (bucket_id = 'collaborator-logos' and public.is_smaj_admin());

drop policy if exists "Admins delete collaborator logos" on storage.objects;
create policy "Admins delete collaborator logos"
on storage.objects for delete to authenticated
using (bucket_id = 'collaborator-logos' and public.is_smaj_admin());

insert into public.collaborators (name, logo_url, display_order, is_published)
select 'Launch Collaborator', '/assets/images/collaborators/launch-partner.png', 1, true
where not exists (select 1 from public.collaborators where name = 'Launch Collaborator');

notify pgrst, 'reload schema';

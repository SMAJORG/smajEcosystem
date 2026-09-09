create extension if not exists pgcrypto;

create table if not exists public.opportunities (
    id uuid primary key default gen_random_uuid(),
    slug text not null unique,
    title text not null,
    venture text not null,
    summary text not null,
    opportunity_type text not null check (opportunity_type in ('builder', 'founder', 'partner', 'research')),
    skills text[] not null default '{}',
    interests text[] not null default '{}',
    location_mode text not null default 'remote' check (location_mode in ('remote', 'hybrid', 'onsite')),
    location text,
    commitment text not null,
    application_path text not null default '/builder-application/',
    status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
    display_order integer not null default 0 check (display_order >= 0),
    is_featured boolean not null default false,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.opportunity_applications (
    id uuid primary key default gen_random_uuid(),
    opportunity_id uuid not null references public.opportunities(id) on delete cascade,
    submission_key uuid not null unique default gen_random_uuid(),
    full_name text not null,
    email text not null,
    profile jsonb not null default '{}'::jsonb,
    message text,
    status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'accepted', 'declined')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint opportunity_applications_profile_object check (jsonb_typeof(profile) = 'object')
);

create index if not exists opportunities_public_order_idx
on public.opportunities (status, is_featured desc, display_order, title);

create index if not exists opportunity_applications_review_idx
on public.opportunity_applications (status, created_at desc);

alter table public.opportunities enable row level security;
alter table public.opportunity_applications enable row level security;

drop policy if exists "Public can view published opportunities" on public.opportunities;
create policy "Public can view published opportunities"
on public.opportunities for select
to anon, authenticated
using (status = 'published');

drop policy if exists "Admins manage opportunities" on public.opportunities;
create policy "Admins manage opportunities"
on public.opportunities for all
to authenticated
using (public.is_smaj_admin())
with check (public.is_smaj_admin());

drop policy if exists "Public can submit opportunity interest" on public.opportunity_applications;
create policy "Public can submit opportunity interest"
on public.opportunity_applications for insert
to anon, authenticated
with check (status = 'submitted');

drop policy if exists "Admins manage opportunity applications" on public.opportunity_applications;
create policy "Admins manage opportunity applications"
on public.opportunity_applications for all
to authenticated
using (public.is_smaj_admin())
with check (public.is_smaj_admin());

grant select on public.opportunities to anon, authenticated;
grant insert on public.opportunity_applications to anon, authenticated;
grant insert, update, delete on public.opportunities to authenticated;
grant select, update, delete on public.opportunity_applications to authenticated;

drop trigger if exists set_opportunity_updated_at on public.opportunities;
create trigger set_opportunity_updated_at
before update on public.opportunities
for each row execute function public.set_team_member_updated_at();

drop trigger if exists set_opportunity_application_updated_at on public.opportunity_applications;
create trigger set_opportunity_application_updated_at
before update on public.opportunity_applications
for each row execute function public.set_team_member_updated_at();

insert into public.opportunities (
    slug, title, venture, summary, opportunity_type, skills, interests,
    location_mode, location, commitment, application_path, status, display_order, is_featured
)
values
    (
        'full-stack-builder-smaj-pi-hub', 'Full-Stack Product Builder', 'SMAJ PI HUB',
        'Build trusted marketplace, identity, and utility experiences for verified Pi Network users.',
        'builder', array['javascript','api','database','ui/ux'], array['fintech','marketplace','pi network'],
        'remote', 'Global', 'Project-based', '/builder-application/', 'published', 1, true
    ),
    (
        'ai-research-contributor', 'AI Research Contributor', 'SMAJ Labs',
        'Turn emerging AI research into practical experiments, evidence, and product opportunities.',
        'research', array['research','data analysis','artificial intelligence'], array['ai','research','innovation'],
        'remote', 'Global', 'Flexible', '/builder-application/', 'published', 2, true
    ),
    (
        'venture-cofounder', 'Venture Co-Founder', 'SMAJ Ventures',
        'Lead a validated technology concept from customer discovery through product launch and growth.',
        'founder', array['strategy','product','leadership'], array['startups','venture building','technology'],
        'hybrid', 'Dubai, UAE / Remote', 'Long-term', '/founder-application/', 'published', 3, false
    ),
    (
        'strategic-ecosystem-partner', 'Strategic Ecosystem Partner', 'SMAJ Partners',
        'Collaborate on distribution, technology, capital, research, or market access across SMAJ ventures.',
        'partner', array['partnerships','business development','operations'], array['ecosystems','innovation','growth'],
        'hybrid', 'Global / Dubai, UAE', 'Partnership', '/partner-application/', 'published', 4, false
    )
on conflict (slug) do update set
    title = excluded.title,
    venture = excluded.venture,
    summary = excluded.summary,
    opportunity_type = excluded.opportunity_type,
    skills = excluded.skills,
    interests = excluded.interests,
    location_mode = excluded.location_mode,
    location = excluded.location,
    commitment = excluded.commitment,
    application_path = excluded.application_path,
    display_order = excluded.display_order,
    is_featured = excluded.is_featured,
    updated_at = now();
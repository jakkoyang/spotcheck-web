create table locations (
  id text primary key,
  name text not null,
  category text not null,
  lat double precision not null,
  lng double precision not null,
  address text not null,
  hours_description text not null,
  amenities text[] not null default '{}',
  busy_score integer not null,
  atmosphere_score text not null,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  last_updated timestamptz not null default now()
);

create table vibe_tags (
  id text primary key,
  slug text not null unique,
  label text not null
);

create table location_tags (
  location_id text not null references locations(id) on delete cascade,
  vibe_tag_id text not null references vibe_tags(id) on delete cascade,
  primary key (location_id, vibe_tag_id)
);

create table busy_reports (
  id uuid primary key default gen_random_uuid(),
  location_id text not null references locations(id) on delete cascade,
  busy_score integer not null check (busy_score between 0 and 10),
  reported_at timestamptz not null default now()
);

alter table locations enable row level security;
alter table vibe_tags enable row level security;
alter table location_tags enable row level security;
alter table busy_reports enable row level security;

create policy "Public read access" on locations for select using (true);
create policy "Public read access" on vibe_tags for select using (true);
create policy "Public read access" on location_tags for select using (true);
create policy "Public read access" on busy_reports for select using (true);

-- Verified opening hours in OpenStreetMap `opening_hours` syntax; null when unknown.
alter table locations add column if not exists opening_hours text;

-- Tie each crowd report to the signed-in reporter.
alter table busy_reports
  add column if not exists reporter_id uuid references auth.users (id) on delete set null default auth.uid();

create index if not exists busy_reports_location_recent_idx
  on busy_reports (location_id, reported_at desc);

-- Signed-in users may report, at most once per spot every 10 minutes.
create policy "Signed-in users can report" on busy_reports
  for insert to authenticated
  with check (
    reporter_id = auth.uid()
    and not exists (
      select 1 from busy_reports recent
      where recent.location_id = busy_reports.location_id
        and recent.reporter_id = auth.uid()
        and recent.reported_at > now() - interval '10 minutes'
    )
  );

-- A spot's busy score is the average of its reports from the last 90 minutes.
-- security definer: locations is read-only to clients under RLS.
create or replace function apply_busy_report() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update locations
  set
    busy_score = (
      select round(avg(r.busy_score))::int
      from busy_reports r
      where r.location_id = new.location_id
        and r.reported_at > now() - interval '90 minutes'
    ),
    last_updated = new.reported_at
  where id = new.location_id;
  return new;
end;
$$;

drop trigger if exists busy_reports_apply on busy_reports;
create trigger busy_reports_apply
  after insert on busy_reports
  for each row execute function apply_busy_report();

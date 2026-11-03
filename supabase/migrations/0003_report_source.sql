-- Where each crowd report came from: the spot card ('manual') or a check-in prompt
-- notification ('prompt'). Lets us measure how many reports the prompts bring in.
alter table busy_reports
  add column if not exists source text not null default 'manual'
  constraint busy_reports_source_check check (source in ('manual', 'prompt'));

create index if not exists busy_reports_source_recent_idx
  on busy_reports (source, reported_at desc);

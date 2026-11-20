-- InternPulse schema. Paste into Supabase → SQL Editor, then run `npm run seed`.

create table if not exists users (
  id            text primary key default gen_random_uuid()::text,
  slack_id      text unique not null,
  name          text not null,
  role          text,
  department    text,
  cohort        text,
  manager_name  text
);

create table if not exists checkins (
  id                 text primary key default gen_random_uuid()::text,
  user_id            text not null references users(id) on delete cascade,
  week_number        int  not null,
  -- radar dimensions, self-reported 1-5 in the Slack /checkin modal
  role_satisfaction  int  not null check (role_satisfaction between 1 and 5),
  rbc_satisfaction   int  not null check (rbc_satisfaction between 1 and 5),
  learning_growth    int  not null check (learning_growth between 1 and 5),
  voice_valued       int  not null check (voice_valued between 1 and 5),
  feedback_text      text,
  -- LLM enrichment
  sentiment_score    real,
  sentiment_label    text check (sentiment_label in ('Positive','Neutral','At-Risk')),
  tags               text[] default '{}',
  summary            text,
  leave_signal       boolean default false,
  evidence           jsonb default '{}'::jsonb,
  submitted_at       timestamptz default now()
);
create index if not exists checkins_user_week on checkins(user_id, week_number);

-- Performance dimension: manager rating, not self-reported.
create table if not exists performance_reviews (
  id           text primary key default gen_random_uuid()::text,
  user_id      text not null references users(id) on delete cascade,
  week_number  int  not null,
  rating       int  not null check (rating between 1 and 5),
  note         text,
  reviewer     text,
  created_at   timestamptz default now()
);

create table if not exists reports (
  id           text primary key default gen_random_uuid()::text,
  user_id      text references users(id) on delete set null, -- null when anonymous
  anonymous    boolean not null default false,
  category     text not null check (category in ('Harassment','Workload','Team Conflict','Other')),
  description  text not null,
  urgency      text not null check (urgency in ('Low','Medium','High')),
  status       text not null default 'Open' check (status in ('Open','Reviewed')),
  created_at   timestamptz default now(),
  constraint anonymous_has_no_user check (not anonymous or user_id is null)
);

-- HR follow-ups (nudges, 1:1s) so the dashboard shows action, not just observation.
create table if not exists actions (
  id          text primary key default gen_random_uuid()::text,
  user_id     text not null references users(id) on delete cascade,
  type        text not null check (type in ('nudge','one_on_one')),
  note        text,
  created_at  timestamptz default now()
);

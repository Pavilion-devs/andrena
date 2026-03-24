begin;

create type public.competition_status as enum ('draft', 'active', 'completed');
create type public.participant_source as enum ('synthetic', 'live');
create type public.participant_status as enum ('active', 'paused', 'flagged');
create type public.participant_card_status as enum ('pending', 'completed');
create type public.ledger_metric as enum ('score', 'ticket');
create type public.refresh_run_status as enum ('success', 'partial', 'failed');
create type public.runtime_trigger as enum ('manual', 'scheduler');
create type public.runtime_job_status as enum ('success', 'skipped', 'failed');
create type public.published_card_set_origin as enum ('generated', 'manual');
create type public.admin_adjustment_status as enum ('active', 'voided');
create type public.review_category as enum ('abuse', 'dispute', 'scoring', 'data_quality');
create type public.review_severity as enum ('low', 'medium', 'high');
create type public.review_status as enum ('open', 'resolved');
create type public.competition_service_health_status as enum ('healthy', 'degraded', 'unreachable', 'unknown');
create type public.competition_service_stream_connection_status as enum ('idle', 'connecting', 'connected', 'disconnected', 'error');

create table public.competitions (
  id text primary key,
  name text not null,
  tagline text not null,
  description text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reference_now timestamptz not null,
  status public.competition_status not null default 'draft',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_refreshed_at timestamptz,
  last_recomputed_at timestamptz,
  config_snapshot jsonb not null
);

create table public.participants (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  wallet text not null,
  label text not null,
  source public.participant_source not null,
  status public.participant_status not null default 'active',
  joined_at timestamptz not null,
  last_synced_at timestamptz,
  unique (competition_id, wallet)
);

create table public.positions (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  position_id bigint not null,
  symbol text not null,
  side text not null check (side in ('long', 'short')),
  status text not null,
  entry_price numeric,
  exit_price numeric,
  pnl numeric,
  entry_leverage numeric,
  entry_date timestamptz not null,
  exit_date timestamptz,
  fees numeric,
  borrow_fees numeric,
  closed_by_sl_tp boolean not null default false,
  volume numeric not null,
  duration integer not null,
  pnl_volume_ratio numeric not null,
  source public.participant_source not null,
  ingested_at timestamptz not null,
  updated_at timestamptz not null,
  raw_payload jsonb,
  unique (competition_id, participant_id, position_id)
);

create table public.daily_card_sets (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  day_key date not null,
  published_at timestamptz not null,
  updated_at timestamptz not null,
  origin public.published_card_set_origin not null,
  operator_note text,
  full_set_bonus numeric not null,
  cards jsonb not null,
  unique (competition_id, day_key)
);

create table public.participant_cards (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  day_key date not null,
  card_id text not null,
  title text not null,
  description text not null,
  category text not null,
  difficulty text not null,
  points numeric not null,
  status public.participant_card_status not null default 'pending',
  completed_at timestamptz,
  evidence_position_ids jsonb not null default '[]'::jsonb,
  unique (competition_id, participant_id, day_key, card_id)
);

create table public.score_ledger (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  metric public.ledger_metric not null,
  source_type text not null,
  source_ref text not null,
  day_key date not null,
  amount numeric not null,
  created_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb
);

create table public.manual_adjustments (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  metric public.ledger_metric not null,
  amount numeric not null,
  reason text not null,
  note text,
  day_key date not null,
  status public.admin_adjustment_status not null default 'active',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  voided_at timestamptz,
  void_reason text
);

create table public.review_flags (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  category public.review_category not null,
  severity public.review_severity not null,
  status public.review_status not null default 'open',
  title text not null,
  description text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  resolved_at timestamptz,
  resolution_note text
);

create table public.leaderboard_snapshots (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  captured_at timestamptz not null,
  reference_now timestamptz not null,
  rankings jsonb not null,
  summary jsonb not null
);

create table public.refresh_runs (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  target_wallet text,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status public.refresh_run_status not null,
  participants_synced integer not null default 0,
  positions_upserted integer not null default 0,
  error_messages jsonb not null default '[]'::jsonb
);

create table public.runtime_states (
  competition_id text primary key references public.competitions(id) on delete cascade,
  scheduler_enabled boolean not null default true,
  refresh_interval_minutes integer not null,
  recompute_interval_minutes integer not null,
  lock_ttl_seconds integer not null,
  max_job_runs integer not null,
  active_lock jsonb,
  last_tick_at timestamptz,
  last_successful_tick_at timestamptz,
  updated_at timestamptz not null
);

create table public.runtime_job_runs (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  trigger public.runtime_trigger not null,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  status public.runtime_job_status not null,
  due_actions text[] not null default '{}'::text[],
  executed_actions text[] not null default '{}'::text[],
  skipped_reason text,
  error_message text,
  refresh_run_id text,
  leaderboard_snapshot_id text
);

create table public.competition_service_states (
  competition_id text primary key references public.competitions(id) on delete cascade,
  health_checked_at timestamptz,
  health_status public.competition_service_health_status not null default 'unknown',
  health_response_time_ms integer,
  health_service_timestamp bigint,
  health_error_message text,
  size_multiplier_synced_at timestamptz,
  size_multiplier_source text not null default 'fallback',
  size_multiplier_interpolation text not null default 'linear',
  size_multiplier_formula text not null,
  size_multiplier_notes jsonb not null default '[]'::jsonb,
  size_multiplier_tiers jsonb not null default '[]'::jsonb,
  position_schema_synced_at timestamptz,
  position_schema_program_id text,
  position_schema_account_size_bytes integer,
  position_schema_close_instructions jsonb not null default '[]'::jsonb,
  position_schema_pda_seeds jsonb not null default '[]'::jsonb,
  position_schema_field_count integer not null default 0,
  stream_enabled boolean not null default false,
  stream_connection_status public.competition_service_stream_connection_status not null default 'idle',
  stream_last_connected_at timestamptz,
  stream_last_disconnected_at timestamptz,
  stream_reconnect_attempts integer not null default 0,
  stream_last_event_at timestamptz,
  stream_last_close_event_at timestamptz,
  stream_last_signature text,
  stream_last_error_at timestamptz,
  stream_last_error_message text,
  updated_at timestamptz not null default now()
);

create table public.close_events (
  id text primary key,
  competition_id text not null references public.competitions(id) on delete cascade,
  participant_id text not null references public.participants(id) on delete cascade,
  wallet text not null,
  position_pda text not null,
  position_id bigint not null,
  signature text not null,
  slot text not null,
  custody_mint text not null,
  side text not null check (side in ('long', 'short')),
  size_usd numeric not null,
  price_usd numeric not null,
  collateral_amount_usd numeric not null,
  profit_usd numeric not null,
  loss_usd numeric not null,
  net_pnl_usd numeric not null,
  borrow_fee_usd numeric not null,
  exit_fee_usd numeric not null,
  percentage_closed_pct numeric not null,
  event_timestamp timestamptz not null,
  raw jsonb not null,
  decoded jsonb not null,
  unique (signature, position_id, percentage_closed_pct)
);

create index participants_competition_wallet_idx on public.participants (competition_id, wallet);
create index positions_competition_participant_idx on public.positions (competition_id, participant_id);
create index positions_wallet_exit_date_idx on public.positions (wallet, exit_date desc);
create index participant_cards_competition_day_idx on public.participant_cards (competition_id, day_key);
create index score_ledger_competition_participant_day_idx on public.score_ledger (competition_id, participant_id, day_key);
create index manual_adjustments_competition_status_idx on public.manual_adjustments (competition_id, status);
create index review_flags_competition_status_idx on public.review_flags (competition_id, status);
create index leaderboard_snapshots_competition_captured_idx on public.leaderboard_snapshots (competition_id, captured_at desc);
create index refresh_runs_competition_started_idx on public.refresh_runs (competition_id, started_at desc);
create index runtime_job_runs_competition_started_idx on public.runtime_job_runs (competition_id, started_at desc);
create index close_events_competition_timestamp_idx on public.close_events (competition_id, event_timestamp desc);
create index close_events_participant_timestamp_idx on public.close_events (participant_id, event_timestamp desc);
create index competition_service_states_health_idx on public.competition_service_states (health_status, stream_connection_status);

comment on table public.competitions is 'Top-level weekly league records.';
comment on table public.participants is 'Registered wallets in a competition.';
comment on table public.positions is 'Wallet-level Adrena position snapshots from refresh polling.';
comment on table public.participant_cards is 'Per-wallet daily battlecard assignments and completion evidence.';
comment on table public.score_ledger is 'Deterministic score and ticket ledger. Source metadata stays in jsonb.';
comment on table public.competition_service_states is 'Official Adrena competition-service health, schema, multiplier, and stream state.';
comment on table public.close_events is 'Normalized close_position events from the Adrena competition-service stream.';

commit;

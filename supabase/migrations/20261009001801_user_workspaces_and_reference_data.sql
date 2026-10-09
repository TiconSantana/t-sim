-- Account-owned headcount and scenarios, plus one admin-managed reference set.
-- All access goes through session-checked Vercel handlers using service_role.
create table if not exists public.tsim_user_workspaces (
  user_id uuid primary key references public.access_profiles(user_id) on delete cascade,
  headcount jsonb not null default '[]'::jsonb check (jsonb_typeof(headcount) = 'array'),
  scenarios jsonb not null default '[]'::jsonb check (jsonb_typeof(scenarios) = 'array'),
  headcount_plan jsonb not null default '{"campo":null,"ga":null}'::jsonb check (jsonb_typeof(headcount_plan) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.tsim_user_workspaces
  add column if not exists headcount_plan jsonb not null default '{"campo":null,"ga":null}'::jsonb;

create table if not exists public.tsim_reference_data (
  id text primary key check (id = 'global'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_by uuid references public.access_profiles(user_id),
  updated_at timestamptz not null default now()
);

insert into public.tsim_reference_data (id, payload)
values (
  'global',
  '{
    "encargos": 1.13,
    "source": "Base de referência da empresa R2T · Cargos e Salário.xlsx",
    "validity": "CONFIRMADO conforme arquivo fornecido; data de vigência a informar",
    "version": "Importação inicial · 08/10/2026",
    "responsible": "A confirmar",
    "cargos": [
      {"id":"auxiliar","short":"Auxiliar","name":"AUXILIAR DE FIBRA ÓPTICA","level":"Nível I","salary":1621.00,"tone":"slate","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"cargo-oficialderede","short":"OFICIAL DE REDE","name":"OFICIAL DE REDE","level":"Nível I","salary":1621.00,"tone":"slate","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"tecnico-ii","short":"Técnico II","name":"TÉCNICO DE FIBRA ÓPTICA II","level":"Nível II","salary":2017.19,"tone":"blue","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"cargo-liderdeobras","short":"LIDER DE OBRAS","name":"LIDER DE OBRAS","level":"Nível II","salary":2017.19,"tone":"slate","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"tecnico-n3","short":"Técnico N/3","name":"TÉCNICO DE FIBRA ÓPTICA N/3","level":"Nível III","salary":2410.94,"tone":"teal","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"tecnico-n4","short":"Técnico N/4","name":"TÉCNICO DE FIBRA ÓPTICA N/4","level":"Nível IV","salary":2634.70,"tone":"violet","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"tecnico-v","short":"Técnico V","name":"TÉCNICO DE FIBRA ÓPTICA V","level":"Nível V","salary":3028.25,"tone":"amber","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"tecnico-vi","short":"Técnico VI","name":"TÉCNICO DE FIBRA ÓPTICA VI","level":"Nível VI","salary":3214.85,"tone":"orange","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"},
      {"id":"cargo-gestordeareafibraopticai","short":"GESTOR DE AREA FIBRA OPTICA I","name":"GESTOR DE AREA FIBRA OPTICA I","level":"Nível I","salary":4269.21,"tone":"slate","source":"Base de referência da empresa R2T","validity":"CONFIRMADO"}
    ]
  }'::jsonb
) on conflict (id) do nothing;

alter table public.tsim_user_workspaces enable row level security;
alter table public.tsim_reference_data enable row level security;

revoke all on public.tsim_user_workspaces from anon, authenticated;
revoke all on public.tsim_reference_data from anon, authenticated;
grant all on public.tsim_user_workspaces to service_role;
grant all on public.tsim_reference_data to service_role;

comment on table public.tsim_user_workspaces is 'Headcount and scenarios owned by one approved T-Sim account; accessible only through session-checked server routes.';
comment on table public.tsim_reference_data is 'Global T-Sim reference data editable only by the approved administrator through server routes.';

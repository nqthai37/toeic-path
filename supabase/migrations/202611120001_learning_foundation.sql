-- M2 vertical slice. Run through Supabase migrations, never from the browser.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=100),
 timezone text not null default 'Asia/Ho_Chi_Minh', language text not null default 'vi'
);
create table public.study_plans (
 user_id uuid primary key references auth.users(id) on delete cascade,
 weeks integer not null check (weeks in (4,8,12)), target_score integer not null check(target_score between 10 and 990 and target_score%5=0),
 minutes_per_day integer not null check(minutes_per_day in(20,30,45,60,90,120)),
 start_date date not null, revision integer not null default 0, updated_at timestamptz not null default now()
);
create table public.audio_assets (
 id text primary key, storage_path text not null, sha256 text not null check(length(sha256)=64),
 duration numeric not null check(duration>0), metadata jsonb not null default '{}'
);
create table public.question_groups (
 id text primary key, part integer not null check(part between 1 and 7),
 audio_asset_id text references public.audio_assets(id), passage text, illustration text,
 estimated_seconds integer not null check(estimated_seconds>0)
);
create table public.questions (
 id integer primary key, content_version text not null, group_id text not null references public.question_groups(id),
 part integer not null check(part between 1 and 7), prompt text not null, options jsonb not null check(jsonb_typeof(options)='array' and jsonb_array_length(options) between 3 and 4),
 skill_tags text[] not null default '{}', metadata_status text not null check(metadata_status in('reviewed','format-only')),
 difficulty text, published boolean not null default true
);
create table private.answer_keys (
 question_id integer primary key references public.questions(id), content_version text not null,
 answer integer not null check(answer between 0 and 3), explanation text not null
);
create table public.practice_tests (id integer primary key, title text not null, minutes integer not null check(minutes>0));
create table public.test_questions (
 test_id integer references public.practice_tests(id), question_id integer references public.questions(id),
 position integer not null, primary key(test_id,question_id), unique(test_id,position)
);
create table public.attempts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 client_attempt_id uuid not null, mode text not null check(mode in('learning','timed')),
 test_id integer references public.practice_tests(id), status text not null default 'open' check(status in('open','submitted')),
 started_at timestamptz not null default now(), expires_at timestamptz, submitted_at timestamptz,
 revision integer not null default 0, unique(user_id,client_attempt_id)
);
create index attempts_owner_status on public.attempts(user_id,status,started_at desc);
create table public.attempt_questions (
 attempt_id uuid references public.attempts(id) on delete cascade, question_id integer not null,
 position integer not null, content_version text not null, snapshot jsonb not null,
 primary key(attempt_id,question_id), unique(attempt_id,position)
);
create table private.attempt_keys (
 attempt_id uuid references public.attempts(id) on delete cascade, question_id integer not null,
 answer integer not null, explanation text not null, primary key(attempt_id,question_id)
);
create table public.attempt_answers (
 attempt_id uuid not null, question_id integer not null, selected_option integer not null check(selected_option between 0 and 3),
 updated_at timestamptz not null default now(), primary key(attempt_id,question_id),
 foreign key(attempt_id,question_id) references public.attempt_questions(attempt_id,question_id) on delete cascade
);
create table public.attempt_results (
 attempt_id uuid primary key references public.attempts(id) on delete cascade,
 correct integer not null, total integer not null, accuracy integer not null, server_graded boolean not null default true,
 graded_at timestamptz not null default now()
);
create table public.review_items (
 user_id uuid references auth.users(id) on delete cascade, question_id integer references public.questions(id),
 due_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(user_id,question_id)
);

alter table private.answer_keys enable row level security;
alter table private.attempt_keys enable row level security;
alter table public.profiles enable row level security;
alter table public.study_plans enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_questions enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.attempt_results enable row level security;
alter table public.review_items enable row level security;
alter table public.audio_assets enable row level security;
alter table public.question_groups enable row level security;
alter table public.questions enable row level security;
alter table public.practice_tests enable row level security;
alter table public.test_questions enable row level security;
create policy own_profile on public.profiles for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_plan_read on public.study_plans for select to authenticated using(user_id=(select auth.uid()));
create policy own_attempt on public.attempts for select to authenticated using(user_id=(select auth.uid()));
create policy own_review on public.review_items for select to authenticated using(user_id=(select auth.uid()));
create policy own_questions on public.attempt_questions for select to authenticated using(exists(select 1 from public.attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
create policy own_answers on public.attempt_answers for select to authenticated using(exists(select 1 from public.attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
create policy own_results on public.attempt_results for select to authenticated using(exists(select 1 from public.attempts a where a.id=attempt_id and a.user_id=(select auth.uid())));
create policy audio_read on public.audio_assets for select to anon,authenticated using(true);
create policy groups_read on public.question_groups for select to anon,authenticated using(true);
create policy published_questions on public.questions for select to anon,authenticated using(published);
create policy tests_read on public.practice_tests for select to anon,authenticated using(true);
create policy test_questions_read on public.test_questions for select to anon,authenticated using(true);
-- Supabase default grants must not accidentally permit direct score/time writes.
revoke all on public.profiles,public.study_plans,public.attempts,public.attempt_questions,public.attempt_answers,public.attempt_results,public.review_items from anon,authenticated;
grant select,insert,update,delete on public.profiles to authenticated;
grant select on public.study_plans,public.attempts,public.attempt_questions,public.attempt_answers,public.attempt_results,public.review_items to authenticated;
revoke all on public.audio_assets,public.question_groups,public.questions,public.practice_tests,public.test_questions from anon,authenticated;
grant select on public.audio_assets,public.question_groups,public.questions,public.practice_tests,public.test_questions to anon,authenticated;

create function public.start_attempt(p_ids integer[],p_key uuid,p_mode text default 'learning',p_test_id integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); item public.attempts; total integer; seconds integer; selected integer[];
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 if p_mode not in('learning','timed') or p_key is null then raise exception 'Invalid request'; end if;
 if p_test_id is not null then
  select array_agg(t.question_id order by t.position),max(p.minutes)*60 into selected,seconds from public.test_questions t join public.practice_tests p on p.id=t.test_id where t.test_id=p_test_id;
 else selected:=p_ids; seconds:=coalesce(array_length(selected,1),0)*60; end if;
 total:=coalesce(array_length(selected,1),0);
 if total<1 or total>50 or (select count(distinct x) from unnest(selected) x)<>total or (select count(*) from public.questions q where q.id=any(selected) and q.published)<>total then raise exception 'Invalid question selection'; end if;
 if exists(select 1 from public.questions q where q.published and q.group_id in(select group_id from public.questions where id=any(selected)) and not(q.id=any(selected))) then raise exception 'Select complete question groups'; end if;
 -- Serialize duplicate start requests before creating their snapshot.
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text||p_key::text,0));
 select * into item from public.attempts where user_id=owner_id and client_attempt_id=p_key;
 if found then
  if item.mode<>p_mode or item.test_id is distinct from p_test_id or (select array_agg(question_id order by position) from public.attempt_questions where attempt_id=item.id)<>selected then raise exception 'Idempotency key already used for another request'; end if;
  return to_jsonb(item);
 end if;
 insert into public.attempts(user_id,client_attempt_id,mode,test_id,expires_at) values(owner_id,p_key,p_mode,p_test_id,case when p_mode='timed' then now()+make_interval(secs=>seconds) else null end) returning * into item;
 insert into public.attempt_questions(attempt_id,question_id,position,content_version,snapshot)
 select item.id,q.id,s.position,q.content_version,to_jsonb(q)||jsonb_build_object('group',to_jsonb(g)) from unnest(selected) with ordinality s(id,position) join public.questions q on q.id=s.id join public.question_groups g on g.id=q.group_id;
 insert into private.attempt_keys select item.id,k.question_id,k.answer,k.explanation from private.answer_keys k where k.question_id=any(selected);
 if (select count(*) from private.attempt_keys where attempt_id=item.id)<>total then raise exception 'Answer key unavailable'; end if;
 return to_jsonb(item);
end $$;

create function public.save_answer(p_attempt uuid,p_question integer,p_option integer,p_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare item public.attempts; option_count integer;
begin
 select * into item from public.attempts where id=p_attempt and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable'; end if;
 if item.status<>'open' or (item.expires_at is not null and clock_timestamp()>=item.expires_at) then raise exception 'Attempt closed or expired'; end if;
 if item.revision is distinct from p_revision then raise exception 'Stale revision'; end if;
 select jsonb_array_length(snapshot->'options') into option_count from public.attempt_questions where attempt_id=p_attempt and question_id=p_question;
 if option_count is null or p_option is null or p_option<0 or p_option>=option_count then raise exception 'Invalid option or question'; end if;
 insert into public.attempt_answers(attempt_id,question_id,selected_option) values(p_attempt,p_question,p_option) on conflict(attempt_id,question_id) do update set selected_option=excluded.selected_option,updated_at=clock_timestamp();
 update public.attempts set revision=revision+1 where id=p_attempt returning revision into p_revision;
 return p_revision;
end $$;

create function public.check_answer(p_attempt uuid,p_question integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.attempts; feedback jsonb;
begin
 select * into item from public.attempts where id=p_attempt and user_id=auth.uid();
 if not found then raise exception 'Attempt unavailable'; end if;
 if item.mode='timed' and item.status<>'submitted' then raise exception 'Submit the timed attempt first'; end if;
 select jsonb_build_object('question_id',k.question_id,'answer',k.answer,'explanation',k.explanation,'correct',coalesce(a.selected_option=k.answer,false)) into feedback from private.attempt_keys k left join public.attempt_answers a using(attempt_id,question_id) where k.attempt_id=p_attempt and k.question_id=p_question;
 if feedback is null then raise exception 'Question unavailable'; end if;
 return feedback;
end $$;

create function public.submit_attempt(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.attempts; result public.attempt_results; correct_count integer; total_count integer;
begin
 select * into item from public.attempts where id=p_attempt and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable'; end if;
 if item.status='submitted' then select * into result from public.attempt_results where attempt_id=p_attempt; return to_jsonb(result); end if;
 select count(*) filter(where a.selected_option=k.answer),count(*) into correct_count,total_count from private.attempt_keys k left join public.attempt_answers a using(attempt_id,question_id) where k.attempt_id=p_attempt;
 insert into public.attempt_results(attempt_id,correct,total,accuracy) values(p_attempt,correct_count,total_count,round(100.0*correct_count/total_count)) returning * into result;
 insert into public.review_items(user_id,question_id) select item.user_id,k.question_id from private.attempt_keys k left join public.attempt_answers a using(attempt_id,question_id) where k.attempt_id=p_attempt and a.selected_option is distinct from k.answer on conflict(user_id,question_id) do update set due_at=now(),updated_at=now();
 delete from public.review_items r using private.attempt_keys k,public.attempt_answers a where r.user_id=item.user_id and r.question_id=k.question_id and k.attempt_id=p_attempt and a.attempt_id=k.attempt_id and a.question_id=k.question_id and a.selected_option=k.answer;
 update public.attempts set status='submitted',submitted_at=clock_timestamp(),revision=revision+1 where id=p_attempt;
 return to_jsonb(result);
end $$;

create function public.save_study_plan(p_weeks integer,p_target integer,p_minutes integer,p_start date,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); item public.study_plans;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,1));
 select * into item from public.study_plans where user_id=owner_id for update;
 if found then
  if item.revision is distinct from p_revision then raise exception 'Stale revision'; end if;
  update public.study_plans set weeks=p_weeks,target_score=p_target,minutes_per_day=p_minutes,start_date=p_start,revision=revision+1,updated_at=now() where user_id=owner_id returning * into item;
 else
  if p_revision is distinct from 0 then raise exception 'Stale revision'; end if;
  insert into public.study_plans(user_id,weeks,target_score,minutes_per_day,start_date,revision) values(owner_id,p_weeks,p_target,p_minutes,p_start,1) returning * into item;
 end if;
 return to_jsonb(item);
end $$;
revoke all on function public.start_attempt(integer[],uuid,text,integer),public.save_answer(uuid,integer,integer,integer),public.check_answer(uuid,integer),public.submit_attempt(uuid),public.save_study_plan(integer,integer,integer,date,integer) from public,anon;
grant execute on function public.start_attempt(integer[],uuid,text,integer),public.save_answer(uuid,integer,integer,integer),public.check_answer(uuid,integer),public.submit_attempt(uuid),public.save_study_plan(integer,integer,integer,date,integer) to authenticated;
commit;

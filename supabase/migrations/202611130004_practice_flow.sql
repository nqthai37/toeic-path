begin;
alter table public.attempts add column kind text;
alter table public.attempts add column session_name text;
alter table public.attempt_answers add column checked boolean not null default false;

create function public.practice_snapshot(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.attempts; feedback jsonb;
begin
 select * into item from public.attempts where id=p_attempt and user_id=auth.uid();
 if not found then raise exception 'Attempt unavailable'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('question_id',k.question_id,'answer',k.answer,'explanation',k.explanation,'correct',coalesce(a.selected_option=k.answer,false)) order by q.position),'[]') into feedback
 from private.attempt_keys k join public.attempt_questions q using(attempt_id,question_id) left join public.attempt_answers a using(attempt_id,question_id)
 where k.attempt_id=p_attempt and (item.status='submitted' or (item.mode='learning' and a.checked));
 return jsonb_build_object('attempt',to_jsonb(item),'server_now',clock_timestamp(),
  'questions',(select jsonb_agg(to_jsonb(q) order by position) from public.attempt_questions q where attempt_id=p_attempt),
  'answers',coalesce((select jsonb_object_agg(question_id,selected_option) from public.attempt_answers where attempt_id=p_attempt),'{}'),
  'checked',coalesce((select jsonb_agg(question_id) from public.attempt_answers where attempt_id=p_attempt and checked),'[]'),
  'feedback',feedback,'result',(select to_jsonb(r) from public.attempt_results r where attempt_id=p_attempt));
end $$;

create function public.begin_practice(p_ids integer[],p_key uuid,p_mode text,p_test_id integer,p_kind text,p_owner uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare started jsonb; item public.attempts; duration_seconds integer; label text;
begin
 if auth.uid() is null or auth.uid() is distinct from p_owner then raise exception 'Account changed'; end if;
 if p_kind is null or p_kind not in('part','set','custom','review','reading','timed','diagnostic','daily','today') then raise exception 'Invalid practice kind'; end if;
 if (p_kind='set') is distinct from (p_test_id is not null) then raise exception 'Invalid test selection'; end if;
 started:=public.start_attempt(p_ids,p_key,p_mode,p_test_id);
 select * into item from public.attempts where id=(started->>'id')::uuid for update;
 if item.kind is not null and item.kind<>p_kind then raise exception 'Idempotency key already used for another kind'; end if;
 if item.kind is null then
  duration_seconds:=case when p_kind='reading' then 720 when p_kind='timed' then 900 else coalesce(extract(epoch from(item.expires_at-item.started_at))::integer,0) end;
  label:=case when p_kind='set' then (select 'Test '||lpad(id::text,2,'0')||' · '||title from public.practice_tests where id=p_test_id)
   when p_kind='part' then 'Part '||(select part::text from public.questions where id=p_ids[1])||' practice'
   when p_kind='review' then 'Mistake review' when p_kind='diagnostic' then 'Quick skill check' when p_kind='today' then 'Today’s practice'
   when p_kind='reading' then 'Reading sprint' when p_kind='timed' then '15-minute challenge' else 'Mixed practice' end;
  update public.attempts set kind=p_kind,session_name=label,expires_at=case when mode='timed' then started_at+make_interval(secs=>duration_seconds) else null end where id=item.id;
 end if;
 return public.practice_snapshot(item.id);
end $$;

create function public.save_practice_answer(p_attempt uuid,p_question integer,p_option integer,p_revision integer)
returns integer language plpgsql security definer set search_path='' as $$
declare new_revision integer;
begin
 new_revision:=public.save_answer(p_attempt,p_question,p_option,p_revision);
 update public.attempt_answers set checked=false where attempt_id=p_attempt and question_id=p_question;
 return new_revision;
end $$;

create function public.grade_practice_answer(p_attempt uuid,p_question integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.attempts; feedback jsonb;
begin
 select * into item from public.attempts where id=p_attempt and user_id=auth.uid() for update;
 if not found then raise exception 'Attempt unavailable'; end if;
 if item.mode<>'learning' or item.status<>'open' then raise exception 'Feedback is available in open learning practice only'; end if;
 if not exists(select 1 from public.attempt_answers where attempt_id=p_attempt and question_id=p_question) then raise exception 'Choose an answer first'; end if;
 feedback:=public.check_answer(p_attempt,p_question);
 update public.attempt_answers set checked=true where attempt_id=p_attempt and question_id=p_question;
 return feedback;
end $$;

create function public.complete_practice(p_attempt uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform public.submit_attempt(p_attempt);
 return public.practice_snapshot(p_attempt);
end $$;

create function public.open_practices()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 return coalesce((select jsonb_agg(to_jsonb(a)) from(select id,session_name,started_at,expires_at,mode from public.attempts where user_id=auth.uid() and status='open' order by started_at desc limit 20) a),'[]');
end $$;

create function public.practice_history(p_offset integer default 0)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_offset is null or p_offset<0 or p_offset>100000 then raise exception 'Invalid history offset'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('attemptId',a.id,'date',a.submitted_at,'name',coalesce(a.session_name,'Cloud practice'),'setId',a.test_id,'source','server_practice','server_graded',true,
  'seconds',greatest(0,round(extract(epoch from(least(a.submitted_at,coalesce(a.expires_at,a.submitted_at))-a.started_at)))),
  'answers',(select jsonb_agg(jsonb_build_object('id',k.question_id,'chosen',v.selected_option,'correct',coalesce(v.selected_option=k.answer,false)) order by q.position)
   from private.attempt_keys k join public.attempt_questions q using(attempt_id,question_id) left join public.attempt_answers v using(attempt_id,question_id) where k.attempt_id=a.id)) order by a.submitted_at desc,a.id desc)
  from (select * from public.attempts where user_id=auth.uid() and status='submitted' order by submitted_at desc,id desc limit 100 offset p_offset) a),'[]');
end $$;
revoke all on function public.practice_snapshot(uuid),public.begin_practice(integer[],uuid,text,integer,text,uuid),public.save_practice_answer(uuid,integer,integer,integer),public.grade_practice_answer(uuid,integer),public.complete_practice(uuid),public.open_practices(),public.practice_history(integer) from public,anon;
grant execute on function public.practice_snapshot(uuid),public.begin_practice(integer[],uuid,text,integer,text,uuid),public.save_practice_answer(uuid,integer,integer,integer),public.grade_practice_answer(uuid,integer),public.complete_practice(uuid),public.open_practices(),public.practice_history(integer) to authenticated;
commit;

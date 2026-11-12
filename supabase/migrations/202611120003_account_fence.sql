-- Bind an in-flight save to the account that created it, even during an SDK account switch.
begin;
create or replace function public.save_progress(p_state jsonb,p_session jsonb,p_revision integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare owner_id uuid:=auth.uid(); item public.progress_snapshots; h jsonb; a jsonb; clean_history jsonb:='[]'; cleaned jsonb; option_count integer;
begin
 if owner_id is null then raise exception 'Authentication required'; end if;
 if (p_state->>'_owner_id')::uuid is distinct from owner_id then raise exception 'Account changed; reload before syncing'; end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_state) is distinct from 'object' or octet_length(p_state::text)>5000000 then raise exception 'Invalid progress'; end if;
 if jsonb_typeof(p_state->'weeks') is distinct from 'number' or jsonb_typeof(p_state->'minutes') is distinct from 'number' or jsonb_typeof(p_state->'target') is distinct from 'number' or not(p_state ?& array['weeks','minutes','target','start']) or jsonb_typeof(p_state->'start') is distinct from 'string' or (p_state->>'weeks')::integer not in(4,8,12) or (p_state->>'minutes')::integer not in(20,30,45,60,90,120) or (p_state->>'target')::integer not between 10 and 990 or (p_state->>'target')::integer%5<>0 or p_state->>'start' is null then raise exception 'Invalid preferences'; end if;
 perform (p_state->>'start')::timestamptz;
 if jsonb_typeof(p_state->'history') is distinct from 'array' or jsonb_array_length(p_state->'history')>10000 or jsonb_typeof(p_state->'known') is distinct from 'array' or jsonb_typeof(p_state->'mistakes') is distinct from 'array' or jsonb_typeof(p_state->'vocabDays') is distinct from 'array' then raise exception 'Invalid progress arrays'; end if;
 for h in select * from jsonb_array_elements(p_state->'history') loop
  if jsonb_typeof(h->'name') is distinct from 'string' or jsonb_typeof(h->'date') is distinct from 'string' or jsonb_typeof(h->'seconds') is distinct from 'number' or jsonb_typeof(h->'answers') is distinct from 'array' or jsonb_array_length(h->'answers')>246 or length(h->>'name')>300 or h->>'date' is null or h->>'name' is null or (h->>'seconds')::numeric not between 0 and 86400 then raise exception 'Invalid history'; end if;
  perform (h->>'date')::timestamptz;
  for a in select * from jsonb_array_elements(h->'answers') loop
   select jsonb_array_length(options) into option_count from public.questions where id=(a->>'id')::integer;
   if option_count is null or jsonb_typeof(a->'correct') is distinct from 'boolean' or not(a?'chosen') or ((a->'chosen')<>'null'::jsonb and ((a->>'chosen')::numeric<>trunc((a->>'chosen')::numeric) or (a->>'chosen')::integer not between 0 and option_count-1)) then raise exception 'Invalid history answer'; end if;
  end loop;
  clean_history:=clean_history||jsonb_build_array(jsonb_build_object('date',h->'date','name',h->'name','seconds',h->'seconds','setId',h->'setId','attemptId',h->'attemptId','content_version',h->'content_version','answers',h->'answers','source','client_practice','server_graded',false));
 end loop;
 if exists(select 1 from jsonb_array_elements_text(p_state->'known') x where x::integer not between 0 and 23) or exists(select 1 from jsonb_array_elements_text(p_state->'mistakes') x where not exists(select 1 from public.questions q where q.id=x::integer)) then raise exception 'Invalid progress IDs'; end if;
 perform x::date from jsonb_array_elements_text(p_state->'vocabDays') x;
 if p_session is not null and (jsonb_typeof(p_session) is distinct from 'object' or octet_length(p_session::text)>100000 or jsonb_typeof(p_session->'questionIds') is distinct from 'array' or jsonb_array_length(p_session->'questionIds')>50) then raise exception 'Invalid session'; end if;
 cleaned:=jsonb_build_object('weeks',p_state->'weeks','minutes',p_state->'minutes','target',p_state->'target','start',p_state->'start','history',clean_history,'known',p_state->'known','mistakes',p_state->'mistakes','vocabDays',p_state->'vocabDays');
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text,2));
 select * into item from public.progress_snapshots where user_id=owner_id for update;
 if found then
  if item.revision is distinct from p_revision then raise exception 'Stale revision'; end if;
  update public.progress_snapshots set state=cleaned,session=p_session,revision=revision+1,updated_at=now() where user_id=owner_id returning * into item;
 else
  if p_revision<>0 then raise exception 'Stale revision'; end if;
  insert into public.progress_snapshots(user_id,state,session) values(owner_id,cleaned,p_session) returning * into item;
 end if;
 return jsonb_build_object('revision',item.revision,'updated_at',item.updated_at);
end $$;
revoke all on function public.save_progress(jsonb,jsonb,integer) from public,anon;
grant execute on function public.save_progress(jsonb,jsonb,integer) to authenticated;
commit;

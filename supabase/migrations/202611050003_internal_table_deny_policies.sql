-- Explicitly document that operational/research tables are server-only.
-- service_role retains access through its grants and RLS bypass.
drop policy if exists "deny client access" on public.mc_ai_research_reports;
create policy "deny client access" on public.mc_ai_research_reports for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_audit_events;
create policy "deny client access" on public.mc_audit_events for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_onchain_evidence;
create policy "deny client access" on public.mc_onchain_evidence for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_project_identities;
create policy "deny client access" on public.mc_project_identities for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_research_jobs;
create policy "deny client access" on public.mc_research_jobs for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_revival_assessments;
create policy "deny client access" on public.mc_revival_assessments for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_revival_case_events;
create policy "deny client access" on public.mc_revival_case_events for all to anon, authenticated using (false) with check (false);
drop policy if exists "deny client access" on public.mc_revival_cases;
create policy "deny client access" on public.mc_revival_cases for all to anon, authenticated using (false) with check (false);
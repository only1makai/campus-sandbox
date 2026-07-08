-- Session 11: narrow self-read policy so the "Upvoted" personal view can
-- query karma_ledger. Deliberately narrow — a user can only ever see ledger
-- rows where THEY are the actor (upvotes/reviews they personally gave),
-- never another user's ledger data. karma_ledger otherwise still has no
-- anon surface at all; this does not touch the append-only or
-- verified/cosmetic guardrails (see CLAUDE.md).
create policy "users can read their own actor rows"
  on karma_ledger for select
  using (auth.uid() = actor_id);

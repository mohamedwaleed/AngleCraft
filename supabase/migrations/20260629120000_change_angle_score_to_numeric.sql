-- Allow decimal angle scores. Deterministic scoring produces values on a
-- 1-10 scale (e.g. 7.9) which the previous integer column could not store.
alter table ad_angles
  alter column score type numeric(5,2) using score::numeric;

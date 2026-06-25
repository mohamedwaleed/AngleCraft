-- Add `generating_angles` to the session_status enum.
-- This intermediate state sits between `analyzing` (buyer insights saved) and
-- `angles_generated` (five ad angles saved). It lets the status pipeline show
-- the "Generating ad angles" step as in-progress while /api/angles runs.

alter type session_status add value if not exists 'generating_angles';

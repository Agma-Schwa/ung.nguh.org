-- MIGRATION
--
-- Drop the 'active' column and add a 'deleted' column instead.
ALTER TABLE nations DROP COLUMN active;
ALTER TABLE nations ADD COLUMN deleted INTEGER NOT NULL DEFAULT FALSE;

-- MIGRATION
--
-- Unset represented nation if the nation is deleted or an observer, or if the
-- member is not actually a member of the nation; this happened due to an error
-- in a query.
UPDATE members
SET represented_nation = NULL
WHERE members.discord_id NOT IN (
    SELECT memberships.member FROM memberships
    WHERE memberships.nation = members.represented_nation
) OR members.represented_nation IN (
    SELECT nations.id FROM nations
    WHERE nations.id = members.represented_nation AND (nations.observer = TRUE OR nations.deleted = TRUE)
);

-- Query to verify that the migration above is correct.
SELECT members.display_name, members.represented_nation, nations.name FROM members
JOIN nations ON members.represented_nation = nations.id
WHERE members.discord_id NOT IN (
    SELECT memberships.member FROM memberships
    WHERE memberships.nation = members.represented_nation
) OR nations.observer = TRUE OR nations.deleted = TRUE;

-- MIGRATION
--
-- The 'absentia voting' flag is repurposed to mean 'allow users to join the current meeting'.
-- Ensure it starts out disabled.
UPDATE global_vars
SET value = FALSE
WHERE id = 1;

-- MIGRATION
--
-- We’ve completely changed how this table works.
DROP TABLE meeting_participants; -- Make sure to also run the new CREATE TABLE stmt from ung-schema.sql.
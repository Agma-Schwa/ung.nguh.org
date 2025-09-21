CREATE TABLE IF NOT EXISTS nations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    active INTEGER NOT NULL DEFAULT TRUE, -- Inactive countries can't do anything.
    observer INTEGER NOT NULL DEFAULT FALSE, -- Whether this is an observer ŋation.
    name TEXT NOT NULL,
    banner_url TEXT,
    wiki_page_link TEXT
) STRICT;

CREATE TABLE IF NOT EXISTS members (
    discord_id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    updated INTEGER NOT NULL DEFAULT (unixepoch()),
    active INTEGER NOT NULL DEFAULT TRUE, -- Inactive accounts can't do anything.
    represented_nation INTEGER DEFAULT NULL, -- The nation this member currently represents, if any.
    administrator INTEGER NOT NULL DEFAULT FALSE,
    staff_only INTEGER NOT NULL DEFAULT FALSE, -- Account is a staff account that cannot vote or be a ŋation member.
    FOREIGN KEY (represented_nation) REFERENCES nations(id) ON DELETE SET NULL
) STRICT;

CREATE TABLE IF NOT EXISTS memberships (
    member INTEGER NOT NULL,
    nation INTEGER NOT NULL,
    ruler INTEGER NOT NULL DEFAULT FALSE,
    PRIMARY KEY (member, nation),
    FOREIGN KEY (member) REFERENCES members(discord_id),
    FOREIGN KEY (nation) REFERENCES nations(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS meetings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS motions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author INTEGER NOT NULL,
    type INTEGER NOT NULL,
    title TEXT NOT NULL,
    text TEXT NOT NULL,

    -- NULL or the meeting for which this is/was on the agenda.
    meeting INTEGER,

    -- The time at which this motion was first created.
    created INTEGER NOT NULL DEFAULT (unixepoch()),

    -- A locked motion can only be edited by admins.
    locked INTEGER NOT NULL DEFAULT FALSE,

    -- Whether voting on this is enabled. Closing a motion also disables it unless
    -- it is a constitutional motion.
    enabled INTEGER NOT NULL DEFAULT FALSE,

    -- Maximum number of eligible voters for this motion. This is only for the initial
    -- vote on the motion. Constitutional support is handled separately.
    quorum INTEGER NOT NULL DEFAULT FALSE,

    -- If this is a constitutional motion, whether we have constitutional support.
    supported INTEGER NOT NULL DEFAULT FALSE,

    -- Whether this motion has passed.
    passed INTEGER NOT NULL DEFAULT FALSE,

    -- Whether this motion is closed, a closed motion's outcome cannot be changed.
    closed INTEGER NOT NULL DEFAULT FALSE,
    FOREIGN KEY (author) REFERENCES members(discord_id)
) STRICT;

-- A lot of the fields in this table are not nullable, but they may be empty.
CREATE TABLE IF NOT EXISTS admissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Admission ID.

    -- This is a partial copy of columns from the 'members' table.
    discord_id INTEGER NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL,
    updated INTEGER NOT NULL DEFAULT (unixepoch()),

    -- Admission form data.
    name TEXT NOT NULL, -- Name of the country.
    ruler TEXT NOT NULL, -- Name of the ruler.
    banner_text TEXT NOT NULL, -- Description of the banner
    banner_url TEXT NOT NULL, -- URL of the banner
    claim_text TEXT NOT NULL, -- Description of the claim
    claim_url TEXT NOT NULL, -- URL of the claim image
    trivia TEXT NOT NULL, -- Extra info

    -- Whether this admission has passed.
    passed INTEGER NOT NULL DEFAULT FALSE,

    -- Whether this motion is closed, a closed admission
    -- cannot be voted on.
    closed INTEGER NOT NULL DEFAULT FALSE
) STRICT;

CREATE TABLE IF NOT EXISTS votes (
    motion INTEGER NOT NULL,
    member INTEGER NOT NULL,
    nation INTEGER NOT NULL,
    vote INTEGER NOT NULL, -- '0' = No, '1' = Aye
    PRIMARY KEY (motion, nation),
    FOREIGN KEY (motion) REFERENCES motions(id) ON DELETE CASCADE,
    FOREIGN KEY (member) REFERENCES members(discord_id),
    FOREIGN KEY (nation) REFERENCES nations(id) -- NO cascading here! Votes MUST NOT be deleted ever!!!
) STRICT;

CREATE TABLE IF NOT EXISTS admission_votes (
    admission INTEGER NOT NULL,
    member INTEGER NOT NULL,
    nation INTEGER NOT NULL,
    vote INTEGER NOT NULL, -- '0' = No, '1' = Aye
    PRIMARY KEY (admission, nation),
    FOREIGN KEY (admission) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (member) REFERENCES members(discord_id),
    FOREIGN KEY (nation) REFERENCES nations(id) -- NO cascading here! Votes MUST NOT be deleted ever!!!
) STRICT;

CREATE TABLE IF NOT EXISTS meeting_participants (
    nation INTEGER PRIMARY KEY,
    absentee_voter INTEGER NOT NULL DEFAULT FALSE,
    FOREIGN KEY (nation) REFERENCES nations(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE IF NOT EXISTS global_vars (
    id INTEGER PRIMARY KEY,
    value INTEGER NOT NULL
) STRICT;

INSERT OR IGNORE INTO global_vars (id, value) VALUES
    (0, FALSE),
    (1, FALSE)
;

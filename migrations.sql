-- Migration
--
-- Add more statuses other than just ‘passed/rejected/supported’
ALTER TABLE motions RENAME COLUMN passed TO reason;
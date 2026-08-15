-- Revocation boundary: a non-active account cannot retain sessions that may
-- become valid again if an operator later restores the account status.
-- Serialize status writes until the cleanup and trigger installation commit;
-- otherwise a live status change could fall between those two protections.
LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;

-- Purge legacy rows created before this trigger existed. Session rows are
-- revocable credentials, so removing them is the safe upgrade behavior.
DELETE FROM sessions
USING users
WHERE sessions.user_id = users.id
  AND users.status <> 'active';

CREATE OR REPLACE FUNCTION sylora_revoke_sessions_on_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'active' AND NEW.status <> 'active' THEN
    DELETE FROM sessions WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_revoke_sessions_on_status_change ON users;
CREATE TRIGGER users_revoke_sessions_on_status_change
AFTER UPDATE OF status ON users
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sylora_revoke_sessions_on_user_status_change();

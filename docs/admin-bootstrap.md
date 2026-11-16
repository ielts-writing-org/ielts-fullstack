# One-time initial Admin bootstrap

The application does not grant Admin based on email during login. Run this procedure once, after the initial database migration is applied and the intended account has completed GitHub sign-in.

1. In the D1 console, verify the target account and its linked GitHub identity. Compare the `account_id` with the GitHub numeric account ID from the trusted GitHub profile; do not rely on email alone.

   ```sql
   SELECT users.id, users.email, users.email_verified, accounts.provider_id, accounts.account_id
   FROM users
   JOIN accounts ON accounts.user_id = users.id
   WHERE lower(users.email) = lower('letanphong400@gmail.com')
     AND accounts.provider_id = 'github';
   ```

2. Replace `<verified-user-id>` and `<verified-github-account-id>` in the statements below with the values you just verified. Execute all three statements in order. The audit row first reserves the one-time bootstrap; retries can finish a reserved bootstrap after an interruption. A completed marker prevents this procedure from granting Admin again if the account is later demoted.

   ```sql
   INSERT INTO admin_audit_logs
     (id, actor_user_id, action, target_type, target_id, metadata, created_at, updated_at)
   SELECT lower(hex(randomblob(16))), users.id, 'admin.bootstrap.initial', 'user', users.id,
          json_object('state', 'reserved', 'method', 'manual-verified-github-bootstrap'),
          cast(unixepoch('subsecond') * 1000 as integer),
          cast(unixepoch('subsecond') * 1000 as integer)
   FROM users
   WHERE users.id = '<verified-user-id>'
     AND lower(users.email) = lower('letanphong400@gmail.com')
     AND users.email_verified = 1
     AND (users.role IS NULL OR users.role = 'user')
     AND EXISTS (
       SELECT 1 FROM accounts
       WHERE accounts.user_id = users.id
         AND accounts.provider_id = 'github'
         AND accounts.account_id = '<verified-github-account-id>'
     )
     AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
     AND NOT EXISTS (
       SELECT 1 FROM admin_audit_logs WHERE action = 'admin.bootstrap.initial'
     );

   UPDATE users
   SET role = 'admin'
   WHERE id = '<verified-user-id>'
     AND lower(email) = lower('letanphong400@gmail.com')
     AND email_verified = 1
     AND (role IS NULL OR role = 'user')
     AND EXISTS (
       SELECT 1 FROM accounts
       WHERE accounts.user_id = users.id
         AND accounts.provider_id = 'github'
         AND accounts.account_id = '<verified-github-account-id>'
     )
     AND EXISTS (
       SELECT 1 FROM admin_audit_logs
       WHERE action = 'admin.bootstrap.initial'
         AND target_id = users.id
         AND json_extract(metadata, '$.state') = 'reserved'
     )
     AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');

   UPDATE admin_audit_logs
   SET metadata = json_set(metadata, '$.state', 'completed'),
       updated_at = cast(unixepoch('subsecond') * 1000 as integer)
   WHERE action = 'admin.bootstrap.initial'
     AND target_id = '<verified-user-id>'
     AND json_extract(metadata, '$.state') = 'reserved'
     AND EXISTS (
       SELECT 1 FROM users
       WHERE users.id = '<verified-user-id>' AND users.role = 'admin'
     );
   ```

3. Verify that exactly the intended user has `role = 'admin'`, and that the marker metadata says `completed`. The Admin navigation appears after the user’s next request. No code path automatically re-grants this role on later logins.

This repository has not verified the production D1 user/GitHub IDs and has not run these statements. Do not run them against production until the returned identity values have been manually confirmed.

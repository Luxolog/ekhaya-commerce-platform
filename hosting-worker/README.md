# Ekhaya notification email worker (cPanel)

This worker sends pending rows from `public.user_notifications` using the existing `hello@ekhayatech.co.za` mailbox over SMTP/TLS port 465. It does not use Resend.

## Important security rules

- Run the worker only from cPanel Cron Jobs / PHP CLI.
- Keep both `notifications.php` and the real `config.php` outside `public_html`.
- Never commit the real `config.php`, Supabase service-role key, or mailbox password.
- Use the Supabase service-role key only in this private server-side file.
- The script claims each pending row before sending, to reduce duplicate sends from overlapping cron runs.

## cPanel installation

1. In cPanel File Manager, create a private folder outside `public_html`, for example `/home/CPANELUSER/ekhaya-notifications/`.
2. Upload `notifications.php` into that folder.
3. Copy `config.example.php` to the same folder and name the copy `config.php`.
4. Edit the private `config.php`:
   - `supabase_url`: the project's Supabase API URL.
   - `service_role_key`: the project's service-role/secret key (Supabase Dashboard → Project Settings → API Keys). Keep it private.
   - `smtp_host`: `mail.ekhayatech.co.za`
   - `smtp_port`: `465`
   - `smtp_user`: `hello@ekhayatech.co.za`
   - `smtp_password`: the mailbox password for hello@.
5. In cPanel → Cron Jobs, add a job every 5 minutes. Use the PHP binary path shown by cPanel and the absolute path to the worker, for example:
   `/usr/local/bin/php /home/CPANELUSER/ekhaya-notifications/notifications.php`
   Replace `CPANELUSER` and the PHP path with the actual values shown in your hosting account.
6. Run the command once manually from cPanel Terminal (if available) or temporarily schedule it for every minute. Confirm the output says no pending emails, or shows the number sent. Then set the schedule to every five minutes.

## How it works

- The database creates pending email jobs when a seller reaches 10, 5, 2 or 0 searches remaining.
- The worker checks up to 25 pending jobs each run.
- It resolves each account's email from Supabase Auth and sends an HTML + plain-text email.
- It records `sent`, `failed`, or `skipped` in `user_notifications.email_status`.
- Notifications remain visible in the in-app notification centre independently of email delivery.

## Testing

Before enabling the cron job for all sellers, create a test notification for an account whose mailbox you control and run the worker once. Confirm delivery and the database status becomes `sent`.

Do not paste mailbox passwords or service-role keys into chat.

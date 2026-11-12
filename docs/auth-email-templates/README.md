# Ekhaya Price Checker — Supabase Auth email templates

Use these HTML templates in the Supabase project `itxxnhcjjiynrmivexcb`.

## Sender identity
- Sender name: Ekhaya Technologies
- Sender email: hello@ekhayascents.co.za

The custom SMTP sender must already be configured and verified in **Authentication → Emails → SMTP Settings**. These HTML templates do not configure SMTP credentials or DNS.

## Install the templates
1. Open Supabase Dashboard → Authentication → Email Templates.
2. Open **Reset Password** and replace its body with the contents of `password-reset.html`.
3. Open **Confirm signup** and replace its body with the contents of `confirm-signup.html`.
4. Save each template.
5. In Authentication → URL Configuration, allow the exact app origin and the `/account/` redirect path used by the password recovery request.

Both templates preserve Supabase's `{{ .ConfirmationURL }}` action URL. Do not replace it with a guessed or hard-coded URL.

## Test before launch
- Request a password reset for a test seller and confirm delivery from hello@ekhayascents.co.za.
- Open the link on desktop and Android; confirm it returns to the app and permits a password update.
- Create a test seller and verify the confirmation link.
- Check spam placement and sender authentication (SPF, DKIM, and DMARC) with the mail provider.

Do not announce the subscription model until these account email flows and the scanner/photo identification flow pass testing.

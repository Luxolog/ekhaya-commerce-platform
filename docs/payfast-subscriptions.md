# PayFast subscription integration

## Runtime modes

The application uses one server-side mode switch:

- `PAYFAST_MODE=sandbox` selects PayFast Sandbox and the existing `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, and `PAYFAST_PASSPHRASE` secrets. Optional explicit sandbox names are `PAYFAST_SANDBOX_MERCHANT_ID`, `PAYFAST_SANDBOX_MERCHANT_KEY`, and `PAYFAST_SANDBOX_PASSPHRASE`.
- `PAYFAST_MODE=live` selects the live PayFast endpoint and requires `PAYFAST_LIVE_MERCHANT_ID`, `PAYFAST_LIVE_MERCHANT_KEY`, and `PAYFAST_LIVE_PASSPHRASE`.

Never put credentials in frontend variables, source control, or browser code. Keep the live secrets absent until the merchant is ready for live payment acceptance. Switching mode is a server-side secrets change, not a client option.

Required application secret:

- `APP_BASE_URL=https://pricechecker.ekhayatech.co.za`

## Edge Functions

- `payfast-checkout`: authenticated user endpoint; validates the Supabase bearer token, reads the authoritative active plan price from `billing_plans`, creates pending billing records, signs the PayFast form, and returns the correct PayFast endpoint and form fields.
- `payfast-itn`: public PayFast webhook; signature-checks the notification, checks merchant identity, asks PayFast to validate the original notification, verifies the expected gross amount, and processes successful/failed/cancelled payments. It is configured with `verify_jwt=false` because PayFast cannot send a Supabase user JWT; all provider checks are performed in the handler.

## Subscription behavior

- Manual renewal is a monthly one-off payment and must be renewed by the customer.
- Automatic renewal uses PayFast recurring subscriptions (monthly, indefinite cycles) and is card-only.
- The subscription is activated only after a validated COMPLETE ITN.
- Recurring ITNs are deduplicated by PayFast payment ID and extend the existing subscription period.
- Checkout currently prevents creating a second active subscription for the same user. Plan changes and cancellation controls require the follow-on management/API work.

## Deployment checklist

1. Confirm the sandbox merchant ID, key, and salt passphrase in Supabase Edge Function Secrets.
2. Set `APP_BASE_URL` to the production Price Checker origin.
3. Deploy both new Edge Functions with the configuration in `supabase/config.toml`.
4. Test manual and automatic subscription payments in Sandbox, including failed payment and duplicate ITN cases.
5. Review logs and database state before any live-mode switch.
6. For live mode, add the three `PAYFAST_LIVE_*` secrets, verify recurring billing is enabled on the live PayFast merchant account, then deliberately set `PAYFAST_MODE=live`.

Do not deploy this integration or switch to live until the sandbox test checklist is complete and the owner approves the live switch.

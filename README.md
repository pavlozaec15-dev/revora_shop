# REVORA Shop

Static storefront and Vercel serverless API; Supabase project `mqsytqicykgtbjjvaroa`.

## Server configuration in Vercel

Set these environment variables for the deployment environment, then redeploy:

- `SUPABASE_URL=https://mqsytqicykgtbjjvaroa.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: server-only Supabase service role key. Never put it in HTML, browser scripts, Git, or a public-prefixed variable.
- `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`: optional notifications after persistence.

`POST /api/new-order` validates contacts and cart, calculates prices using `products.js`, and writes canonical `orders` fields. Checkout succeeds only after confirmed persistence. A UUID order number provides retry deduplication. Telegram failure does not undo a saved order; failed notifications must be checked in the admin panel.

Only cash on delivery is currently supported. Card payment remains disabled until a payment provider is integrated. Public browser access to `orders` is denied by RLS. Active owners and managers can read/create/update orders; only owners can delete. Editors have no access to customer orders.

Database schema and policies: `supabase/orders.sql`. The schema changes were already applied to the project above. The admin panel reads `total_amount` and translates stored status codes into Ukrainian.

Run verification with `node --test tests/new-order.test.mjs`.

Before accepting live orders, configure server variables and test a real checkout on a Vercel preview. Verify the order appears in the admin panel, retry does not duplicate it, and anonymous Supabase requests cannot read customer data. Add infrastructure-level rate limits/bot protection to the public endpoint before wider advertising; per-process limits are insufficient on serverless infrastructure.

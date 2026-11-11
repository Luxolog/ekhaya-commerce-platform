# ReefAPI Takealot integration

## Current implementation

The Price Checker search route now calls ReefAPI's live Takealot search endpoint from the server:

- Endpoint: `POST https://api.reefapi.com/takealot/v1/search`
- Authentication: `x-reefapi-key` request header
- Request body: `{ "query": "<barcode or product name>", "country": "za", "sort": "relevance" }`
- Server environment variable: `REEFAPI_KEY`

The browser never receives the ReefAPI key. Do not place the key in a `NEXT_PUBLIC_*` variable, source code, screenshots, commits, or client-side requests.

## Configure the key

Add `REEFAPI_KEY` to the server-side environment for local development and the deployed application.

For local development, put this in the ignored `.env.local` file:

```env
REEFAPI_KEY=your_rotated_reefapi_key
```

For production, add the same variable in the hosting provider's server environment settings and redeploy. Never commit `.env.local`.

## Current user experience

- Takealot search returns live catalogue listings, price, brand, product image, rating, stock status, delivery estimate and barcode when available.
- Amazon SA and Makro remain visible as not connected; no prices are fabricated for them.
- Search results are candidates. Users must verify the exact model, variant, seller and checkout price before purchasing.
- The existing profit calculator can use a returned Takealot price.

## ReefAPI credit notes

The ReefAPI action schema reports 1 credit for each Takealot `search`, `product/detail`, and `product/offers` request. Search returns up to 36 products per page. Avoid automatic detail/offer calls for every result; request those only when a user opens a product.

## Not yet implemented

- Durable user accounts and search allowances
- Atomic quota deductions and monthly subscription billing
- Product detail / seller-offer drill-down in the Price Checker UI
- Amazon SA and Makro data sources
- Production verification of the deployed server environment

## Security action

If an API key has been pasted into a chat, screenshot, source file, or public repository, rotate it in ReefAPI and update the server environment with the replacement. Do not reuse the exposed key.

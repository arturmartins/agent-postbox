# Agent Postbox

Pay once over HTTP and a real holiday postcard is printed and mailed. No account, no API key: payment is the authentication, via the [Machine Payments Protocol](https://mpp.dev).

Built for the Stripe MPP hackathon.

## How it works

1. `POST /v1/postcards` with an order (recipient address, message, design).
2. Invalid orders get `422` before any payment is taken. Valid orders get `402` with a `WWW-Authenticate: Payment` challenge.
3. The caller pays and retries with the credential.
4. The service sends the card to the print-and-mail provider and returns `201` with the postcard id, a preview link, the expected delivery date and a `Payment-Receipt` header.

| Route | Paid | Purpose |
|---|---|---|
| `POST /v1/postcards` | yes | Print and mail one postcard |
| `GET /v1/postcards/:id` | no | Order status |
| `GET /v1/designs` | no | Available front designs |
| `GET /openapi.json` | no | Price and request schema (`x-payment-info`) |
| `GET /llms.txt` | no | What an agent is buying |

## Run locally

Requires Node 22.18+.

```bash
npm install
cp .env.example .env   # set MPP_SECRET_KEY (openssl rand -hex 32) and RECIPIENT_ADDRESS
npm run dev
```

Pay for a card from a funded testnet wallet:

```bash
npx mppx account create --network testnet && npx mppx account fund --network testnet
npx mppx http://localhost:3000/v1/postcards -J '{"to":{"name":"Ada Lovelace","address_line1":"210 King St","city":"San Francisco","state":"CA","postal_code":"94107"},"message":"Merry Christmas!"}'
npx mppx validate http://localhost:3000
```

## Configuration

| Variable | Notes |
|---|---|
| `MPP_SECRET_KEY` | Required. Binds challenges to this server. |
| `RECIPIENT_ADDRESS` | Required. Tempo wallet that receives payments. Use a separate wallet for mainnet. |
| `TEMPO_NETWORK` | `testnet` (default) or `mainnet`. |
| `PRICE_USD` | Price per postcard. Default `3.00`. |
| `PUBLIC_URL` | Public base URL once deployed. |
| `LOB_API_KEY` | Optional. Without it cards are rendered but not mailed. A `test_` key returns a print proof; a `live_` key mails for real. |
| `LOB_FROM` | Optional JSON return address (US). |

Orders and replay protection are kept in memory, so run a single instance.

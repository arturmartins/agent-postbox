import { randomUUID } from 'node:crypto'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { Store } from 'mppx'
import { Mppx, discovery, tempo } from 'mppx/hono'
import { designs, findDesign } from './designs.ts'
import { lobProvider, mockProvider, type MailProvider, type Postcard } from './mail.ts'
import { PostcardOrder, exampleOrder, orderJsonSchema } from './order.ts'

const env = process.env
const PORT = Number(env.PORT ?? 3000)
const PRICE = env.PRICE_USD ?? '3.00'
const TESTNET = (env.TEMPO_NETWORK ?? 'testnet') !== 'mainnet'
const OUSD = '0x20c0000000000000000000006a37DA5C996874BE'

if (!env.MPP_SECRET_KEY) throw new Error('MPP_SECRET_KEY is required (openssl rand -hex 32)')
if (!env.RECIPIENT_ADDRESS) throw new Error('RECIPIENT_ADDRESS is required (your Tempo wallet address)')

const mail: MailProvider = env.LOB_API_KEY
  ? lobProvider(env.LOB_API_KEY, env.LOB_FROM ? JSON.parse(env.LOB_FROM) : undefined)
  : mockProvider

const mppx = Mppx.create({
  methods: [
    tempo.charge({
      // On mainnet, omitting currencies offers OUSD first with USDC.e as fallback.
      ...(TESTNET ? { currencies: [OUSD] } : {}),
      recipient: env.RECIPIENT_ADDRESS as `0x${string}`,
      testnet: TESTNET,
      // Single long-lived process, so an in-memory store is enough for replay protection.
      store: Store.memory(),
    }),
  ],
  secretKey: env.MPP_SECRET_KEY,
  ...(env.PUBLIC_URL ? { realm: new URL(env.PUBLIC_URL).host } : {}),
})

const orders = new Map<string, Postcard>()
const orderPayloads = new Map<string, PostcardOrder>()

const baseUrl = (req: Request) => {
  if (env.PUBLIC_URL) return env.PUBLIC_URL.replace(/\/$/, '')
  const url = new URL(req.url)
  const proto = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '')
  return `${proto}://${req.headers.get('x-forwarded-host') ?? url.host}`
}

const app = new Hono<{ Variables: { order: PostcardOrder } }>()

const paid = mppx.charge({ amount: PRICE, description: 'One holiday postcard, printed and mailed' })

app.post(
  '/v1/postcards',
  // Validate before charging: the payment triggers a real-world action that can't be undone.
  async (c, next) => {
    const raw = (await c.req.text()).trim()
    const hasCredential = /^Payment\s/i.test(c.req.header('authorization') ?? '')
    if (!raw) {
      if (hasCredential) return c.json({ error: 'missing_order', detail: 'Send the postcard order as the JSON body.' }, 400)
      return next() // No order and no payment yet: let mppx answer with the 402 challenge.
    }
    let json: unknown
    try {
      json = JSON.parse(raw)
    } catch {
      return c.json({ error: 'invalid_json' }, 400)
    }
    const parsed = PostcardOrder.safeParse(json)
    if (!parsed.success) {
      return c.json({ error: 'invalid_order', issues: parsed.error.issues, example: exampleOrder }, 422)
    }
    c.set('order', parsed.data)
    return next()
  },
  paid,
  async (c) => {
    const order = c.get('order')
    try {
      const card = await mail.send(order, { idempotencyKey: randomUUID(), baseUrl: baseUrl(c.req.raw) })
      orders.set(card.id, card)
      orderPayloads.set(card.id, order)
      return c.json({ postcard: card, status_url: `${baseUrl(c.req.raw)}/v1/postcards/${card.id}` }, 201)
    } catch (err) {
      // Payment already settled: keep the receipt and the failure on record so it can be refunded.
      const id = `psc_failed_${randomUUID().replaceAll('-', '').slice(0, 16)}`
      const error = err instanceof Error ? err.message : String(err)
      console.error(`[postbox] ${id} paid but not sent: ${error}`)
      return c.json({ error: 'mail_provider_failed', postcard_id: id, detail: error, refund: 'Keep the Payment-Receipt header; this order is flagged for refund.' }, 502)
    }
  },
)

app.get('/v1/postcards/:id', (c) => {
  const card = orders.get(c.req.param('id'))
  return card ? c.json({ postcard: card }) : c.json({ error: 'not_found' }, 404)
})

app.get('/v1/postcards/:id/front.svg', (c) => {
  const order = orderPayloads.get(c.req.param('id'))
  if (!order) return c.json({ error: 'not_found' }, 404)
  return c.body(findDesign(order.design)!.svg(), 200, { 'content-type': 'image/svg+xml' })
})

app.get('/v1/designs', (c) =>
  c.json({
    designs: designs.map((d) => ({ id: d.id, name: d.name, description: d.description, preview_url: `${baseUrl(c.req.raw)}/v1/designs/${d.id}.svg` })),
  }),
)

app.get('/v1/designs/:file', (c) => {
  const design = findDesign(c.req.param('file').replace(/\.svg$/, ''))
  return design ? c.body(design.svg(), 200, { 'content-type': 'image/svg+xml' }) : c.json({ error: 'not_found' }, 404)
})

app.get('/llms.txt', (c) =>
  c.text(`# Agent Postbox

> Pay once over HTTP and a real holiday postcard is printed and mailed to any address. No account, no API key: payment is the authentication (Machine Payments Protocol).

## What you're buying
- One 4x6 postcard: a holiday design on the front, your message (up to 350 characters) on the back, delivered by post.
- Price: ${PRICE} USD per postcard, paid with ${TESTNET ? 'Tempo testnet stablecoins (OUSD)' : 'Tempo stablecoins'}.
- Delivery: about 5 business days in the US, longer internationally.

## How to order
1. GET ${baseUrl(c.req.raw)}/v1/designs to pick a design id.
2. POST ${baseUrl(c.req.raw)}/v1/postcards with a JSON body (schema and example in /openapi.json).
3. You get HTTP 402 with a WWW-Authenticate: Payment challenge. Pay it and retry the same request with the credential.
4. You get 201 with the postcard id, a preview link and the expected delivery date. The Payment-Receipt header is your proof of purchase.

Invalid orders get 422 before any payment is taken. Check a postcard later with GET /v1/postcards/{id}.

## Endpoints
- POST /v1/postcards (paid): send a postcard
- GET /v1/designs: list designs
- GET /v1/postcards/{id}: order status
- GET /openapi.json: machine-readable price and schema
`),
)

app.get('/', (c) =>
  c.html(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Agent Postbox</title>
<style>body{font-family:Georgia,serif;max-width:760px;margin:40px auto;padding:0 16px;color:#1d2b3a;background:#f7f1e3}img{width:100%;border-radius:8px;box-shadow:0 4px 18px #0002}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}pre{background:#1d2b3a;color:#eef3fb;padding:14px;border-radius:8px;overflow:auto;font-size:13px}</style></head>
<body><h1>Agent Postbox</h1><p>Your agent pays ${PRICE} USD over HTTP and a real holiday postcard is printed and mailed. No signup and no API key: payment is the authentication, via the <a href="https://mpp.dev">Machine Payments Protocol</a>.</p>
<div class="g">${designs.map((d) => `<figure><img src="/v1/designs/${d.id}.svg" alt="${d.name}"><figcaption>${d.name}</figcaption></figure>`).join('')}</div>
<h2>Try it</h2><pre>npx mppx ${baseUrl(c.req.raw)}/v1/postcards \\
  -X POST -H 'content-type: application/json' \\
  -d '${JSON.stringify(exampleOrder)}'</pre>
<p><a href="/openapi.json">openapi.json</a> · <a href="/llms.txt">llms.txt</a></p></body></html>`),
)

discovery(app, mppx, {
  info: { title: 'Agent Postbox', version: '1.0.0' },
  serviceInfo: { categories: ['physical-world', 'mail', 'holiday'], docs: { llms: '/llms.txt', homepage: '/' } },
  routes: [
    {
      handler: paid,
      method: 'post',
      path: '/v1/postcards',
      summary: 'Print and mail one holiday postcard to a physical address',
      requestBody: { required: true, content: { 'application/json': { schema: orderJsonSchema } } },
    },
  ],
})

serve({ fetch: app.fetch, port: PORT }, (info) =>
  console.log(`Agent Postbox on :${info.port} · ${TESTNET ? 'testnet' : 'MAINNET'} · mail=${mail.name} · price=${PRICE}`),
)

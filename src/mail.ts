import { randomUUID } from 'node:crypto'
import { findDesign } from './designs.ts'
import type { PostcardOrder } from './order.ts'

export type Postcard = {
  id: string
  provider: 'mock' | 'lob'
  status: 'rendered' | 'queued_for_print' | 'failed'
  mailed: boolean
  design: string
  to: { name: string; city: string; country: string }
  preview_url: string
  proof_pdf_url?: string
  expected_delivery_date?: string
  created_at: string
  error?: string
}

export interface MailProvider {
  name: Postcard['provider']
  send(order: PostcardOrder, opts: { idempotencyKey: string; baseUrl: string }): Promise<Postcard>
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const frontHtml = (order: PostcardOrder) =>
  `<html><body style="margin:0;width:6.25in;height:4.25in;overflow:hidden">${findDesign(order.design)!.svg().replace('<svg ', '<svg style="width:6.25in;height:4.25in" ')}</body></html>`

// Lob keeps the right half of the back for the address block, so the message lives on the left.
export const backHtml = (order: PostcardOrder) =>
  `<html><body style="margin:0;width:6.25in;height:4.25in;font-family:Georgia,serif">
    <div style="position:absolute;left:0.4in;top:0.45in;width:2.6in;font-size:12pt;line-height:1.4;color:#1d2b3a;white-space:pre-wrap">${escapeHtml(order.message)}</div>
    ${order.from_name ? `<div style="position:absolute;left:0.4in;bottom:0.5in;font-style:italic;font-size:12pt">— ${escapeHtml(order.from_name)}</div>` : ''}
    <div style="position:absolute;left:0.4in;bottom:0.25in;font-size:7pt;color:#7a8794">Paid by an AI agent via the Machine Payments Protocol · Agent Postbox</div>
  </body></html>`

const deliveryEstimate = (businessDays: number) => {
  const d = new Date()
  while (businessDays > 0) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) businessDays--
  }
  return d.toISOString().slice(0, 10)
}

const summary = (order: PostcardOrder) => ({ name: order.to.name, city: order.to.city, country: order.to.country })

/** Renders the card but never mails it. Default until a Lob key is configured. */
export const mockProvider: MailProvider = {
  name: 'mock',
  async send(order, { baseUrl }) {
    const id = `psc_mock_${randomUUID().replaceAll('-', '').slice(0, 16)}`
    return {
      id,
      provider: 'mock',
      status: 'rendered',
      mailed: false,
      design: order.design,
      to: summary(order),
      preview_url: `${baseUrl}/v1/postcards/${id}/front.svg`,
      expected_delivery_date: deliveryEstimate(order.to.country === 'US' ? 5 : 10),
      created_at: new Date().toISOString(),
    }
  },
}

/** Lob print & mail. A `test_` key renders a proof and never mails; a `live_` key mails for real. */
export const lobProvider = (apiKey: string, sender?: Record<string, string>): MailProvider => ({
  name: 'lob',
  async send(order, { idempotencyKey, baseUrl }) {
    const body = {
      description: `Agent Postbox ${idempotencyKey}`,
      size: '4x6',
      to: {
        name: order.to.name,
        address_line1: order.to.address_line1,
        address_line2: order.to.address_line2,
        address_city: order.to.city,
        address_state: order.to.state,
        address_zip: order.to.postal_code,
        address_country: order.to.country,
      },
      ...(sender ? { from: sender } : {}),
      front: frontHtml(order),
      back: backHtml(order),
      use_type: 'operational',
    }
    const res = await fetch('https://api.lob.com/v1/postcards', {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(body),
    })
    const json = (await res.json()) as any
    if (!res.ok) throw new Error(`Lob ${res.status}: ${json?.error?.message ?? 'unknown error'}`)
    return {
      id: json.id,
      provider: 'lob',
      status: 'queued_for_print',
      mailed: apiKey.startsWith('live_'),
      design: order.design,
      to: summary(order),
      preview_url: json.thumbnails?.[0]?.large ?? `${baseUrl}/v1/postcards/${json.id}/front.svg`,
      proof_pdf_url: json.url,
      expected_delivery_date: json.expected_delivery_date,
      created_at: new Date().toISOString(),
    }
  },
})

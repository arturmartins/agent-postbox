import { z } from 'zod'
import { designIds } from './designs.ts'

export const MAX_MESSAGE = 350

const address = z.object({
  name: z.string().trim().min(1).max(40),
  address_line1: z.string().trim().min(1).max(64),
  address_line2: z.string().trim().max(64).optional(),
  city: z.string().trim().min(1).max(200),
  state: z.string().trim().max(200).optional(),
  postal_code: z.string().trim().min(1).max(40),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((s) => s.toUpperCase())
    .default('US'),
})

export const PostcardOrder = z
  .object({
    to: address,
    from_name: z.string().trim().min(1).max(40).optional(),
    message: z.string().trim().min(1).max(MAX_MESSAGE),
    design: z.enum(designIds).default('robot-elf'),
  })
  .superRefine((o, ctx) => {
    if (o.to.country === 'US' && !o.to.state) {
      ctx.addIssue({ code: 'custom', path: ['to', 'state'], message: 'state is required for US addresses' })
    }
  })

export type PostcardOrder = z.infer<typeof PostcardOrder>

export const exampleOrder = {
  to: {
    name: 'Ada Lovelace',
    address_line1: '210 King St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94107',
    country: 'US',
  },
  from_name: 'Your friendly agent',
  message: 'Merry Christmas! An agent paid for this postcard and a robot printed it. Hope your holidays are bright.',
  design: 'robot-elf',
}

// Hand-written JSON Schema for the OpenAPI discovery document, so agents (and `mppx validate`) can build a valid body.
export const orderJsonSchema = {
  type: 'object',
  required: ['to', 'message'],
  properties: {
    to: {
      type: 'object',
      required: ['name', 'address_line1', 'city', 'postal_code'],
      properties: {
        name: { type: 'string', maxLength: 40 },
        address_line1: { type: 'string', maxLength: 64 },
        address_line2: { type: 'string', maxLength: 64 },
        city: { type: 'string' },
        state: { type: 'string', description: 'Required for US addresses (2-letter code).' },
        postal_code: { type: 'string' },
        country: { type: 'string', description: 'ISO 3166-1 alpha-2. Defaults to US.', default: 'US' },
      },
    },
    from_name: { type: 'string', maxLength: 40, description: 'Signature shown on the card.' },
    message: { type: 'string', maxLength: MAX_MESSAGE },
    design: { type: 'string', enum: designIds, default: 'robot-elf' },
  },
  example: exampleOrder,
}

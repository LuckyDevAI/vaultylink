import { createEmailWebhookHandler } from 'npm:@lovable.dev/email-js@0.4.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

async function recordEvent(event: { event_id: string; data: { recipient: string; message_id?: string } }, reason: 'bounce' | 'complaint' | 'unsubscribe') {
  const status = reason === 'bounce' ? 'bounced' : reason === 'complaint' ? 'complained' : 'suppressed'
  const recipient = event.data.recipient.toLowerCase()
  const { error: suppressionError } = await client.from('suppressed_emails').upsert({
    email: recipient, reason, metadata: null,
  }, { onConflict: 'email' })
  if (suppressionError) throw new Error(`Event audit failed: ${suppressionError.code}`)
  // Deterministic primary key makes replayed deliveries idempotent without a schema change.
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(event.event_id)))
  digest[6] = (digest[6] & 15) | 80
  digest[8] = (digest[8] & 63) | 128
  const hex = Array.from(digest.slice(0, 16), byte => byte.toString(16).padStart(2, '0')).join('')
  const id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  const { error } = await client.from('email_send_log').upsert({
    id, message_id: event.data.message_id ?? null, template_name: 'system',
    recipient_email: recipient, status, metadata: null,
    error_message: reason === 'bounce' ? 'Email bounced' : reason === 'complaint' ? 'Email complaint received' : 'Recipient unsubscribed',
  }, { onConflict: 'id', ignoreDuplicates: true })
  if (error) throw new Error(`Event audit failed: ${error.code}`)
}

const handler = createEmailWebhookHandler({
  apiKey: Deno.env.get('LOVABLE_API_KEY')!,
  on: {
    // Placeholder handlers — replace each log with the feature's reaction.
    // Throw on failure so the delivery is retried.
    'email.bounced': async (event) => {
      await recordEvent(event, 'bounce')
    },
    'email.complaint': async (event) => {
      await recordEvent(event, 'complaint')
    },
    'email.unsubscribed': async (event) => {
      await recordEvent(event, 'unsubscribe')
    },
  },
})

Deno.serve((req) => handler(req))

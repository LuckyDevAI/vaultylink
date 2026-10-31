import { sendAuditedTemplateEmail } from './send-audited-email.ts'

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

for (const outcome of ['sent', 'suppressed', 'failed'] as const) {
  Deno.test(`Managed send records ${outcome} and preserves the triggering key`, async () => {
    const originalFetch = globalThis.fetch
    const names = ['LOVABLE_API_KEY', 'LOVABLE_SEND_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
    const previous = names.map(name => Deno.env.get(name))
    Deno.env.set('LOVABLE_API_KEY', 'unit-test-only')
    Deno.env.set('LOVABLE_SEND_URL', 'https://email.example.test')
    Deno.env.set('SUPABASE_URL', 'https://audit.example.test')
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'unit-test-only')
    const requests: { url: string; body: Record<string, unknown> }[] = []
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input)
      const body = JSON.parse(String(init && 'body' in init ? init.body : '{}'))
      requests.push({ url, body })
      if (url.includes('audit.example.test')) return new Response(null, { status: 201 })
      if (outcome === 'suppressed') return Response.json({ error: 'Recipient suppressed', code: 'recipient_suppressed' }, { status: 403 })
      if (outcome === 'failed') return Response.json({ error: 'Send failed', code: 'internal_error' }, { status: 500 })
      return Response.json({ success: true })
    }
    try {
      let threw = false
      let sent = false
      try {
        const result = await sendAuditedTemplateEmail('purchase-confirmation', 'recipient@example.test', {
          idempotencyKey: 'purchase-test-event',
          templateData: { planLabel: 'Lifetime', amountFormatted: '19,90 €', licenseCode: 'VL-ABCD-EFGH-JKLM' },
        })
        sent = result.sent
      } catch { threw = true }
      assert(threw === (outcome === 'failed'), 'Only failed sends should throw')
      assert(sent === (outcome === 'sent'), 'Send result must reflect provider acceptance')
      const delivery = requests.find(request => !request.url.includes('audit.example.test'))
      assert(delivery?.body.idempotency_key === 'purchase-test-event', 'Event key must reach managed delivery')
      assert(delivery?.body.to === 'recipient@example.test', 'Recipient must be preserved')
      const audit = requests.find(request => request.url.includes('audit.example.test'))
      assert(audit?.body.status === outcome, 'Stored outcome must use a valid legacy status')
      assert(audit?.body.message_id === 'purchase-test-event', 'Audit must correlate with the event')
    } finally {
      globalThis.fetch = originalFetch
      names.forEach((name, i) => {
        const value = previous[i]
        if (value === undefined) Deno.env.delete(name)
        else Deno.env.set(name, value)
      })
    }
  })
}
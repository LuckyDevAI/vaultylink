import { createClient } from 'npm:@supabase/supabase-js@2'

export async function recordEmailOutcome(
  messageId: string,
  templateName: string,
  recipient: string,
  status: 'sent' | 'suppressed' | 'failed',
  errorMessage?: string,
) {
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const { error } = await client.from('email_send_log').insert({
    message_id: messageId,
    template_name: templateName,
    recipient_email: recipient,
    status,
    error_message: errorMessage?.slice(0, 1000) ?? null,
  })
  if (error) console.error('Email audit write failed', { code: error.code, message: error.message })
}
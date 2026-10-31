import { sendTemplateEmail, type SendTemplateEmailOptions } from './send-email.ts'
import { recordEmailOutcome } from '../email-audit.ts'

export async function sendAuditedTemplateEmail(
  templateName: string,
  recipient: string,
  options: SendTemplateEmailOptions & { idempotencyKey: string },
) {
  try {
    const result = await sendTemplateEmail(templateName, recipient, options)
    await recordEmailOutcome(options.idempotencyKey, templateName, recipient,
      result.sent ? 'sent' : 'suppressed')
    return result
  } catch (error) {
    await recordEmailOutcome(options.idempotencyKey, templateName, recipient, 'failed',
      error instanceof Error ? error.message : String(error))
    throw error
  }
}
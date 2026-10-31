import * as React from 'npm:react@18.3.1'
import { PlanExpiryEmail } from '../email-templates/plan-expiry.tsx'
import type { TemplateEntry } from './registry.ts'

const Email = ({ email = '', daysLeft = 20, expiryDate = '', autoRenew = false, siteUrl = 'https://vaultylink.com' }) =>
  React.createElement(PlanExpiryEmail, { email, daysLeft, expiryDate, autoRenew, siteUrl })

export const template = {
  component: Email,
  subject: (data) => data.autoRenew
    ? `🔄 Promemoria: rinnovo automatico tra ${data.daysLeft ?? 20} giorni`
    : `⚠️ Il tuo piano VaultLink scade tra ${data.daysLeft ?? 20} giorni`,
  displayName: 'Promemoria rinnovo',
  previewData: { email: 'user@example.test', daysLeft: 20, expiryDate: '20 novembre 2026', autoRenew: true },
} satisfies TemplateEntry

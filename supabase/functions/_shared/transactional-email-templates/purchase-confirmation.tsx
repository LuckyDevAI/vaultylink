import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  email?: string
  planLabel?: string
  amountFormatted?: string
  licenseCode?: string
  isYearly?: boolean
  nextRenewalDate?: string
}
const Email = ({ email = '', planLabel = '', amountFormatted = '', licenseCode = '', isYearly = false, nextRenewalDate }: Props) => (
  <Html lang="it"><Head /><Body style={{ backgroundColor: '#ffffff', fontFamily: "'Space Grotesk',Arial,sans-serif" }}>
    <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '24px' }}>
      <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#0fa968', margin: '0 0 24px' }}>🔐 VaultLink</Text>
      <Heading style={{ fontSize: '24px', color: '#111827', margin: '0 0 16px' }}>Grazie per il tuo acquisto!</Heading>
      <Text style={text}>Il tuo piano <strong>{planLabel}</strong> è ora attivo.</Text>
      <Section style={{ backgroundColor: '#f8faf9', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '20px', margin: '0 0 24px' }}>
        <Text style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 8px' }}>Codice di licenza</Text>
        <Text style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '20px', fontWeight: 'bold', color: '#0fa968', letterSpacing: '.05em', margin: '0 0 16px' }}>{licenseCode}</Text>
        <Text style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 12px' }}>Importo pagato</Text>
        <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', margin: '0' }}>{amountFormatted}</Text>
      </Section>
      {isYearly && nextRenewalDate && <Text style={text}>
        Il tuo piano si rinnoverà automaticamente il <strong>{nextRenewalDate}</strong>.
        Riceverai una email di promemoria 20 giorni prima del rinnovo.
      </Text>}
      <Button href="https://vaultylink.com" style={{ backgroundColor: '#0fa968', color: '#0f1419', fontSize: '14px', fontWeight: 'bold', borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }}>Apri VaultLink</Button>
      <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '32px 0 0' }}>Conserva questo codice come ricevuta del tuo acquisto. Email inviata a {email}.</Text>
    </Container>
  </Body></Html>
)
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 24px' }
export const template = {
  component: Email,
  subject: (data) => `✅ Acquisto confermato — Piano ${data.planLabel ?? ''} (${data.amountFormatted ?? ''})`,
  displayName: 'Conferma acquisto',
  previewData: { email: 'user@example.test', planLabel: 'Lifetime', amountFormatted: '19,90 €', licenseCode: 'VL-ABCD-EFGH-JKLM' },
} satisfies TemplateEntry
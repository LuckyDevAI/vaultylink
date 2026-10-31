import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const Email = ({ email = '' }: { email?: string }) => (
  <Html lang="it"><Head /><Body style={{ backgroundColor: '#ffffff', fontFamily: "'Space Grotesk',Arial,sans-serif" }}>
    <Container style={{ padding: '20px 25px' }}>
      <Text style={{ fontSize: '18px', fontWeight: 'bold', color: '#0fa968', margin: '0 0 24px' }}>🔐 VaultLink</Text>
      <Heading style={{ fontSize: '22px', color: '#111827', margin: '0 0 20px' }}>❄️ Piano sospeso</Heading>
      <Text style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }}>
        Il tuo piano <strong>Yearly</strong> su VaultLink è scaduto e non è stato rinnovato.
        Il tuo account è ora in stato <strong>Frozen</strong> e l'accesso alla sincronizzazione cloud è sospeso.
      </Text>
      <Text style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }}>
        Per riattivare il servizio, rinnova il tuo abbonamento.
      </Text>
      <Button href="https://vaultylink.com" style={{ backgroundColor: '#0fa968', color: '#0f1419', fontSize: '14px', fontWeight: 'bold', borderRadius: '12px', padding: '12px 24px', textDecoration: 'none' }}>Rinnova Ora</Button>
      <Text style={{ fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }}>Questa email è stata inviata a {email}.</Text>
    </Container>
  </Body></Html>
)
export const template = {
  component: Email,
  subject: '❄️ Il tuo piano VaultLink è stato sospeso',
  displayName: 'Piano sospeso',
  previewData: { email: 'user@example.test' },
} satisfies TemplateEntry
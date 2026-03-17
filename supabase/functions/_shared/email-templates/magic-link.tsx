/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Il tuo link di accesso per {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🔐 VaultLink</Text>
        <Heading style={h1}>Il tuo link di accesso</Heading>
        <Text style={text}>
          Clicca il pulsante qui sotto per accedere a {siteName}. Il link scadrà a breve.
        </Text>
        <Button style={button} href={confirmationUrl}>Accedi</Button>
        <Text style={footer}>
          Se non hai richiesto questo link, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0fa968', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }
const button = {
  backgroundColor: '#0fa968', color: '#0f1419', fontSize: '14px',
  fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }

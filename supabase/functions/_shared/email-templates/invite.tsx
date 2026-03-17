/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Sei stato invitato su {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🔐 VaultLink</Text>
        <Heading style={h1}>Sei stato invitato</Heading>
        <Text style={text}>
          Sei stato invitato a unirti a{' '}
          <Link href={siteUrl} style={link}><strong>{siteName}</strong></Link>.
          Clicca il pulsante qui sotto per accettare l'invito.
        </Text>
        <Button style={button} href={confirmationUrl}>Accetta Invito</Button>
        <Text style={footer}>
          Se non ti aspettavi questo invito, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0fa968', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#0fa968', color: '#0f1419', fontSize: '14px',
  fontWeight: 'bold' as const, borderRadius: '12px', padding: '12px 24px', textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }

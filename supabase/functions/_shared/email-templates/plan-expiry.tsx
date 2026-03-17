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

interface PlanExpiryEmailProps {
  email: string
  daysLeft: number
  expiryDate: string
  autoRenew: boolean
  siteUrl: string
}

export const PlanExpiryEmail = ({
  email,
  daysLeft,
  expiryDate,
  autoRenew,
  siteUrl,
}: PlanExpiryEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Il tuo piano VaultLink scade tra {daysLeft} giorni</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>🔐 VaultLink</Text>
        <Heading style={h1}>
          {daysLeft <= 3
            ? '⚠️ Il tuo piano sta per scadere!'
            : 'Il tuo piano sta per scadere'}
        </Heading>
        <Text style={text}>
          Ciao, il tuo piano <strong>Yearly</strong> su VaultLink scadrà il{' '}
          <strong>{expiryDate}</strong> (tra {daysLeft} giorni).
        </Text>
        {autoRenew ? (
          <>
            <Text style={text}>
              Il rinnovo automatico è <strong>attivo</strong>. Il tuo piano verrà rinnovato automaticamente.
              Se desideri annullare il rinnovo, puoi farlo entro 7 giorni prima della scadenza.
            </Text>
            <Button style={button} href={siteUrl}>
              Gestisci Abbonamento
            </Button>
          </>
        ) : (
          <>
            <Text style={text}>
              Il rinnovo automatico è <strong>disattivato</strong>. Se non rinnovi entro la scadenza,
              il tuo piano passerà allo stato <strong>Frozen</strong> e l'accesso cloud sarà sospeso.
            </Text>
            <Button style={button} href={siteUrl}>
              Rinnova Ora
            </Button>
          </>
        )}
        <Text style={footer}>
          Questa email è stata inviata a {email} perché hai un piano attivo su VaultLink.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PlanExpiryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Space Grotesk', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const logo = { fontSize: '18px', fontWeight: 'bold' as const, color: '#0fa968', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#111827', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#6b7280', lineHeight: '1.5', margin: '0 0 25px' }
const button = {
  backgroundColor: '#0fa968',
  color: '#0f1419',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#9ca3af', margin: '30px 0 0' }

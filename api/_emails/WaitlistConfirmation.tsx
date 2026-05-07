// React Email template for the waitlist confirmation send.
// Edit copy here — this file is the single source of truth for the body
// of the welcome email. After changes, redeploy (Vercel functions only
// pick up new versions on deploy).
//
// Reference: https://react.email/docs/components/html
import * as React from 'react';
import {
  Html, Head, Preview, Body, Container, Section, Heading, Text, Button, Hr,
} from '@react-email/components';

// Brand colors — keep in sync with src/theme.js
const C = {
  cream:    '#f6efe2',
  paper:    '#ffffff',
  ink:      '#2a1e22',
  inkSoft:  '#5c4a4f',
  inkMuted: '#8c7a7e',
  terra:    '#c8553d',
  divider:  '#efe6d2',
};

const styles = {
  body: { backgroundColor: C.cream, margin: 0, padding: '32px 16px',
          fontFamily: "'Albert Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          color: C.ink },
  container: { width: '540px', maxWidth: '540px', margin: '0 auto',
               background: C.paper, borderRadius: '14px',
               border: `1px solid rgba(42,30,34,0.08)`, overflow: 'hidden' },
  brandRow: { padding: '36px 36px 8px 36px' },
  brand: { fontFamily: "'Fraunces', Georgia, serif", fontSize: '30px',
           fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 },
  brandGo: { color: C.ink },
  brandMama: { color: C.terra, fontStyle: 'italic' },
  contentRow: { padding: '24px 36px 8px 36px' },
  heading: { margin: '0 0 12px 0', fontFamily: "'Fraunces', Georgia, serif",
             fontSize: '24px', fontWeight: 500, letterSpacing: '-0.01em',
             color: C.ink, lineHeight: 1.2 },
  headingItalic: { fontStyle: 'italic', color: C.terra },
  greeting: { margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.55, color: C.ink },
  paragraph: { margin: '0 0 16px 0', fontSize: '15px', lineHeight: 1.55, color: C.inkSoft },
  buttonWrap: { margin: '0 0 8px 0' },
  button: { padding: '14px 22px', borderRadius: '10px', background: C.terra,
            color: '#ffffff', fontWeight: 700, fontSize: '15px',
            textDecoration: 'none', display: 'inline-block' },
  signoffRow: { padding: '24px 36px 36px 36px', borderTop: `1px solid ${C.divider}` },
  signoff: { margin: '0 0 6px 0', fontSize: '14px', color: C.ink },
  signoffSoft: { margin: 0, fontSize: '14px', color: C.inkSoft },
  legal: { margin: '18px 0 0 0', fontSize: '11px', color: C.inkMuted, textAlign: 'center' },
};

export const WaitlistConfirmation = ({ firstName, city }) => {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const cityLine = city
    ? `We'll email you the moment Go Mama is live in ${city}.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";

  return (
    <Html lang="en">
      <Head />
      <Preview>You're on the Go Mama list — welcome.</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.brandRow}>
            <Text style={styles.brand}>
              <span style={styles.brandGo}>Go </span>
              <span style={styles.brandMama}>Mama</span>
            </Text>
          </Section>

          <Section style={styles.contentRow}>
            <Heading as="h1" style={styles.heading}>
              You're on the list. <span style={styles.headingItalic}>Welcome, mama.</span>
            </Heading>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.paragraph}>
              Thanks for joining the Go Mama waitlist. We're building something for moms who want{' '}
              <strong>real friendship</strong> — not endless chat — around the hours you can actually meet,
              shared values, kid-stage fit, and places you'd actually go.
            </Text>
            <Text style={styles.paragraph}>{cityLine}</Text>
            <Text style={styles.paragraph}>In the meantime, you can preview the app today.</Text>
            <Section style={styles.buttonWrap}>
              <Button href="https://gomama.app/preview" style={styles.button}>
                Preview Go Mama →
              </Button>
            </Section>
          </Section>

          <Section style={styles.signoffRow}>
            <Text style={styles.signoff}>Talk soon,</Text>
            <Text style={styles.signoffSoft}>The Go Mama team</Text>
          </Section>
        </Container>

        <Text style={styles.legal}>
          You're receiving this because you joined the Go Mama waitlist at gomama.app.
        </Text>
      </Body>
    </Html>
  );
};

export default WaitlistConfirmation;

// Plain-text version (sent alongside HTML — many clients prefer it, and Gmail
// flags HTML-only as spam more aggressively).
export const renderWaitlistText = ({ firstName, city }) => {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const cityText = city
    ? `We'll email you the moment Go Mama is live in ${city}.`
    : "We'll email you the moment Go Mama is live in your neighborhood.";

  return [
    greeting,
    '',
    "You're on the Go Mama list — thanks for joining.",
    '',
    "We're building something for moms who want real friendship — not endless chat — around the hours you can actually meet, shared values, kid-stage fit, and places you'd actually go.",
    '',
    cityText,
    '',
    'In the meantime, preview the app today: https://gomama.app/preview',
    '',
    'Talk soon,',
    'The Go Mama team',
    '',
    "You're receiving this because you joined the Go Mama waitlist at gomama.app.",
  ].join('\n');
};

// Subject lives here too so all email content is in one file.
export const WAITLIST_CONFIRMATION_SUBJECT = "You're on the Go Mama list";

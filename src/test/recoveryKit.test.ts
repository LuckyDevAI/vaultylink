import { describe, it, expect } from 'vitest';
import { buildRecoveryKitHtml } from '@/components/RecoveryKitCard';
describe('kit di emergenza', () => {
  it('non contiene mai il PIN e sanifica l\'email', () => {
    const html = buildRecoveryKitHtml('<b>x</b>@a.it', '20/11/2026');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;@a.it');
    expect(html).not.toContain('<b>x</b>@a.it');
  });
});

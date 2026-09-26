import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Legal Pages Routing', () => {
  const appContent = readFileSync(resolve(__dirname, '../../../App.tsx'), 'utf-8');

  it('imports TermsPage', () => {
    expect(appContent).toContain('TermsPage');
    expect(appContent).toContain('@/pages/legal/TermsPage');
  });

  it('imports AgencyTermsPage', () => {
    expect(appContent).toContain('AgencyTermsPage');
    expect(appContent).toContain('@/pages/legal/AgencyTermsPage');
  });

  it('imports PrivacyPage', () => {
    expect(appContent).toContain('PrivacyPage');
    expect(appContent).toContain('@/pages/legal/PrivacyPage');
  });

  it('imports CookiePolicyPage', () => {
    expect(appContent).toContain('CookiePolicyPage');
    expect(appContent).toContain('@/pages/legal/CookiePolicyPage');
  });

  it('imports ContactPage', () => {
    expect(appContent).toContain('ContactPage');
    expect(appContent).toContain('@/pages/legal/ContactPage');
  });

  it('defines route /terms', () => {
    expect(appContent).toContain('path="/terms"');
    expect(appContent).toContain('element={<TermsPage');
  });

  it('defines route /terms/agency', () => {
    expect(appContent).toContain('path="/terms/agency"');
    expect(appContent).toContain('element={<AgencyTermsPage');
  });

  it('defines route /privacy', () => {
    expect(appContent).toContain('path="/privacy"');
    expect(appContent).toContain('element={<PrivacyPage');
  });

  it('defines route /cookies', () => {
    expect(appContent).toContain('path="/cookies"');
    expect(appContent).toContain('element={<CookiePolicyPage');
  });

  it('defines route /contact', () => {
    expect(appContent).toContain('path="/contact"');
    expect(appContent).toContain('element={<ContactPage');
  });
});

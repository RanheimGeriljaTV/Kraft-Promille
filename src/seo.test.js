import html from '../index.html?raw';
import { FAQ } from './data/faq';

const tag = (re) => html.match(re)?.[1] ?? '';

describe('SEO (CLAUDE.md 2c)', () => {
  it('har tittel på maks 60 tegn som slutter med | Ranheim Kraft', () => {
    const title = tag(/<title>(.*?)<\/title>/);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toMatch(/^Promillekalkulator.*\| Ranheim Kraft$/);
  });

  it('har beskrivelse på 120–155 tegn som sier at det er gratis', () => {
    const description = tag(/name="description"\s+content="([^"]*)"/);
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
    expect(description).toMatch(/Gratis/);
  });

  it('har canonical med avsluttende skråstrek, lang=no og Open Graph', () => {
    expect(html).toContain('<link rel="canonical" href="https://ranheimkraft.no/promille/" />');
    expect(html).toContain('<html lang="no"');
    for (const p of ['og:title', 'og:description', 'og:url', 'og:type', 'og:locale', 'og:image']) {
      expect(html).toContain(`property="${p}"`);
    }
  });

  it('henter ingenting fra eksterne tjenester', () => {
    expect(html).not.toMatch(/<link[^>]+href="https:\/\/(?!ranheimkraft\.no)/);
    expect(html).not.toMatch(/<script[^>]+src="https?:/);
  });

  it('har JSON-LD med WebApplication og FAQPage lik teksten på siden', () => {
    const json = JSON.parse(tag(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    const [app, faq] = json['@graph'];
    expect(app).toMatchObject({
      '@type': 'WebApplication',
      operatingSystem: 'Any',
      inLanguage: 'nb',
      offers: { price: '0', priceCurrency: 'NOK' },
    });
    expect(faq['@type']).toBe('FAQPage');
    expect(
      faq.mainEntity.map((q) => ({ question: q.name, answer: q.acceptedAnswer.text })),
    ).toEqual(FAQ);
  });

  it('har 3–6 spørsmål med svar på 1–3 setninger', () => {
    expect(FAQ.length).toBeGreaterThanOrEqual(3);
    expect(FAQ.length).toBeLessThanOrEqual(6);
    for (const { answer } of FAQ) {
      const sentences = answer.split(/(?<=[.!?])\s+(?=[A-ZÆØÅ«])/).length;
      expect(sentences).toBeGreaterThanOrEqual(1);
      expect(sentences).toBeLessThanOrEqual(3);
    }
  });
});

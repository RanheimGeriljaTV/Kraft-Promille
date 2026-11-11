import { FAQ } from '../data/faq';
import { TERMS, TERMS_TITLE } from '../data/terms';
import { SectionLabel } from './ui';

/** Fullstendige vilkår og ansvarsfraskrivelse. Den oransje boksen øverst lenker hit (#vilkar). */
function Terms() {
  return (
    <article
      id="vilkar"
      aria-labelledby="vilkar-title"
      className="scroll-mt-4 space-y-4 rounded-2xl border border-orange-400/30 bg-orange-400/[0.05] p-4"
    >
      <h3 id="vilkar-title" className="font-syne text-base font-bold text-white">
        {TERMS_TITLE}
      </h3>
      {TERMS.map((part) => (
        <section key={part.title} className="space-y-2">
          <h4 className="text-sm font-bold text-white">{part.title}</h4>
          {part.paragraphs.map((text) => (
            <p key={text} className="text-sm leading-relaxed text-zinc-300">
              {text}
            </p>
          ))}
          {part.bullets && (
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-300">
              {part.bullets.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}

/** «Spørsmål og svar»: forklarende tekst som søkemotorer og folk trenger, med vilkårene nederst. */
export default function Faq() {
  return (
    <section aria-labelledby="faq-title" className="space-y-3">
      <SectionLabel id="faq-title">Spørsmål og svar</SectionLabel>
      <div className="grid gap-2 lg:grid-cols-2">
        {FAQ.map((item) => (
          <details
            key={item.question}
            className="group h-fit rounded-2xl border border-white/5 bg-white/[0.02] open:border-white/10"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-bold text-white [&::-webkit-details-marker]:hidden">
              <h3 className="text-sm font-bold">{item.question}</h3>
              <span aria-hidden="true" className="text-accent transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-zinc-300">{item.answer}</p>
          </details>
        ))}
      </div>
      <Terms />
    </section>
  );
}

import { FAQ } from '../data/faq';
import { SectionLabel } from './ui';

/** «Spørsmål og svar»: forklarende tekst som søkemotorer og folk trenger. */
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
    </section>
  );
}

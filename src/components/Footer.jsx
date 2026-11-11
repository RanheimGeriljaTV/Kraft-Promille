import { APP_VERSION, ISSUES_URL, REPO_URL } from '../config';

/** Bunntekst i samme stil som ranheimkraft.no. */
export default function Footer() {
  const linkClass = 'inline-flex min-h-12 items-center transition hover:text-white';

  return (
    <footer className="flex flex-col items-center justify-between gap-1 border-t border-white/10 pt-6 pb-4 font-mono text-xs text-zinc-400 sm:flex-row">
      <div>
        &copy; {new Date().getFullYear()} Ranheim Kraft · v{APP_VERSION}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4">
        <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Rapporter feil
        </a>
        <span aria-hidden="true">&bull;</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          GitHub
        </a>
      </div>
    </footer>
  );
}

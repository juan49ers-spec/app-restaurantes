import Link from 'next/link'
import type { PresentationChapter } from '@/lib/reporting'

export function PortalChapterNavigation({ chapters }: { chapters: PresentationChapter[] }) {
  return (
    <nav
      aria-label="Capítulos del informe"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Capítulos del informe</p>
      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
        {chapters.map(chapter => (
          <Link
            key={chapter.id}
            href={`#chapter-${chapter.id}`}
            className="group flex min-w-0 items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-950 text-xs font-semibold text-white">
              {chapter.label}
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-slate-950">{chapter.title}</span>
              <span className="block truncate text-xs text-slate-500">{chapter.subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

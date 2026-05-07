import { cn } from '@/lib/utils'

export default function MdxLayout({ children }: { children: React.ReactNode }) {
  // Create any shared layout or styles here
  return (
    <div
      className={cn(
        'w-full pb-4',
        'text-md',
        'prose dark:prose-invert',
        'prose-p:my-3',
        'prose-hr:my-5',
        'prose-headings:my-4 prose-headings:font-semibold',
        'prose-headings:text-black dark:prose-headings:text-white',
        'prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
        'prose-h4:text-lg prose-h5:text-lg prose-h6:text-lg',
        'prose-blockquote:border-l-neutral-300 dark:prose-blockquote:border-l-neutral-700',
        'prose-blockquote:text-neutral-500 dark:prose-blockquote:text-neutral-300',
      )}
    >
      {children}
    </div>
  )
}

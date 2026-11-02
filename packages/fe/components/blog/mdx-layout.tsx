import { cn } from '@/lib/utils'

export default function MdxLayout({ children }: { children: React.ReactNode }) {
  // Create any shared layout or styles here
  return (
    <div
      className={cn(
        'mx-auto w-full pb-4',
        'text-md',
        'prose prose-neutral dark:prose-invert',
        'text-neutral-900 dark:text-white',
        'prose-p:my-3',
        'prose-img:my-3 prose-figure:my-3',
        'prose-hr:my-5',
        'prose-headings:my-3 prose-headings:font-semibold',
        'prose-headings:text-black dark:prose-headings:text-white',
        'prose-h1:text-2xl/7 prose-h2:text-xl/7 prose-h3:text-lg/7',
        'prose-h4:text-lg/7 prose-h5:text-lg/7 prose-h6:text-lg/7',
      )}
    >
      {children}
    </div>
  )
}

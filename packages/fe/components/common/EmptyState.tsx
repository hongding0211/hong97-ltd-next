import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="not-prose flex justify-center">
      <div className="mt-24 w-[80%] max-w-[400px] md:mt-48">
        <Alert>
          <Icon className="h-4 w-4" />
          <AlertTitle>{title}</AlertTitle>
          {description && (
            <AlertDescription className="mb-1 mt-6">
              {description}
            </AlertDescription>
          )}
        </Alert>
      </div>
    </div>
  )
}

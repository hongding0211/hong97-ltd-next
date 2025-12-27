import { GripVerticalIcon } from 'lucide-react'
import React from 'react'

export const DndHandler: React.FC = () => {
  return (
    <div className="hidden sm:block bg-neutral-100 dark:bg-neutral-800 py-1 px-0.5 rounded cursor-grab mr-1 mt-1">
      <GripVerticalIcon className="w-3 h-3" />
    </div>
  )
}

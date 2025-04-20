import { Input, InputProps } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useId } from 'react'

export const InputWithLabel: React.FC<
  InputProps & {
    label: string
    right?: React.ReactNode
  }
> = (props) => {
  const { label, right, ...restProps } = props

  const uid = useId()

  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={uid} className="text-sm">
        {label}
      </Label>
      <div className="relative">
        <Input id={uid} {...restProps} />
        {right && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {right}
          </div>
        )}
      </div>
    </div>
  )
}

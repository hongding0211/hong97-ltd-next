import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import Editor from '@monaco-editor/react'
import { ConfigListResponseDto } from '@server/modules/ucp/dto/config-list'
import { toast } from '@utils/toast'
import { useTranslation } from 'next-i18next'
import React, { useRef } from 'react'

export type EditType = 'new' | 'edit'

interface EditProps {
  title: string
  data?: ConfigListResponseDto['data'][number]
  visible: boolean
  onVisibleChange?: (visible: boolean) => void
  onSave?: (content: ConfigListResponseDto['data'][number], type: EditType) => void
  type: EditType
}

export const Edit: React.FC<EditProps> = (props) => {
  const { visible, onVisibleChange, onSave, title, type, data } = props

  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  const { t } = useTranslation('tools')

  const defaultValue = (() => {
    if (data?.raw) {
      return JSON.stringify(data.raw, null, 2)
    }
    return '{\r\n}'
  })()

  const handleMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco
  }

  const handleSave = () => {
    const content = editorRef.current.getValue()
    try {
      const obj = JSON.parse(content)
      onSave?.({
        ...data,
        raw: obj,
      }, type)
      onVisibleChange?.(false)
    } catch {
      toast('ucp.invalidJson')
    }
  }

  return (
    <Sheet open={visible} onOpenChange={onVisibleChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full mt-4">
          <Editor
            height="75%"
            defaultLanguage="json"
            defaultValue={defaultValue}
            theme="vs-dark"
            onMount={handleMount}
            options={{
              tabSize: 2,
              minimap: {
                enabled: false,
              },
              lineNumbers: 'off',
            }}
          />
          <div className="w-full h-[1px] mt-6 mb-4 bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex flex-col items-center gap-y-4">
            <Button size="sm" className="w-full" onClick={handleSave}>
              {t('items.ucp.detail.save')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => onVisibleChange?.(false)}
            >
              {t('items.ucp.detail.cancel')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

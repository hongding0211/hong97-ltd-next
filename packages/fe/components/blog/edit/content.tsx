'use client'
import { Editor, EditorContainer } from '@/components/ui/editor'
import { useTranslation } from 'next-i18next'
import { Plate, usePlateEditor } from 'platejs/react'
import React from 'react'

interface IContent {
  value: string
  onValueChange: (v: string) => void
}

const Content: React.FC<IContent> = (_props) => {
  // const { value, onValueChange } = props

  const { t } = useTranslation('blog')

  const editor = usePlateEditor()

  return (
    <Plate editor={editor}>
      <EditorContainer>
        <Editor className="w-full !p-0" placeholder={t('edit.startEdit')} />
      </EditorContainer>
    </Plate>
  )
}

export default Content

'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DialogClose } from '@radix-ui/react-dialog'
import { Ban, CheckCircle } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { getCroppedImg, readFile } from './utils'

// const ORIENTATION_TO_ANGLE = {
//   '3': 180,
//   '6': 90,
//   '8': -90,
// }

interface ImageCropProps {
  show: boolean
  onShowChange?: (show: boolean) => void
  onApply?: (croppedImage: File) => void
  file: File
}

const ImageCrop: React.FC<ImageCropProps> = (props) => {
  const { show, onShowChange, file, onApply } = props

  const [imageSrc, setImageSrc] = useState('')

  const [crop, setCrop] = useState({ x: 0, y: 0 })

  const croppedAreaPixels = useRef<any>(null)
  const croppedImage = useRef<any>(null)

  const { t } = useTranslation('common')

  const handleCropComplete = (_croppedArea: any, _croppedAreaPixels: any) => {
    croppedAreaPixels.current = _croppedAreaPixels
  }

  const handleApply = async () => {
    try {
      croppedImage.current = await getCroppedImg(
        imageSrc,
        croppedAreaPixels.current,
      )
      // convert blob resource to a file
      const _file = new File(
        [croppedImage.current],
        `${file.name}-cropped.png`,
        {
          type: 'image/png',
        },
      )
      onApply?.(_file)
    } catch {
      // noop
    }
  }

  useEffect(() => {
    const getImageSrc = async (file: File) => {
      const imageDataUrl: any = await readFile(file)

      // try {
      //   // apply rotation if needed
      //   const orientation = await getOrientation(file)
      //   const rotation = ORIENTATION_TO_ANGLE[orientation]
      //   if (rotation) {
      //     imageDataUrl = await getRotatedImage(imageDataUrl, rotation)
      //   }
      // } catch {
      //   // noop
      // }

      setImageSrc(imageDataUrl)
    }
    if (show && file) {
      getImageSrc(file)
    }
    return () => {
      setImageSrc('')
    }
  }, [show, file])

  return (
    <Dialog modal open={show} onOpenChange={onShowChange}>
      <DialogContent className="rounded-md !w-[90%] max-w-[500px] py-4 pt-5 px-4">
        <DialogHeader>
          {' '}
          <DialogTitle>
            <div className="flex items-center gap-x-1.5">
              <span>{t('cropAvatar')}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="w-full relative pt-2">
          <div className="relative w-full h-[250px] md:h-[350px] bg-neutral-800">
            <Cropper
              image={imageSrc}
              crop={crop}
              rotation={0}
              zoom={1}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={handleCropComplete}
              cropShape="round"
              restrictPosition
            />
          </div>

          <div className="items-center mt-6 grid grid-cols-2 gap-x-2">
            <DialogClose className="w-full" asChild>
              <Button size="sm" variant="outline">
                <Ban className="w-4 h-4" />
                {t('cancel')}
              </Button>
            </DialogClose>
            <Button size="sm" onClick={handleApply}>
              <CheckCircle className="w-4 h-4" />
              {t('apply')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ImageCrop

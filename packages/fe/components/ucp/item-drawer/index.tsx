import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import React from 'react'

interface ItemDrawerProps {
  show: boolean
  onShowChange?: (show: boolean) => void
  data?: Record<string, any>
  edit?: boolean
}

export const ItemDrawer: React.FC<ItemDrawerProps> = (props) => {
  const { show, onShowChange, data, edit } = props

  return (
    <Drawer direction="right" open={show} onOpenChange={onShowChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you absolutely sure?</DrawerTitle>
          <DrawerDescription>This action cannot be undone.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Submit</Button>
          <DrawerClose>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

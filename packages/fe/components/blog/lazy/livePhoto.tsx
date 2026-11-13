import { ImagesV2 } from '@components/common/images-v2'
import type { ComponentProps } from 'react'
import type { ReactMdxComponent } from '../react-mdx-types'

const LivePhoto: ReactMdxComponent<
  Pick<ComponentProps<typeof ImagesV2>, 'images'>
> = ({ props }) => <ImagesV2 images={props.images} markdown />

export default LivePhoto

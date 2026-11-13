import * as Summary from '../2024-summary'
import type { ReactMdxComponent } from '../react-mdx-types'

const Summary24: ReactMdxComponent<{ type: keyof typeof Summary }> = ({
  props,
}) => {
  const Component = Summary[props.type]
  return Component ? <Component /> : null
}

export default Summary24

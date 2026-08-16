import cx from 'classnames'
import React, { Children, isValidElement } from 'react'
import {
  getCodeLanguageFromClassName,
  getCodeLanguageLabel,
} from './code-language'

const getCodeClassName = (children: React.ReactNode) => {
  const code = Children.toArray(children).find(
    (child) => isValidElement(child) && child.type === 'code',
  )

  if (!isValidElement<{ className?: string }>(code)) {
    return undefined
  }

  return code.props.className
}

export const BlogCodeBlock: React.FC<React.ComponentPropsWithoutRef<'pre'>> = ({
  children,
  className,
  ...props
}) => {
  const language = getCodeLanguageFromClassName(getCodeClassName(children))

  return (
    <pre {...props} className={cx(className, 'blog-code-block-display !pt-11')}>
      <span
        contentEditable={false}
        className="absolute left-4 top-3 select-none text-[0.65rem] font-semibold tracking-wide text-neutral-500 dark:text-neutral-400"
      >
        {getCodeLanguageLabel(language)}
      </span>
      {children}
    </pre>
  )
}

export interface CodeLanguage {
  value: string
  label: string
  aliases?: readonly string[]
}

export const CODE_LANGUAGES: readonly CodeLanguage[] = [
  { value: 'plaintext', label: 'PLAIN TEXT', aliases: ['text', 'txt'] },
  { value: 'bash', label: 'SHELL', aliases: ['sh', 'shell', 'zsh'] },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++', aliases: ['c++'] },
  { value: 'csharp', label: 'C#', aliases: ['cs', 'c#'] },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'DIFF' },
  { value: 'dockerfile', label: 'DOCKERFILE', aliases: ['docker'] },
  { value: 'go', label: 'GO', aliases: ['golang'] },
  { value: 'html', label: 'HTML', aliases: ['xml'] },
  { value: 'java', label: 'JAVA' },
  {
    value: 'javascript',
    label: 'JAVASCRIPT',
    aliases: ['js', 'mjs', 'cjs'],
  },
  { value: 'json', label: 'JSON' },
  { value: 'jsx', label: 'JSX' },
  { value: 'kotlin', label: 'KOTLIN', aliases: ['kt'] },
  { value: 'markdown', label: 'MARKDOWN', aliases: ['md'] },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'PYTHON', aliases: ['py'] },
  { value: 'ruby', label: 'RUBY', aliases: ['rb'] },
  { value: 'rust', label: 'RUST', aliases: ['rs'] },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'SWIFT' },
  { value: 'typescript', label: 'TYPESCRIPT', aliases: ['ts'] },
  { value: 'tsx', label: 'TSX' },
  { value: 'yaml', label: 'YAML', aliases: ['yml'] },
]

const languageByName = new Map(
  CODE_LANGUAGES.flatMap((language) => [
    [language.value, language] as const,
    ...(language.aliases || []).map((alias) => [alias, language] as const),
  ]),
)

const cleanLanguage = (language?: string | null) =>
  language?.trim().toLowerCase() || 'plaintext'

export const normalizeCodeLanguage = (language?: string | null) => {
  const cleanedLanguage = cleanLanguage(language)
  return languageByName.get(cleanedLanguage)?.value || cleanedLanguage
}

export const getCodeLanguageLabel = (language?: string | null) => {
  const cleanedLanguage = cleanLanguage(language)
  return (
    languageByName.get(cleanedLanguage)?.label ||
    cleanedLanguage.replace(/[-_]+/g, ' ').toUpperCase()
  )
}

export const getCodeLanguageFromClassName = (className?: string) => {
  const languageClass = className
    ?.split(/\s+/)
    .find((name) => name.startsWith('language-'))

  return languageClass?.slice('language-'.length) || 'plaintext'
}

export const getCodeLanguageOptions = (
  currentLanguage?: string | null,
): readonly CodeLanguage[] => {
  const cleanedLanguage = cleanLanguage(currentLanguage)

  if (languageByName.has(cleanedLanguage)) {
    return CODE_LANGUAGES
  }

  return [
    {
      value: cleanedLanguage,
      label: getCodeLanguageLabel(cleanedLanguage),
    },
    ...CODE_LANGUAGES,
  ]
}

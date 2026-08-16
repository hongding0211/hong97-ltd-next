const OPENING_FENCE = /^ {0,3}(`{3,}|~{3,})(.*)$/

export const getFencedCodeBodies = (markdown: string): string[] => {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const bodies: string[] = []

  let fenceCharacter = ''
  let fenceLength = 0
  let body: string[] = []

  for (const line of lines) {
    if (!fenceCharacter) {
      const opening = line.match(OPENING_FENCE)

      if (!opening || (opening[1][0] === '`' && opening[2].includes('`'))) {
        continue
      }

      fenceCharacter = opening[1][0]
      fenceLength = opening[1].length
      body = []
      continue
    }

    const closingFence = new RegExp(
      `^ {0,3}${fenceCharacter}{${fenceLength},}\\s*$`,
    )

    if (closingFence.test(line)) {
      bodies.push(body.join('\n'))
      fenceCharacter = ''
      fenceLength = 0
      body = []
      continue
    }

    body.push(line)
  }

  return bodies
}

export const hasUnexpectedFencedCodeLoss = (
  source: string,
  candidate: string,
): boolean => {
  const sourceBodies = getFencedCodeBodies(source)

  if (!sourceBodies.some((body) => body.trim().length > 0)) {
    return false
  }

  const candidateBodies = getFencedCodeBodies(candidate)

  return sourceBodies.some(
    (body, index) =>
      body.trim().length > 0 &&
      (candidateBodies[index] === undefined ||
        candidateBodies[index].trim().length === 0),
  )
}

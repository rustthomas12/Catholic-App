// The 1962 (Traditional Latin Mass) source sends each reading as plain text:
// an optional heading ("Continuation ☩ of the Holy Gospel according to Luke"),
// then the citation wrapped in asterisks ("*Luke 12:32-34*"), then the
// passage. Split those so the citation fills the reference line, the heading
// can be shown or skipped, and no raw asterisks reach the screen.

const STARRED = /^\*(.+)\*$/

export function cleanTlmSection(section) {
  if (!section?.text) return section
  const lines = section.text.split('\n').map((l) => l.trim()).filter(Boolean)

  let intro = null
  if (lines.length > 1 && !STARRED.test(lines[0]) && STARRED.test(lines[1])) intro = lines.shift()

  let reference = section.reference ?? null
  if (lines.length && STARRED.test(lines[0])) {
    const ref = lines.shift().match(STARRED)[1]
    reference = reference ?? ref
  }

  // Further citations inside a reading (the Gradual has two) stay as lines
  const text = lines.map((l) => l.replace(STARRED, '$1').replace(/\*/g, '')).join('\n')
  return { ...section, reference, intro, text }
}

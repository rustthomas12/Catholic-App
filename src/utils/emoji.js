// "⛪ Parish Feed" -> [emoji, "Parish Feed"]
export function splitLeadingEmoji(text) {
  const m = /^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)\s*(.*)$/u.exec(text)
  return m ? [m[1], m[2]] : [null, text]
}

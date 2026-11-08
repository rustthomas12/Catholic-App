import { describe, it, expect } from 'vitest'
import { referenceToWEB, describeDay, withoutDivineName } from '../../api/readings.js'

describe('withoutDivineName', () => {
  it('says "the LORD" as US Catholic texts do', () => {
    expect(withoutDivineName('Yahweh is my shepherd: I shall lack nothing.')).toBe('The LORD is my shepherd: I shall lack nothing.')
    expect(withoutDivineName('Sing to Yahweh a new song. Yahweh’s law is perfect.')).toBe('Sing to the LORD a new song. The LORD’s law is perfect.')
    expect(withoutDivineName('The Lord Yahweh’s Spirit is on me')).toBe('The Lord GOD’s Spirit is on me')
    expect(withoutDivineName('“Yahweh, hear my prayer.” Praise Yah! O Yahweh, my God')).toBe('“LORD, hear my prayer.” Praise the LORD! O LORD, my God')
  })
})

describe('referenceToWEB', () => {
  it('keeps references whose numbering already matches', () => {
    expect(referenceToWEB('Wisdom 6:12-16')).toBe('wisdom 6:12-16')
    expect(referenceToWEB('Matthew 25:1-13')).toBe('matthew 25:1-13')
    expect(referenceToWEB('1 Thessalonians 4:13-18')).toBe('1 thessalonians 4:13-18')
  })

  it('keeps skipped verses skipped and drops verse letters', () => {
    expect(referenceToWEB('1 Corinthians 12:3b-7, 12-13')).toBe('1 corinthians 12:3-7,12:12-13')
  })

  it('handles new chapters after a semicolon and cross-chapter ranges', () => {
    expect(referenceToWEB('Acts 2:1-11; 3:1')).toBe('acts 2:1-11,3:1')
    expect(referenceToWEB('Isaiah 52:13—53:12')).toBe('isaiah 52:13-53:12')
  })

  it('treats "and" as a list separator', () => {
    expect(referenceToWEB('Psalm 118:1 and 8-9, 19-21, 25-27a')).toBe('psalms 118:1,118:8-9,118:19-21,118:25-27')
  })

  it('reads one-chapter books cited without a chapter', () => {
    expect(referenceToWEB('2 John 4-9')).toBe('2 john 1:4-9')
    expect(referenceToWEB('Philemon 7-20')).toBe('philemon 1:7-20')
  })

  it('uses the first of alternative readings', () => {
    expect(referenceToWEB('Matthew 26:14—27:66 or 27:11-54')).toBe('matthew 26:14-27:66')
  })

  it('maps lectionary numbering where English Bibles differ', () => {
    expect(referenceToWEB('Malachi 3:19-20')).toBe('malachi 4:1-2')        // NAB 3:19-24 = 4:1-6
    expect(referenceToWEB('Joel 3:1-5')).toBe('joel 2:28-32')
    expect(referenceToWEB('Isaiah 9:1-6')).toBe('isaiah 9:2-7')            // Christmas Midnight
    expect(referenceToWEB('Micah 5:1-4')).toBe('micah 5:2-5')              // Advent 4C
    expect(referenceToWEB('Isaiah 63:16b-17, 19b; 64:2-7')).toBe('isaiah 63:16-17,63:19,64:3-8') // Advent 1B
    expect(referenceToWEB('Exodus 22:20-26')).toBe('exodus 22:21-27')      // OT 30A
    expect(referenceToWEB('2 Corinthians 13:11-13')).toBe('2 corinthians 13:11-14') // Trinity A
    expect(referenceToWEB('Hosea 14:2-10')).toBe('hosea 14:1-9')
    expect(referenceToWEB('Zechariah 2:14-17')).toBe('zechariah 2:10-13')
  })

  it('subtracts psalm titles the lectionary counts as verses', () => {
    expect(referenceToWEB('Psalm 63:2, 3-4, 5-6, 7-8')).toBe('psalms 63:1,63:2-3,63:4-5,63:6-7')
    expect(referenceToWEB('Psalm 51:3-4, 12-13')).toBe('psalms 51:1-2,51:10-11')
    expect(referenceToWEB('Psalm 23:1-3a, 3b-4, 5, 6')).toBe('psalms 23:1-3,23:3-4,23:5,23:6')
  })

  it('leaves Daniel 3 additions to the Douay-Rheims', () => {
    expect(referenceToWEB('Daniel 3:52, 53, 54, 55, 56')).toBeNull()
    expect(referenceToWEB('Daniel 3:14-20, 91-92, 95')).toBeNull()
  })

  it('rejects what it cannot parse', () => {
    expect(referenceToWEB('Esther C:12, 14-16, 23-25')).toBeNull()
    expect(referenceToWEB('')).toBeNull()
    expect(referenceToWEB('Nowhere 1:1')).toBeNull()
  })
})

describe('describeDay', () => {
  const ev = (o) => ({ grade: 0, color: ['green'], liturgical_season: 'ORDINARY_TIME', day_of_the_week_iso8601: 3, ...o })

  it('names Sundays and memorials, not plain weekdays', () => {
    expect(describeDay([ev({ name: '32nd Sunday of Ordinary Time', day_of_the_week_iso8601: 7 })]).feastInfo)
      .toEqual({ isFeast: true, feastName: '32nd Sunday of Ordinary Time' })
    expect(describeDay([ev({ name: 'Friday of the 32nd Week of Ordinary Time' })]).feastInfo.isFeast).toBe(false)
  })

  it('picks the highest-ranked celebration and strips the national tag', () => {
    const day = describeDay([
      ev({ name: 'Friday of the 32nd Week of Ordinary Time' }),
      ev({ name: '[ US ] Saint Frances Xavier Cabrini, Virgin', grade: 3, color: ['white'] }),
    ])
    expect(day.feastInfo.feastName).toBe('Saint Frances Xavier Cabrini, Virgin')
    expect(day.liturgicalInfo.colour).toBe('white')
  })

  it('maps seasons and rose/violet vestments', () => {
    const gaudete = describeDay([ev({ name: 'Third Sunday of Advent (Gaudete)', grade: 7, color: ['rose', 'purple'], liturgical_season: 'ADVENT', day_of_the_week_iso8601: 7 })])
    expect(gaudete.liturgicalInfo).toMatchObject({ season: 'advent', label: 'Advent', colour: 'rose' })
    const lent = describeDay([ev({ name: 'Ash Wednesday', grade: 7, color: ['purple'], liturgical_season: 'LENT' })])
    expect(lent.liturgicalInfo.colour).toBe('violet')
  })

  it('shortens the Immaculate Conception title', () => {
    const day = describeDay([ev({ name: 'The Immaculate Conception of the Blessed Virgin Mary, Patronal feastday of the United States of America', grade: 6, color: ['white'] })])
    expect(day.feastInfo.feastName).toBe('The Immaculate Conception of the Blessed Virgin Mary')
  })

  it('returns nothing for an unknown day', () => {
    expect(describeDay(undefined)).toEqual({ liturgicalInfo: null, feastInfo: { isFeast: false, feastName: null } })
  })
})

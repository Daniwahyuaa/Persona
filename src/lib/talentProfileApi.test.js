import { describe, it, expect } from 'vitest'
import { nineboxBadgeClass, TOP_HISTORY_RE, summarizeCli, splitTopHistory } from './talentProfileApi.js'

describe('nineboxBadgeClass', () => {
  it('memetakan kategori 9box ke class badge yang benar', () => {
    expect(nineboxBadgeClass('HIGH POTENTIAL')).toBe('badge-hp')
    expect(nineboxBadgeClass('promotable')).toBe('badge-pr') // tidak case-sensitive
    expect(nineboxBadgeClass('Solid Contributor')).toBe('badge-sc')
    expect(nineboxBadgeClass('SLEEPING TIGER')).toBe('badge-st')
    expect(nineboxBadgeClass('UNFIT')).toBe('badge-un')
  })
  it('mengembalikan badge-null untuk kategori tidak dikenal/kosong', () => {
    expect(nineboxBadgeClass('')).toBe('badge-null')
    expect(nineboxBadgeClass(undefined)).toBe('badge-null')
    expect(nineboxBadgeClass('KATEGORI ANEH')).toBe('badge-null')
  })
})

describe('TOP_HISTORY_RE', () => {
  it('cocok dengan suffix "(Top History)" di akhir teks', () => {
    expect(TOP_HISTORY_RE.test('Sertifikasi PMP (Top History)')).toBe(true)
    expect(TOP_HISTORY_RE.test('Sertifikasi PMP (top history)')).toBe(true) // case-insensitive
  })
  it('tidak cocok kalau bukan di akhir teks / tidak ada suffix', () => {
    expect(TOP_HISTORY_RE.test('Sertifikasi PMP')).toBe(false)
    expect(TOP_HISTORY_RE.test('(Top History) di tengah kalimat lain')).toBe(false)
  })
})

describe('summarizeCli', () => {
  it('menghitung diukur, tercapai (benar), dan %ketercapaian dengan benar', () => {
    const rows = [{ hasil: 1 }, { hasil: 1 }, { hasil: 0 }, { hasil: 0 }]
    const result = summarizeCli(rows)
    expect(result.diukur).toBe(4)
    expect(result.benar).toBe(2)
    expect(result.rerata).toBe(50)
  })
  it('rerata dibulatkan (Math.round)', () => {
    const rows = [{ hasil: 1 }, { hasil: 0 }, { hasil: 0 }]
    expect(summarizeCli(rows).rerata).toBe(33) // 1/3 = 33.33... -> 33
  })
  it('semua kompetensi tercapai -> 100%', () => {
    const rows = [{ hasil: 1 }, { hasil: 1 }]
    expect(summarizeCli(rows).rerata).toBe(100)
  })
  it('data kosong/null -> diukur 0, rerata null (bukan NaN)', () => {
    expect(summarizeCli([])).toEqual({ diukur: 0, benar: 0, rerata: null, items: [] })
    expect(summarizeCli(null)).toEqual({ diukur: 0, benar: 0, rerata: null, items: [] })
    expect(summarizeCli(undefined)).toEqual({ diukur: 0, benar: 0, rerata: null, items: [] })
  })
})

describe('splitTopHistory', () => {
  it('memisahkan item bersuffix "(Top History)" ke array top, sisanya ke regular', () => {
    const items = [
      { achievement: 'Sertifikasi A' },
      { achievement: 'Sertifikasi Unggulan (Top History)' },
      { achievement: 'Proyek B' },
    ]
    const { regular, top } = splitTopHistory(items)
    expect(regular).toHaveLength(2)
    expect(top).toHaveLength(1)
    expect(regular.map((r) => r.achievement)).toEqual(['Sertifikasi A', 'Proyek B'])
  })
  it('suffix dibuang dari achievement pada item top', () => {
    const { top } = splitTopHistory([{ achievement: 'Sertifikasi Unggulan (Top History)' }])
    expect(top[0].achievement).toBe('Sertifikasi Unggulan')
  })
  it('input kosong/undefined menghasilkan dua array kosong, tidak error', () => {
    expect(splitTopHistory([])).toEqual({ regular: [], top: [] })
    expect(splitTopHistory(undefined)).toEqual({ regular: [], top: [] })
  })
  it('field lain pada item tetap dipertahankan (bukan cuma achievement)', () => {
    const { top } = splitTopHistory([{ id: 1, tahun: 2024, achievement: 'X (Top History)' }])
    expect(top[0]).toMatchObject({ id: 1, tahun: 2024, achievement: 'X' })
  })
})

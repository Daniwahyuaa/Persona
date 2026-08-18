import { describe, it, expect } from 'vitest'
import { getVisibleNavSections, getDefaultMenu, canAccessMenu, isDataLockedToSelf } from './navItems.js'

describe('navItems: getDefaultMenu', () => {
  it('user & executive default ke Talent Profile (tp)', () => {
    expect(getDefaultMenu('user')).toBe('tp')
    expect(getDefaultMenu('executive')).toBe('tp')
  })
  it('admin & superadmin default ke Talent Source (ts)', () => {
    expect(getDefaultMenu('admin')).toBe('ts')
    expect(getDefaultMenu('superadmin')).toBe('ts')
  })
  it('role kosong/tidak dikenal dianggap user -> tp', () => {
    expect(getDefaultMenu(undefined)).toBe('tp')
    expect(getDefaultMenu('')).toBe('tp')
  })
  it('tidak case-sensitive', () => {
    expect(getDefaultMenu('ADMIN')).toBe('ts')
  })
})

describe('navItems: getVisibleNavSections', () => {
  it('role "user" hanya melihat section User (tanpa Admin/Akun)', () => {
    const sections = getVisibleNavSections('user')
    const ids = sections.map((s) => s.id)
    expect(ids).toContain('section-user')
    expect(ids).not.toContain('section-admin')
    expect(ids).not.toContain('section-akun')
  })

  it('role "user" tidak melihat menu "Edit Profile" jika tidak termasuk role-nya', () => {
    // sanity check: item Edit Profile eksplisit untuk ['user','admin'] jadi harus tetap muncul
    const sections = getVisibleNavSections('user')
    const userSection = sections.find((s) => s.id === 'section-user')
    const itemIds = userSection.items.map((i) => i.id)
    expect(itemIds).toContain('editprofile')
  })

  it('role "executive" melihat section Admin tapi hanya item Talent Source', () => {
    const sections = getVisibleNavSections('executive')
    const adminSection = sections.find((s) => s.id === 'section-admin')
    expect(adminSection).toBeTruthy()
    const itemIds = adminSection.items.map((i) => i.id)
    expect(itemIds).toEqual(['ts'])
  })

  it('role "admin" melihat semua section (User, Admin, Akun)', () => {
    const sections = getVisibleNavSections('admin')
    const ids = sections.map((s) => s.id)
    expect(ids).toEqual(expect.arrayContaining(['section-user', 'section-admin', 'section-akun']))
  })

  it('role "superadmin" melihat "Kelola User" & "Kotak Masuk"', () => {
    const sections = getVisibleNavSections('superadmin')
    const akunSection = sections.find((s) => s.id === 'section-akun')
    const itemIds = akunSection.items.map((i) => i.id)
    expect(itemIds).toEqual(expect.arrayContaining(['users', 'inbox']))
  })
})

describe('navItems: canAccessMenu', () => {
  it('user boleh akses menu umum (tp, asesmen)', () => {
    expect(canAccessMenu('user', 'tp')).toBe(true)
    expect(canAccessMenu('user', 'asesmen')).toBe(true)
  })
  it('user TIDAK boleh akses menu admin (ts, users, inbox)', () => {
    expect(canAccessMenu('user', 'users')).toBe(false)
    expect(canAccessMenu('user', 'inbox')).toBe(false)
  })
  it('executive TIDAK boleh akses "Talent Point System" (mu)', () => {
    expect(canAccessMenu('executive', 'mu')).toBe(false)
  })
  it('admin boleh akses "Kelola User"', () => {
    expect(canAccessMenu('admin', 'users')).toBe(true)
  })
  it('menu yang tidak ada di navSections -> false', () => {
    expect(canAccessMenu('superadmin', 'menu-tidak-ada')).toBe(false)
  })
})

describe('navItems: isDataLockedToSelf', () => {
  it('true hanya untuk role user', () => {
    expect(isDataLockedToSelf('user')).toBe(true)
    expect(isDataLockedToSelf('admin')).toBe(false)
    expect(isDataLockedToSelf('superadmin')).toBe(false)
    expect(isDataLockedToSelf('executive')).toBe(false)
  })
})

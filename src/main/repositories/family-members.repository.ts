import { and, asc, eq, ne } from 'drizzle-orm'
import type { FamilyMemberDto } from '@shared/family-members'
import type { Executor } from '../db/client'
import { nameKey } from '@shared/common'
import { familyMembers } from '../db/schema'

const memberColumns = { id: familyMembers.id, name: familyMembers.name }

export function listMembers(ex: Executor): FamilyMemberDto[] {
  return ex.select(memberColumns).from(familyMembers).orderBy(asc(familyMembers.name)).all()
}

export function findMember(ex: Executor, id: number): FamilyMemberDto | undefined {
  return ex.select(memberColumns).from(familyMembers).where(eq(familyMembers.id, id)).get()
}

/** Whether another member already uses this name (case-insensitively). */
export function isMemberNameTaken(ex: Executor, name: string, exceptId?: number): boolean {
  const sameName = eq(familyMembers.nameKey, nameKey(name))
  const row = ex
    .select({ id: familyMembers.id })
    .from(familyMembers)
    .where(exceptId === undefined ? sameName : and(sameName, ne(familyMembers.id, exceptId)))
    .get()
  return row !== undefined
}

export function insertMember(ex: Executor, name: string, now: Date): FamilyMemberDto {
  return ex
    .insert(familyMembers)
    .values({ name, nameKey: nameKey(name), createdAt: now })
    .returning(memberColumns)
    .get()
}

export function renameMember(ex: Executor, id: number, name: string): FamilyMemberDto | undefined {
  return ex
    .update(familyMembers)
    .set({ name, nameKey: nameKey(name) })
    .where(eq(familyMembers.id, id))
    .returning(memberColumns)
    .get()
}

/** Returns false if there was no such member. Their accounts lose the owner (ON DELETE SET NULL). */
export function deleteMember(ex: Executor, id: number): boolean {
  return ex.delete(familyMembers).where(eq(familyMembers.id, id)).run().changes > 0
}

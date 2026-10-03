import type { FamilyMemberDto, MemberInput } from '@shared/family-members'
import type { Logger } from '@shared/logger'
import type { Db } from '../db/client'
import { DomainError } from '../errors'
import {
  deleteMember,
  insertMember,
  isMemberNameTaken,
  listMembers,
  renameMember
} from '../repositories/family-members.repository'

export interface FamilyMembersService {
  list(): FamilyMemberDto[]
  create(input: MemberInput): FamilyMemberDto
  rename(id: number, input: MemberInput): FamilyMemberDto
  remove(id: number): void
}

interface Deps {
  db: Db
  logger: Logger
  now: () => Date
}

export function createFamilyMembersService({ db, logger, now }: Deps): FamilyMembersService {
  const log = logger.child('members')

  function nameConflict(): DomainError {
    return new DomainError('CONFLICT', 'a family member with this name already exists')
  }

  return {
    list: () => listMembers(db),

    create({ name }) {
      const member = db.transaction((tx) => {
        if (isMemberNameTaken(tx, name)) throw nameConflict()
        return insertMember(tx, name, now())
      })
      log.info('member created', { memberId: member.id })
      return member
    },

    rename(id, { name }) {
      const member = db.transaction((tx) => {
        if (isMemberNameTaken(tx, name, id)) throw nameConflict()
        const renamed = renameMember(tx, id, name)
        if (!renamed) throw new DomainError('NOT_FOUND', `family member ${id} not found`)
        return renamed
      })
      log.info('member renamed', { memberId: id })
      return member
    },

    remove(id) {
      if (!deleteMember(db, id)) throw new DomainError('NOT_FOUND', `family member ${id} not found`)
      log.info('member deleted', { memberId: id })
    }
  }
}

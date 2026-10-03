import { z } from 'zod'
import { idSchema, nameKey } from './common'
import type { FamilyMemberDto } from './family-members'
import type { TagDto } from './tags'

export const ACCOUNT_NAME_MAX = 100
const TAG_NAME_MAX = 40
const TAGS_PER_ACCOUNT_MAX = 20

const tagNamesSchema = z
  .array(z.string().trim().min(1).max(TAG_NAME_MAX))
  .max(TAGS_PER_ACCOUNT_MAX)
  // Same tag typed twice in different case counts once; the first spelling wins.
  .transform((names) => {
    const seen = new Set<string>()
    return names.filter((name) => {
      const key = nameKey(name)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })

export const accountInputSchema = z.object({
  name: z.string().trim().min(1).max(ACCOUNT_NAME_MAX),
  lastFour: z
    .string()
    .regex(/^\d{4}$/)
    .nullable(),
  ownerId: idSchema.nullable(),
  tagNames: tagNamesSchema
})
export type AccountInput = z.input<typeof accountInputSchema>
export type ValidAccountInput = z.output<typeof accountInputSchema>

export interface AccountDto {
  id: number
  name: string
  lastFour: string | null
  owner: FamilyMemberDto | null
  tags: TagDto[]
  archived: boolean
  createdAt: number
}

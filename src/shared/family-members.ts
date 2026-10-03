import { z } from 'zod'

export const MEMBER_NAME_MAX = 60

export const memberInputSchema = z.object({
  name: z.string().trim().min(1).max(MEMBER_NAME_MAX)
})
export type MemberInput = z.infer<typeof memberInputSchema>

export interface FamilyMemberDto {
  id: number
  name: string
}

import type { TagDto } from '@shared/tags'
import type { Db } from '../db/client'
import { listTags } from '../repositories/tags.repository'

export interface TagsService {
  list(): TagDto[]
}

export function createTagsService({ db }: { db: Db }): TagsService {
  return {
    list: () => listTags(db)
  }
}

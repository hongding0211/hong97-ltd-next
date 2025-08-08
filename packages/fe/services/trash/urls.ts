import { TrashAPIS } from './types'

export const TRASH_PATHS: Record<keyof TrashAPIS, string> = {
  PostCreateTrash: 'trash/create',
  GetTrashList: 'trash/list',
  GetTrashById: 'trash/detail/:id',
}

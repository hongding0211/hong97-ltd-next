import { TrashService } from './trash.service'

describe('TrashService comment threads', () => {
  let model: any
  let userService: any
  let barkService: any
  let authService: any
  let service: TrashService

  const createComment = (commentId: string, parentCommentId?: string): any => ({
    commentId,
    parentCommentId,
    userId: 'author-1',
    anonymous: false,
    name: 'Author',
    time: 1,
    content: commentId,
  })

  const createTrash = (comments: any[]) => ({
    _id: { toString: () => 'trash-1' },
    content: 'Trash post',
    media: [],
    tags: [],
    timestamp: 1,
    likeHistory: [],
    comments,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    save: jest.fn().mockResolvedValue(undefined),
  })

  beforeEach(() => {
    model = {
      findById: jest.fn(),
    }
    userService = {
      findUserById: jest.fn().mockResolvedValue({
        profile: { name: 'Reply author' },
      }),
    }
    barkService = {
      push: jest.fn(),
    }
    authService = {
      isAdmin: jest.fn().mockResolvedValue({ isAdmin: false }),
    }
    service = new TrashService(model, userService, barkService, authService)
  })

  it('normalizes a reply to another reply onto the root thread', async () => {
    const targetReply = createComment('reply-1', 'root-1')
    targetReply.name = 'Target reply author'
    const trash = createTrash([createComment('root-1'), targetReply])
    model.findById.mockResolvedValue(trash)

    const result = await service.comment(
      {
        trashId: 'trash-1',
        content: 'Nested reply',
        parentCommentId: 'reply-1',
      },
      'author-2',
    )

    expect(trash.comments.at(-1)).toEqual(
      expect.objectContaining({
        content: 'Nested reply',
        parentCommentId: 'root-1',
        replyToCommentId: 'reply-1',
      }),
    )
    expect(result.comments.at(-1)?.parentCommentId).toBe('root-1')
    expect(result.comments.at(-1)?.replyToName).toBe('Target reply author')
    expect(trash.save).toHaveBeenCalledTimes(1)
  })

  it('rejects the 101st reply in a thread', async () => {
    const replies = Array.from({ length: 100 }, (_, index) =>
      createComment(`reply-${index}`, 'root-1'),
    )
    model.findById.mockResolvedValue(
      createTrash([createComment('root-1'), ...replies]),
    )

    await expect(
      service.comment({
        trashId: 'trash-1',
        content: 'One too many',
        parentCommentId: 'root-1',
        anonymous: true,
      }),
    ).rejects.toMatchObject({ message: 'trash.threadReplyLimitReached' })
  })

  it('counts only root comments toward the 50-comment post limit', async () => {
    const roots = Array.from({ length: 49 }, (_, index) =>
      createComment(`root-${index}`),
    )
    const replies = Array.from({ length: 20 }, (_, index) =>
      createComment(`reply-${index}`, 'root-0'),
    )
    const trash = createTrash([...roots, ...replies])
    model.findById.mockResolvedValue(trash)

    await expect(
      service.comment({
        trashId: 'trash-1',
        content: 'The 50th root',
        anonymous: true,
      }),
    ).resolves.toEqual(expect.objectContaining({ comments: expect.any(Array) }))
    expect(trash.comments.at(-1)?.parentCommentId).toBeUndefined()
  })

  it('keeps a deleted root as an anonymous tombstone when replies exist', async () => {
    const root = createComment('root-1')
    const reply = createComment('reply-1', 'root-1')
    const trash = createTrash([root, reply])
    model.findById.mockResolvedValue(trash)

    const result = await service.deleteComment(
      { trashId: 'trash-1', commentId: 'root-1' },
      'author-1',
    )

    expect(trash.comments).toHaveLength(2)
    expect(root).toEqual(
      expect.objectContaining({
        anonymous: true,
        content: '',
        deleted: true,
      }),
    )
    expect(root.userId).toBeUndefined()
    expect(root.name).toBeUndefined()
    expect(result.comments[0].deleted).toBe(true)
  })

  it('does not allow an unauthenticated user to delete anonymous comments', async () => {
    const anonymousComment = {
      ...createComment('root-1'),
      userId: undefined,
      anonymous: true,
    }
    model.findById.mockResolvedValue(createTrash([anonymousComment]))

    await expect(
      service.deleteComment({ trashId: 'trash-1', commentId: 'root-1' }),
    ).rejects.toMatchObject({ message: 'trash.commentNotAuthor' })
  })

  it.each([
    ['root comment', 'root-1'],
    ['child comment', 'reply-1'],
  ])('allows an admin user to delete another user %s', async (_, commentId) => {
    const root = createComment('root-1')
    const reply = createComment('reply-1', 'root-1')
    const trash = createTrash([root, reply])
    model.findById.mockResolvedValue(trash)
    authService.isAdmin.mockResolvedValue({ isAdmin: true })

    await expect(
      service.deleteComment({ trashId: 'trash-1', commentId }, 'root-user'),
    ).resolves.toEqual(expect.objectContaining({ comments: expect.any(Array) }))

    if (commentId === 'root-1') {
      expect(root.deleted).toBe(true)
      expect(trash.comments).toContain(reply)
    } else {
      expect(trash.comments).toEqual([root])
    }
    expect(trash.save).toHaveBeenCalledTimes(1)
  })
})

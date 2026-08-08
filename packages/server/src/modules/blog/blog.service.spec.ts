import { BlogService } from './blog.service'

describe('BlogService read queries', () => {
  let model: any
  let authService: any
  let blogViewDedupeService: any
  let service: BlogService

  const createReadQuery = (result: unknown) => {
    const query: any = {}
    query.select = jest.fn().mockReturnValue(query)
    query.skip = jest.fn().mockReturnValue(query)
    query.limit = jest.fn().mockReturnValue(query)
    query.sort = jest.fn().mockReturnValue(query)
    query.lean = jest.fn().mockResolvedValue(result)
    return query
  }

  beforeEach(() => {
    model = {
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      updateOne: jest.fn(),
    }
    authService = {
      isAdmin: jest.fn(),
    }
    blogViewDedupeService = {
      claim: jest.fn(),
    }
    service = new BlogService(
      model,
      {} as any,
      authService,
      {
        push: jest.fn(),
      } as any,
      blogViewDedupeService,
    )
  })

  it('projects metadata fields and preserves user-dependent response values', async () => {
    const aggregate = {
      exec: jest.fn().mockResolvedValue([
        {
          blogId: 'post-1',
          title: 'Post 1',
          viewCount: 2,
          likeHistory: [{ userId: 'user-1', time: 3 }],
          time: 100,
          coverImg: 'https://example.com/cover.jpg',
          keywords: ['next'],
          authRequired: false,
          shortCode: 'abcdef',
          hasPublished: true,
          hidden2Public: false,
          lastUpdateTime: 200,
        },
      ]),
    }
    model.aggregate.mockReturnValue(aggregate)
    authService.isAdmin.mockResolvedValue({ isAdmin: true })

    await expect(service.meta({ blogId: 'post-1' }, 'user-1')).resolves.toEqual(
      {
        blogId: 'post-1',
        blogTitle: 'Post 1',
        viewCount: 2,
        likeCount: 1,
        isLiked: true,
        time: 100,
        coverImg: 'https://example.com/cover.jpg',
        keywords: ['next'],
        authRequired: false,
        shortCode: 'abcdef',
        hasPublished: true,
        hidden2Public: false,
        pinned: false,
        lastUpdateAt: 200,
      },
    )
    const pipeline = model.aggregate.mock.calls[0][0]
    expect(pipeline[1].$project).toEqual(
      expect.objectContaining({
        blogId: 1,
        title: 1,
        viewCount: { $size: { $ifNull: ['$viewHistory', []] } },
        likeHistory: 1,
      }),
    )
    expect(pipeline[1].$project).not.toHaveProperty('viewHistory')
    expect(pipeline[1].$project).not.toHaveProperty('content')
    expect(pipeline[1].$project).not.toHaveProperty('comments')
    expect(aggregate.exec).toHaveBeenCalledTimes(1)
  })

  it('appends a view history entry only when the dedupe claim succeeds', async () => {
    model.aggregate
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ viewCount: 2 }]),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue([{ viewCount: 3 }]),
      })
    model.updateOne.mockResolvedValue({ matchedCount: 1 })
    blogViewDedupeService.claim.mockResolvedValue(true)

    await expect(
      service.view(
        { blogId: 'post-1' },
        { aliases: ['visitor:one'], visitorIdHash: 'visitor-hash' },
        'user-1',
      ),
    ).resolves.toEqual({ blogId: 'post-1', counted: true, viewCount: 3 })

    expect(model.updateOne).toHaveBeenCalledWith(
      { blogId: 'post-1' },
      {
        $push: {
          viewHistory: {
            userId: 'user-1',
            visitorIdHash: 'visitor-hash',
            time: expect.any(Number),
          },
        },
      },
    )
  })

  it('does not append view history when the viewer is inside the window', async () => {
    model.aggregate.mockReturnValue({
      exec: jest.fn().mockResolvedValue([{ viewCount: 2 }]),
    })
    blogViewDedupeService.claim.mockResolvedValue(false)

    await expect(
      service.view(
        { blogId: 'post-1' },
        { aliases: ['visitor:one'], visitorIdHash: 'visitor-hash' },
      ),
    ).resolves.toEqual({ blogId: 'post-1', counted: false, viewCount: 2 })

    expect(model.updateOne).not.toHaveBeenCalled()
  })

  it('projects only the blog identifier and content for content reads', async () => {
    const query = createReadQuery({
      blogId: 'post-1',
      content: '# Hello',
    })
    model.findOne.mockReturnValue(query)

    await expect(service.getContent({ blogId: 'post-1' })).resolves.toEqual({
      blogId: 'post-1',
      content: '# Hello',
    })
    expect(query.select).toHaveBeenCalledWith({
      _id: 0,
      blogId: 1,
      content: 1,
    })
    expect(query.lean).toHaveBeenCalledTimes(1)
  })

  it('projects list fields and preserves list and pinned-list responses', async () => {
    const listQuery = createReadQuery([
      {
        blogId: 'post-2',
        title: 'Post 2',
        keywords: ['two'],
        time: 200,
        hasPublished: true,
      },
    ])
    const pinnedQuery = createReadQuery([
      {
        blogId: 'post-1',
        title: 'Post 1',
        coverImg: 'https://example.com/cover.jpg',
        keywords: ['one'],
        time: 100,
        authRequired: true,
        hasPublished: true,
        pinned: true,
      },
    ])
    model.find.mockReturnValueOnce(listQuery).mockReturnValueOnce(pinnedQuery)
    model.countDocuments.mockResolvedValue(2)
    authService.isAdmin.mockResolvedValue({ isAdmin: false })

    await expect(
      service.list({ page: 1, pageSize: 10, includePinned: true }),
    ).resolves.toEqual({
      data: [
        {
          key: 'post-2',
          title: 'Post 2',
          coverImg: undefined,
          keywords: ['two'],
          time: 200,
          authRequired: undefined,
          pinned: false,
          hasPublished: true,
          hidden2Public: undefined,
        },
      ],
      pinnedData: [
        {
          key: 'post-1',
          title: 'Post 1',
          coverImg: 'https://example.com/cover.jpg',
          keywords: ['one'],
          time: 100,
          authRequired: true,
          pinned: true,
          hasPublished: true,
          hidden2Public: undefined,
        },
      ],
      pinnedTotal: 1,
      total: 2,
      page: 1,
      pageSize: 10,
    })
    for (const query of [listQuery, pinnedQuery]) {
      expect(query.select).toHaveBeenCalledWith(
        expect.objectContaining({
          blogId: 1,
          title: 1,
          hasPublished: 1,
          hidden2Public: 1,
        }),
      )
      expect(query.select.mock.calls[0][0]).not.toHaveProperty('content')
      expect(query.select.mock.calls[0][0]).not.toHaveProperty('comments')
      expect(query.select.mock.calls[0][0]).not.toHaveProperty('viewHistory')
      expect(query.select.mock.calls[0][0]).not.toHaveProperty('likeHistory')
      expect(query.lean).toHaveBeenCalledTimes(1)
    }
  })

  it('persists all supplied fields when creating a blog', async () => {
    const save = jest.fn().mockResolvedValue(undefined)
    const blogModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save,
    }))
    service = new BlogService(
      blogModel as any,
      {} as any,
      authService,
      {
        push: jest.fn(),
      } as any,
      blogViewDedupeService,
    )

    await expect(
      service.new2({
        title: 'Complete draft',
        coverImg: 'https://example.com/cover.jpg',
        keywords: ['next', 'blog'],
        content: '# Draft body',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        title: 'Complete draft',
        coverImg: 'https://example.com/cover.jpg',
        keywords: ['next', 'blog'],
      }),
    )

    expect(blogModel).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Complete draft',
        coverImg: 'https://example.com/cover.jpg',
        keywords: ['next', 'blog'],
        content: '# Draft body',
      }),
    )
    expect(save).toHaveBeenCalledTimes(1)
  })
})

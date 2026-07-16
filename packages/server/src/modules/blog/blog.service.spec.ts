import { BlogService } from './blog.service'

describe('BlogService read queries', () => {
  let model: any
  let authService: any
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
    }
    authService = {
      isAdmin: jest.fn(),
    }
    service = new BlogService(model, {} as any, authService, {
      push: jest.fn(),
    } as any)
  })

  it('projects metadata fields and preserves user-dependent response values', async () => {
    const query = createReadQuery({
      blogId: 'post-1',
      title: 'Post 1',
      viewHistory: [{ time: 1 }, { userId: 'user-1', time: 2 }],
      likeHistory: [{ userId: 'user-1', time: 3 }],
      time: 100,
      coverImg: 'https://example.com/cover.jpg',
      keywords: ['next'],
      authRequired: false,
      shortCode: 'abcdef',
      hasPublished: true,
      hidden2Public: false,
      lastUpdateTime: 200,
    })
    model.findOne.mockReturnValue(query)
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
    expect(query.select).toHaveBeenCalledWith(
      expect.objectContaining({
        blogId: 1,
        title: 1,
        viewHistory: 1,
        likeHistory: 1,
      }),
    )
    expect(query.select.mock.calls[0][0]).not.toHaveProperty('content')
    expect(query.select.mock.calls[0][0]).not.toHaveProperty('comments')
    expect(query.lean).toHaveBeenCalledTimes(1)
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
})

import { Test, TestingModule } from '@nestjs/testing'
import { ShortLinkController } from './shortlink.controller'
import { ShortLinkService } from './shortlink.service'

describe('ShortLinkController', () => {
  let controller: ShortLinkController
  let service: ShortLinkService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShortLinkController],
      providers: [
        {
          provide: ShortLinkService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            redirect: jest.fn(),
          },
        },
      ],
    }).compile()

    controller = module.get<ShortLinkController>(ShortLinkController)
    service = module.get<ShortLinkService>(ShortLinkService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('redirect', () => {
    it('should return redirect URL', async () => {
      const shortCode = 'abc123'
      const expectedUrl = 'https://example.com'

      jest.spyOn(service, 'redirect').mockResolvedValue(expectedUrl)

      const result = await controller.redirect(shortCode)

      expect(result).toEqual({ url: expectedUrl })
      expect(service.redirect).toHaveBeenCalledWith({ shortCode })
    })
  })
})

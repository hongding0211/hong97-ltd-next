import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { v4 as uuidv4 } from 'uuid'
import { AppendDto } from './dto/append.dto'
import { ConfigListDto } from './dto/config-list'
import { CreateDto } from './dto/create.dto'
import { DetailDto, DetailResponseDto } from './dto/detail.dto'
import { EditConfigItemDto } from './dto/editConfigItem'
import { ListDto, ListResponseDto } from './dto/list.dto'
import { UCPDocument } from './schema/ucp.schema'
import { UCP } from './schema/ucp.schema'

@Injectable()
export class UCPService {
  constructor(@InjectModel(UCP.name) private ucpModel: Model<UCPDocument>) {}

  async list(listDto: ListDto): Promise<ListResponseDto> {
    const { page = 1, pageSize = 10 } = listDto
    const data = await this.ucpModel
      .find()
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .sort({ createdAt: -1 })
    const total = await this.ucpModel.countDocuments()

    return {
      data: data.map((e) => ({
        id: e.id,
        desc: e.desc,
      })),
      total,
      page,
      pageSize,
    }
  }

  async create(createDto: CreateDto, userId: string) {
    const data = await this.ucpModel.create({
      id: uuidv4(),
      desc: createDto.desc,
      data: [],
      createdBy: userId,
      publicRead: createDto.publicRead,
    })

    return data
  }

  async detail(detailDto: DetailDto): Promise<DetailResponseDto> {
    const data = await this.ucpModel.findOne({ id: detailDto.id })

    if (!data) {
      throw new GeneralException('ucp.detailNotFound')
    }

    return {
      id: data.id,
      desc: data.desc,
    }
  }

  async configList(query: ConfigListDto, userId: string) {
    const { page = 1, pageSize = 10, id } = query

    const ucp = await this.ucpModel.findOne({ id })

    if (!ucp) {
      throw new GeneralException('ucp.detailNotFound')
    }
    if (!ucp.publicRead && !userId) {
      throw new GeneralException('ucp.noPermission')
    }

    if (!ucp.data.length) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
      }
    }

    const result = await this.ucpModel.aggregate([
      { $match: { id } },
      { $unwind: '$data' },
      { $sort: { 'data.createdAt': -1 } },
      {
        $group: {
          _id: '$_id',
          total: { $sum: 1 },
          data: { $push: '$data' },
        },
      },
      {
        $project: {
          _id: 0,
          data: {
            $slice: ['$data', (page - 1) * pageSize, pageSize],
          },
          total: 1,
        },
      },
    ])

    if (!result.length) {
      throw new GeneralException('ucp.detailNotFound')
    }

    return {
      data: result[0].data,
      total: result[0].total,
      page,
      pageSize,
    }
  }

  async listAll(id: string, userId: string) {
    const data = await this.ucpModel.findOne({ id })
    if (!data) {
      throw new GeneralException('ucp.detailNotFound')
    }
    if (!data.publicRead && !userId) {
      throw new GeneralException('ucp.noPermission')
    }
    return data.data
  }

  async append(appendDto: AppendDto) {
    const ucp = await this.ucpModel.findOne({ id: appendDto.id })

    if (!ucp) {
      throw new GeneralException('ucp.detailNotFound')
    }

    const item = {
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      raw: appendDto.data,
    }

    ucp.data.push(item)

    await ucp.save()

    return item
  }

  async update(updateDto: EditConfigItemDto) {
    const ucp = await this.ucpModel.findOne({ id: updateDto.ucpId })

    if (!ucp) {
      throw new GeneralException('ucp.detailNotFound')
    }

    const index = ucp.data.findIndex((e) => e.id === updateDto.itemId)

    if (index === -1) {
      throw new GeneralException('ucp.configNotFound')
    }

    const res = await this.ucpModel.updateOne(
      {
        id: updateDto.ucpId,
        'data.id': updateDto.itemId,
      },
      {
        $set: {
          [`data.${index}.updatedAt`]: Date.now(),
          [`data.${index}.raw`]: updateDto.data,
        },
      },
    )

    if (res.matchedCount === 0) {
      throw new GeneralException('common.updateFailed')
    }

    return updateDto
  }

  async deleteConfig(query: EditConfigItemDto) {
    const ucp = await this.ucpModel.findOne({ id: query.ucpId })

    if (!ucp) {
      throw new GeneralException('ucp.detailNotFound')
    }

    const index = ucp.data.findIndex((e) => e.id === query.itemId)

    if (index === -1) {
      throw new GeneralException('ucp.configNotFound')
    }

    ucp.data.splice(index, 1)

    await ucp.save()

    return query
  }
}

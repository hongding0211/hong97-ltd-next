import { Injectable } from '@nestjs/common'
import { UCPDocument } from './schema/ucp.schema'
import { UCP } from './schema/ucp.schema'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { ListDto, ListResponseDto } from './dto/list.dto'
import { CreateDto } from './dto/create.dto'
import { v4 as uuidv4 } from 'uuid'
import { DetailDto, DetailResponseDto } from './dto/detail.dto'
import { GeneralException } from 'src/exceptions/general-exceptions'
import { AppendDto } from './dto/append.dto'

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

  async listByUcpId(id: string) {
    const data = await this.ucpModel.findOne({ id })

    if (!data) {
      throw new GeneralException('ucp.detailNotFound')
    }

    return data.data
  }

  async append(appendDto: AppendDto) {
    const ucp = await this.ucpModel.findOne({ id: appendDto.id })

    if (!ucp) {
      throw new GeneralException('ucp.detailNotFound')
    }

    ucp.data.push(appendDto.data)

    await ucp.save()

    return ucp
  }
}

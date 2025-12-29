import { Highlighter } from '@/components/ui/highlighter'
import { ReactMdxComponent } from '../edit/editor/react-mdx-types'

interface IWrapped25 {
  type: string
}

const Wrapped25: ReactMdxComponent<IWrapped25> = (nodes) => {
  const { type } = nodes.props

  if (type === '1') {
    return (
      <>
        <h5>
          <Highlighter action="highlight" color="#FFE100">
            <span className="!text-black"> 2025 年，</span>
          </Highlighter>
        </h5>

        <h5 className="!mb-6">
          平安行驶
          <span className="text-xs relative top-[-8px] opacity-80">*</span>{' '}
          <Highlighter action="underline" color="#0073FF">
            {' '}
            10,000+ km
          </Highlighter>{' '}
          ，更换 Michelin Pilot Sport 4 19{`'`} 轮胎
          <Highlighter action="underline" color="#0073FF">
            共 2 个
          </Highlighter>{' '}
          。
        </h5>

        <h5 className="!mb-6">
          光顾 Tesla 售后服务中心{' '}
          <Highlighter action="underline" color="#0073FF">
            3 次
          </Highlighter>{' '}
          ，保费大涨{' '}
          <Highlighter action="underline" color="#0073FF">
            ¥2,000
          </Highlighter>{' '}
          元人民币。
        </h5>

        <h5 className="!mb-6">
          大模型消耗 Token{' '}
          <Highlighter action="underline" color="#0073FF">
            163 M
          </Highlighter>{' '}
          ，提效
          <span className="text-xs relative top-[-8px] opacity-80">-</span>
          {'  '}
          <Highlighter action="underline" color="#0073FF">
            274%
          </Highlighter>{' '}
          。
        </h5>

        <h5 className="!mb-6">
          产出数字垃圾{' '}
          <Highlighter action="underline" color="#0073FF">
            564 G
          </Highlighter>{' '}
          ，共制作了
          {'  '}
          <Highlighter action="underline" color="#0073FF">
            8 条
          </Highlighter>{' '}
          Vlog。
        </h5>

        <h5 className="!mb-6">
          熬夜次数同比
          <Highlighter action="crossed-off" color="#0073FF">
            降低 12%
          </Highlighter>{' '}
          ，改善不良习惯或嗜好
          {'  '}
          <Highlighter action="underline" color="#0073FF">
            -2 个
          </Highlighter>{' '}
          。
        </h5>
      </>
    )
  }

  if (type === '2') {
    return (
      <p className="text-xs opacity-60">
        * 数据截止至 2025 年 12 月 30
        日，平安行驶指的是博主本人自行驾驶，不包含除博主本人以外的使用情况。
        <br />- 数据截止于 2025 年 12 月 30 日，统计数据来源于
        Cursor。提效情况为博主本人随意估算，仅供参考。
      </p>
    )
  }

  return null
}

export default Wrapped25

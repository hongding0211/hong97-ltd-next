const prompts = require('@inquirer/prompts')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const pinyin = require('pinyin').default || require('pinyin')

const BLOG_CONFIG_PATH = path.resolve(__dirname, '../config/blog.json')
const MARKDOWNS_DIR = path.resolve(__dirname, '../pages/blog/markdowns')

async function main() {
  const title = (await prompts.input({ message: 'Enter the title\r\n' }))
    .toString()
    .trim()
  let key = ''
  const timestamp = Date.now()
  if (/^[a-zA-Z\s]+$/.test(title)) {
    // 英文标题
    key = title.toLowerCase().replace(/\s+/g, '-') + '-' + timestamp
  } else {
    // 中文标题
    const pyArr = pinyin(title, { style: pinyin.STYLE_NORMAL })
    key =
      pyArr.flat().join('-').toLowerCase().replace(/\s+/g, '-') +
      '-' +
      timestamp
  }
  const keywordsInput = (
    await prompts.input({ message: 'Enter the keywords\r\n' })
  )
    .toString()
    .trim()
  const keywords = keywordsInput
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  const coverImg = (
    await prompts.input({
      message: 'Enter the cover image url\r\n',
      default: '',
    })
  )
    .toString()
    .trim()
  const authRequired = await prompts.confirm({
    message: 'Is auth required?',
    default: false,
  })

  const time = Date.now()
  const pathStr = key

  // 1. 修改 blog.json
  let blogConfigArr = []
  if (fs.existsSync(BLOG_CONFIG_PATH)) {
    blogConfigArr = JSON.parse(fs.readFileSync(BLOG_CONFIG_PATH, 'utf-8'))
  }
  const newConfigObj = {
    key,
    title,
    path: pathStr,
    time,
    keywords,
    coverImg,
    ...(authRequired ? { authRequired: true } : {}),
  }
  blogConfigArr.unshift(newConfigObj)
  fs.writeFileSync(
    BLOG_CONFIG_PATH,
    JSON.stringify(blogConfigArr, null, 2),
    'utf-8',
  )
  console.log(chalk.green('Blog config updated'))

  // 2. 新建 mdx 文件
  const mdxPath = path.join(MARKDOWNS_DIR, `${key}.mdx`)
  const mdxTemplate = `import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import BlogConfig from '../../../config/blog'
import { BlogContainer } from '../../../components/blog/BlogContainer'

> Start writing your blog here...

export default BlogContainer

export async function getServerSideProps(context) {
  const { locale, query } = context
  const { key } = query || {}
  const meta = BlogConfig.find(item => item.key === key)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog'])),
      meta,
    },
  }
}
`
  fs.writeFileSync(mdxPath, mdxTemplate, 'utf-8')
  console.log(chalk.green(`New blog created: ${mdxPath}`))
}

main()

const prompts = require('@inquirer/prompts')
const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const { login } = require('./login')

const CREATE_BLOG_URL = 'https://hong97.ltd/api/blog/new'

const MARKDOWNS_DIR = path.resolve(
  __dirname,
  '../packages/fe/pages/blog/markdowns',
)

const readToken = () => {
  if (!fs.existsSync('cache.json')) {
    return null
  }
  try {
    return JSON.parse(fs.readFileSync('cache.json', 'utf-8')).token
  } catch {
    return null
  }
}

async function main() {
  const title = (await prompts.input({ message: 'Enter the title\r\n' }))
    .toString()
    .trim()

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

  let token = readToken()
  if (!token) {
    console.log(chalk.red('Please login first'))
    await login()
  }
  token = readToken()

  const res = await fetch(CREATE_BLOG_URL, {
    method: 'POST',
    body: JSON.stringify({
      title,
      keywords,
      coverImg,
      authRequired,
    }),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  const data = await res.json()
  const key = data?.data?.key
  if (!key) {
    console.log(chalk.red('Create blog failed'))
    return
  }

  const mdxPath = path.join(MARKDOWNS_DIR, `${key}.mdx`)
  const mdxTemplate = `import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { BlogContainer } from '../../../components/blog/BlogContainer'
import { http } from '@services/http'
import { time } from '@utils/time'

> Start writing your blog here...

export default BlogContainer

export async function getServerSideProps(context) {
  const { locale, query } = context
  const meta = await http.get('GetBlogMeta', {
    blogId: query?.key
  })
  time.setLocale(locale)
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common', 'blog'])),
      meta: meta?.data,
    },
  }
}

`
  fs.writeFileSync(mdxPath, mdxTemplate, 'utf-8')
  console.log(chalk.green(`New blog created: ${mdxPath}`))
}

main()

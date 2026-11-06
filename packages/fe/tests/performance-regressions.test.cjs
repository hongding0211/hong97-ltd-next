const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const test = require('node:test')

const root = path.resolve(__dirname, '..')
const req = createRequire(path.join(root, 'package.json'))
const ts = req('typescript')
const axios = req('axios')

// Execute the actual TS modules with real Axios/Zustand, without a browser or API.
function makeLoader(overrides = {}) {
  const cache = new Map()
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports
    const module = { exports: {} }
    cache.set(filename, module)
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText
    const localRequire = (name) => {
      if (Object.hasOwn(overrides, name)) return overrides[name]
      if (name === '@/lib/utils')
        return { cn: (...args) => args.filter(Boolean).join(' ') }
      if (name.startsWith('@utils/')) {
        if (name.endsWith('.cjs'))
          return req(path.join(root, 'utils', name.slice(7)))
        return load(path.join(root, 'utils', `${name.slice(7)}.ts`))
      }
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), name)
        if (/\.(cjs|json)$/.test(name)) return req(base)
        return load(fs.existsSync(base + '.ts') ? base + '.ts' : base + '.tsx')
      }
      return req(name)
    }
    new Function('require', 'module', 'exports', code)(
      localRequire,
      module,
      module.exports,
    )
    return module.exports
  }
  return (file) => load(path.join(root, file))
}

function session(respond) {
  const calls = []
  const toasts = []
  const load = makeLoader({
    '@utils/run-on-server': { isClient: true },
    'next-i18next': { i18n: { language: 'en' } },
    '../utils/toast': { toast: (...args) => toasts.push(args) },
  })
  const { http } = load('services/http.ts')
  http.axiosInstance.defaults.adapter = async (config) => {
    calls.push({ url: config.url, method: config.method })
    const [status, data] = await respond(config)
    const response = { status, data, config, headers: {}, statusText: '' }
    if (status >= 400) {
      throw new axios.AxiosError(
        'Test response',
        'ERR_BAD_REQUEST',
        config,
        {},
        response,
      )
    }
    return response
  }
  const { useAppStore } = makeLoader({ '@services/http': { http } })(
    'stores/general.ts',
  )
  return { http, store: useAppStore, calls, toasts }
}

const user = { userId: 'test-user', profile: { name: 'Test' } }

test('anonymous initialization attempts refresh once, then finishes silently', async () => {
  const s = session(() => [401, {}])
  await s.store.getState().init()
  assert.deepEqual(
    s.calls.map((c) => c.url),
    ['auth/info', 'auth/refreshToken'],
  )
  assert.equal(s.store.getState().user, null)
  assert.equal(s.store.getState().isLoading, false)
  assert.equal(s.toasts.length, 0)
})

test('valid session needs only GetInfo', async () => {
  const s = session(() => [200, { isSuccess: true, data: user }])
  await s.store.getState().init()
  assert.deepEqual(
    s.calls.map((c) => c.url),
    ['auth/info'],
  )
  assert.deepEqual(s.store.getState().user, user)
  assert.equal(s.store.getState().isLoading, false)
})

test('SSR-prefetched user needs no browser request', async () => {
  const s = session(() => assert.fail('unexpected request'))
  await s.store.getState().init(user)
  assert.equal(s.calls.length, 0)
  assert.deepEqual(s.store.getState().user, user)
  assert.equal(s.store.getState().isLoading, false)
})

test('expired access restores through interceptor refresh and retries GetInfo', async () => {
  let refreshed = false
  const s = session((config) => {
    if (config.url === 'auth/refreshToken') {
      refreshed = true
      return [200, { isSuccess: true }]
    }
    return refreshed ? [200, { isSuccess: true, data: user }] : [401, {}]
  })
  await s.store.getState().init()
  assert.deepEqual(
    s.calls.map((c) => c.url),
    ['auth/info', 'auth/refreshToken', 'auth/info'],
  )
  assert.deepEqual(s.store.getState().user, user)
  assert.equal(s.store.getState().isLoading, false)
})

test('a retried 401 cannot start a refresh loop', async () => {
  const s = session((config) => [
    config.url === 'auth/refreshToken' ? 200 : 401,
    {},
  ])
  await s.store.getState().init()
  assert.deepEqual(
    s.calls.map((c) => c.url),
    ['auth/info', 'auth/refreshToken', 'auth/info'],
  )
  assert.equal(s.store.getState().isLoading, false)
})

for (const status of [403, 429, 500]) {
  test(`initial GetInfo ${status} does not trigger a token refresh`, async () => {
    const s = session(() => [status, {}])
    await s.store.getState().init()
    assert.deepEqual(
      s.calls.map((c) => c.url),
      ['auth/info'],
    )
    assert.equal(s.store.getState().isLoading, false)
  })
}

test('network failure does not trigger refresh', async () => {
  const s = session(() => {
    throw new axios.AxiosError('Network Error', 'ERR_NETWORK')
  })
  await s.store.getState().init()
  assert.deepEqual(
    s.calls.map((c) => c.url),
    ['auth/info'],
  )
  assert.equal(s.store.getState().isLoading, false)
})

test('concurrent expired requests share one refresh', async () => {
  let refreshed = false
  const s = session(async (config) => {
    if (config.url === 'auth/refreshToken') {
      await new Promise((resolve) => setTimeout(resolve, 10))
      refreshed = true
      return [200, { isSuccess: true }]
    }
    return refreshed ? [200, { isSuccess: true, data: user }] : [401, {}]
  })
  const results = await Promise.all(
    Array.from({ length: 6 }, () => s.http.get('GetInfo')),
  )
  assert.equal(s.calls.filter((c) => c.url === 'auth/refreshToken').length, 1)
  assert.ok(results.every((result) => result.data.userId === user.userId))
})

const { getOssImageVariant, ossImageLoader } =
  makeLoader()('utils/oss-image.ts')
const original =
  'https://ltd-hong97-imgs.oss-cn-shanghai.aliyuncs.com/blog/photo.webp?foo=bar#w=2500&h=1250&th=GPiBC4IOM2AFmwQ22DAOHGCGg3aotog'

test('cover ThumbHash is present in server HTML before JavaScript or image download', () => {
  const src = original.replace(
    'th=GPiBC4IOM2AFmwQ22DAOHGCGg3aotog',
    'th=GPiBC4IOM2AFmwQ22DAOHGCGg3aotog',
  )
  const { getImagePlaceholder } = makeLoader()('utils/image-placeholder.ts')
  const placeholder = getImagePlaceholder(src)
  assert.ok(placeholder.startsWith('data:image/png;base64,'))
  assert.equal(
    getImagePlaceholder(original.replace(/th=.*/, 'th=abc')),
    undefined,
  )
  assert.equal(
    getImagePlaceholder('https://example.com/no-hash.jpg'),
    undefined,
  )
  const { BlogCoverImage } = makeLoader()('components/blog/BlogCoverImage.tsx')
  const markup = req('react-dom/server').renderToString(
    req('react').createElement(BlogCoverImage, { src, alt: 'cover' }),
  )
  assert.ok(markup.includes('data-nimg="fill"'))
  assert.ok(markup.includes('data-image-fade=""'))
  assert.ok(markup.includes('data-image-placeholder=""'))
  assert.ok(markup.includes(placeholder))
  assert.ok(markup.includes('opacity:0'))
  assert.ok(markup.includes('motion-reduce:transition-none'))
  assert.ok(markup.includes('<noscript>'))
  assert.ok(!markup.includes('/_next/image'))
})

test('image fading is opt-in and does not hide images without a placeholder', () => {
  const { SiteImage } = makeLoader()('components/common/SiteImage.tsx')
  const render = (props) =>
    req('react-dom/server').renderToString(
      req('react').createElement(SiteImage, {
        src: original,
        alt: '',
        ...props,
      }),
    )
  const defaultImage = render({})
  assert.ok(!defaultImage.includes('data-image-fade'))
  assert.ok(!defaultImage.includes('opacity:0'))
  assert.ok(defaultImage.includes('background-image:'))
  const noHash = render({
    fadeIn: true,
    src: 'https://example.com/photo.jpg',
    width: 300,
    height: 200,
  })
  assert.ok(!noHash.includes('data-image-fade'))
  assert.ok(!noHash.includes('opacity:0'))
})

test('plain Markdown images use responsive delivery and preserve authored dimensions/srcset', () => {
  const { MarkdownImage } = makeLoader()('components/blog/MarkdownImage.tsx')
  const render = (props) =>
    req('react-dom/server').renderToString(
      req('react').createElement(MarkdownImage, props),
    )
  const normal = render({ src: original, alt: 'sample' })
  assert.ok(normal.includes('x-oss-process='))
  assert.ok(normal.includes('width="2500"'))
  assert.ok(!normal.includes('/_next/image'))
  const authored = render({
    src: original,
    alt: 'sample',
    width: '300',
    height: '150',
    srcSet: '/small.png 300w, /large.png 600w',
    sizes: '300px',
  })
  assert.ok(authored.includes('width="300"'))
  assert.ok(authored.includes('height="150"'))
  assert.ok(authored.includes('srcSet="/small.png 300w, /large.png 600w"'))
  assert.ok(!authored.includes('x-oss-process='))
  const percentage = render({ src: '/local.png', alt: '', width: '50%' })
  assert.ok(percentage.includes('width:50%'))
})

test('MDX literal images and Markdown images resolve through shared image components', async () => {
  const { serialize } = await import(req.resolve('next-mdx-remote/serialize'))
  const remarkImages = req(path.join(root, 'utils/remark-images.cjs'))
  const result = await serialize(
    '![plain](/plain.png)\n\n<img src="/literal.png" width="300" />\n\nInline <img src="/inline.png" /> image.',
    {
      mdxOptions: { remarkPlugins: [remarkImages] },
    },
  )
  assert.ok(result.compiledSource.includes('_components.img'))
  assert.ok(result.compiledSource.includes('MarkdownImage'))
  assert.ok(!/_jsx(?:DEV)?\("img"/.test(result.compiledSource))
})

test('cover upload always generates metadata before signing, and refuses metadata failure', async () => {
  const saved = {
    Image: global.Image,
    document: global.document,
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  }
  let canvasWorks = true
  let signed = 0
  let uploaded = 0
  const source =
    'https://ltd-hong97-imgs.oss-cn-shanghai.aliyuncs.com/blog/upload.webp'
  const load = makeLoader({
    '../services/http': {
      http: {
        post: async () => {
          signed++
          return {
            isSuccess: true,
            data: {
              url: 'https://upload.test',
              fileName: 'upload.webp',
              filePath: source,
            },
          }
        },
      },
    },
    './toast': { toast: () => {} },
    axios: {
      create: () => ({
        put: async () => {
          uploaded++
        },
      }),
    },
  })
  try {
    global.Image = class {
      naturalWidth = 20
      naturalHeight = 10
      set src(_value) {
        queueMicrotask(() => this.onload())
      }
    }
    global.document = {
      createElement: () => ({
        getContext: () =>
          canvasWorks
            ? {
                drawImage() {},
                getImageData: () => ({
                  data: new Uint8ClampedArray(20 * 10 * 4).fill(255),
                }),
              }
            : null,
      }),
    }
    URL.createObjectURL = () => 'blob:test'
    URL.revokeObjectURL = () => {}
    const { uploadFile2Oss } = load('utils/oss.ts')
    const file = new File(['test'], 'cover.webp', { type: 'image/webp' })
    const result = await uploadFile2Oss(file, 'blog', {
      requireImageMeta: true,
    })
    const meta = new URLSearchParams(result.split('#')[1])
    assert.equal(meta.get('w'), '20')
    assert.equal(meta.get('h'), '10')
    assert.ok(meta.get('th'))
    assert.equal(signed, 1)
    assert.equal(uploaded, 1)
    canvasWorks = false
    assert.equal(
      await uploadFile2Oss(file, 'blog', { requireImageMeta: true }),
      undefined,
    )
    assert.equal(signed, 1)
    assert.equal(uploaded, 1)
  } finally {
    global.Image = saved.Image
    global.document = saved.document
    URL.createObjectURL = saved.create
    URL.revokeObjectURL = saved.revoke
  }
})

test('OSS variants explicitly request WebP quality and preserve query/metadata', () => {
  const url = new URL(getOssImageVariant(original, 824))
  assert.equal(
    url.searchParams.get('x-oss-process'),
    'image/auto-orient,1/resize,w_824,limit_1/format,webp/quality,q_90',
  )
  assert.equal(url.searchParams.get('foo'), 'bar')
  assert.equal(url.hash, new URL(original).hash)
})

test('Next Image generates responsive OSS candidates without invoking its optimizer', () => {
  const { props } = req('next/image').getImageProps({
    src: original,
    alt: '',
    fill: true,
    sizes: '100vw',
    loader: ossImageLoader,
  })
  const widths = props.srcSet
    .split(', ')
    .map((candidate) => Number(candidate.match(/ (\d+)w$/)[1]))
  assert.ok(widths.length > 2)
  assert.ok(widths.some((w) => w >= 750 && w <= 828))
  assert.equal(props.sizes, '100vw')
  assert.ok(!props.srcSet.includes('/_next/image'))
  assert.ok(
    props.srcSet
      .split(', ')
      .every(
        (candidate) =>
          Number(
            new URL(candidate.split(' ')[0]).searchParams
              .get('x-oss-process')
              .match(/w_(\d+)/)[1],
          ) <= 2500,
      ),
  )
})

test('small originals retain their own width; unknown dimensions use bounded candidates', () => {
  const small = original.replace('w=2500', 'w=300')
  assert.ok(ossImageLoader({ src: small, width: 1920 }).includes('w_300'))
  assert.ok(
    ossImageLoader({ src: original.split('#')[0], width: 3840 }).includes(
      'w_3840',
    ),
  )
})

for (const url of [
  'https://example.com/photo.png',
  '/photo.png',
  'data:image/png;base64,abc',
  'https://ltd-hong97-imgs.oss-cn-shanghai.aliyuncs.com/blog/animated.gif',
  'https://ltd-hong97-imgs.oss-cn-shanghai.aliyuncs.com/blog/vector.svg',
  `${original.split('#')[0]}&Signature=test`,
  `${original.split('#')[0]}&x-oss-signature=test`,
  `${original.split('#')[0]}&x-oss-process=image/resize,w_100`,
]) {
  test(`external/signed/styled image is left intact: ${url}`, () => {
    assert.equal(getOssImageVariant(url, 180), url)
    assert.equal(ossImageLoader({ src: url, width: 180 }), url)
  })
}

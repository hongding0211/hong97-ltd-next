import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

  if (url.pathname === '/sso/login' && url.locale === 'en') {
    const headers = {
      'Cache-Control': 'private, no-store',
      Vary: 'Accept-Language, Cookie',
    }
    const savedLocale = request.cookies.get('NEXT_LOCALE')?.value
    if (
      savedLocale === 'cn' ||
      (savedLocale !== 'en' &&
        prefersChinese(request.headers.get('accept-language')))
    ) {
      url.locale = 'cn'
      return NextResponse.redirect(url, { headers })
    }
    return NextResponse.next({ headers })
  }

  if (url.pathname === '/') {
    url.pathname = '/about'
    return NextResponse.redirect(url)
  }

  if (url.pathname === '/2024') {
    url.pathname = '/blog/markdowns/2024-summary'
    url.search = '?key=2024-summary'
    return NextResponse.redirect(url)
  }

  // 处理短链重定向
  // 匹配 /s/xxxxxx 格式的路径
  const shortLinkMatch = url.pathname.match(/^\/s\/([a-z]{6})$/)
  if (shortLinkMatch) {
    const shortCode = shortLinkMatch[1]
    return handleShortLinkRedirect(shortCode, request)
  }
}

function prefersChinese(acceptLanguage: string | null): boolean {
  let bestLanguage = 'en'
  let bestQuality = 0

  for (const preference of acceptLanguage?.split(',') ?? []) {
    const [tag, weight] = preference.trim().toLowerCase().split(';')
    const language = tag.trim().split('-')[0]
    if (language !== 'en' && language !== 'zh' && language !== 'cn') {
      continue
    }

    const quality =
      weight === undefined ? 1 : Number(weight.trim().replace(/^q\s*=\s*/, ''))
    if (quality > bestQuality && quality <= 1) {
      bestLanguage = language
      bestQuality = quality
    }
  }

  return bestLanguage !== 'en'
}

async function handleShortLinkRedirect(
  shortCode: string,
  request: NextRequest,
) {
  try {
    // 调用后端API获取重定向URL
    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3500'
    const response = await fetch(`${apiUrl}/shortlink/redirect/${shortCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      // 如果API调用失败，重定向到404页面
      return NextResponse.redirect(new URL('/404', request.url))
    }

    const data = await response.json()
    const redirectUrl = data?.data?.url

    // 验证URL是否有效
    if (!redirectUrl || !isValidUrl(redirectUrl)) {
      return NextResponse.redirect(new URL('/404', request.url))
    }

    // 执行重定向
    return NextResponse.redirect(redirectUrl)
  } catch (error) {
    console.error('Short link redirect error:', error)
    // 出错时重定向到404页面
    return NextResponse.redirect(new URL('/404', request.url))
  }
}

function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()

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

async function handleShortLinkRedirect(
  shortCode: string,
  request: NextRequest,
) {
  try {
    // 调用后端API获取重定向URL
    const apiUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001'
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

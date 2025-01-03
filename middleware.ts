import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
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
}

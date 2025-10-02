export const SHORTLINK_PATHS = {
  PostShortLinkCreate: '/shortlink',
  GetShortLinkList: '/shortlink',
  GetShortLinkDetail: '/shortlink/:id',
  PutShortLinkUpdate: '/shortlink/:id',
  DeleteShortLink: '/shortlink/:id',
  GetShortLinkRedirect: '/shortlink/redirect/:shortCode',
} as const

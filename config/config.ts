export type IMenuItem = {
  key: string
  path: string
  externalLink?: boolean
}

export type IFooterItem = {
  key: string
  title: string
  path: string
}

export const menuConfig: IMenuItem[] = [
  {
    key: 'doc',
    path: 'https://docs.hong97.ltd',
    externalLink: true,
  },
  {
    key: 'projects',
    path: '/projects',
  },
  {
    key: 'about',
    path: '/about',
  },
]

export const footerConfig: IFooterItem[] = [
  {
    key: 'walkingCalc',
    title: 'Walking Calculator',
    path: 'https://github.com/hongding0211/walkingcalc',
  },
  {
    key: 'sso',
    title: 'Single Sign On',
    path: 'https://hong97.ltd/sso/login',
  },
  {
    key: 'wishlist',
    title: 'Wishlist (Working in Progress)',
    path: 'https://github.com/hongding0211/wishlist',
  },
]

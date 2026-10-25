import { useEffect, useState } from 'react'
import nativeTranslations from './native-translations.json'

export type WalkcalcLanguage = 'zh' | 'en'

const extraTranslations: Record<string, string> = {
  余额: 'Balances',
  账号: 'Account',
  退出登录: 'Log out',
  群组名称: 'Group name',
  默认货币: 'Default currency',
  货币: 'Currency',
  金额: 'Amount',
  备注: 'Note',
  记录详情: 'Record details',
  结算: 'Settlement',
  其他: 'Other',
  姓名: 'Name',
  搜索用户名: 'Search users',
  创建者: 'Owner',
  暂无记录: 'No records yet',
  我的支出: 'My expenses',
  '正在搜索记录...': 'Searching records...',
  网络错误: 'Network error',
  登录以继续: 'Sign in to continue',
  '使用 hong97.ltd 继续': 'Continue with hong97.ltd',
  返回群组: 'Back to groups',
  添加群组: 'Add group',
  记录操作: 'Record actions',
  上一种货币: 'Previous currency',
  下一种货币: 'Next currency',
  重试: 'Retry',
  编辑: 'Edit',
  删除: 'Delete',
  邀请: 'Invite',
  无结果: 'No results',
  我: 'Me',
  操作: 'Actions',
  收款人: 'Recipient',
  添加结算: 'Add settlement',
  登出失败: 'Could not log out',
  '删除这条记录？': 'Delete this record?',
  前往已创建的群组: 'Open the created group',
  '当前货币已结清。': 'This currency is settled.',
  还没有支出: 'No expenses yet',
  邀请已有用户: 'Invite an existing user',
  相关记录: 'Related records',
  '与 %@ 结清': 'Settle with %@',
  '%@ 笔': '%@ records',
  '移除 %@？': 'Remove %@?',
  '结清 %@ 的 %@ 笔转账？': 'Settle %@ with %@ transfers?',
  '群组已创建，添加初始成员时出错：':
    'The group was created, but adding initial members failed:',
  '请先结清群组余额，再归档群组。':
    'Settle all group balances before archiving.',
  '请输入有效金额，最多两位小数。':
    'Enter a valid amount with up to two decimal places.',
  '请选择付款人和分摊成员。': 'Select a payer and members to split with.',
  '请选择不同的付款人与收款人。': 'Select different payers and recipients.',
  '请选择有效日期和时间。': 'Select a valid date and time.',
  '删除群组？如果存在未结清账单，删除前会被自动结清并清零。':
    'Delete this group? Any outstanding balances will be settled and cleared.',
  '归档群组？只有余额全部为 0 的群组才能归档。':
    'Archive this group? All balances must be zero.',
  关闭: 'Close',
  '登录已过期，请重新登录。': 'Your session expired. Please sign in again.',
  '请求失败，请稍后重试。': 'Request failed. Please try again later.',
  '第 %@ 种货币，共 %@ 种': 'Currency %@ of %@',
}

export function systemWalkcalcLanguage(): WalkcalcLanguage {
  if (typeof navigator === 'undefined') return 'zh'
  const primary = navigator.languages?.[0] || navigator.language || 'en'
  return primary.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function translateWalkcalc(
  text: string,
  language: WalkcalcLanguage = systemWalkcalcLanguage(),
  ...values: Array<string | number>
): string {
  let result =
    language === 'en'
      ? extraTranslations[text] ||
        (nativeTranslations as Record<string, string>)[text] ||
        text
      : text
  for (const value of values) result = result.replace('%@', String(value))
  return result
}

export function useWalkcalcI18n() {
  const [language, setLanguage] = useState<WalkcalcLanguage>('zh')
  useEffect(() => {
    const update = () => setLanguage(systemWalkcalcLanguage())
    update()
    window.addEventListener('languagechange', update)
    return () => window.removeEventListener('languagechange', update)
  }, [])
  return {
    language,
    t: (text: string, ...values: Array<string | number>) =>
      translateWalkcalc(text, language, ...values),
  }
}

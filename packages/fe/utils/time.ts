import dayjs from 'dayjs'
import { i18n } from 'next-i18next'

const TIME_FORMAT_STR = {
  cn: {
    date: 'YYYY/M/D',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    datetimeShort: 'YYYY/M/D HH:mm',
  },
  en: {
    date: 'MMM D, YYYY',
    datetime: 'MM/DD/YYYY HH:mm:ss',
    datetimeShort: 'MMM D, YYYY HH:mm',
  },
}

const TIME_DYNAMIC_FORMAT_STR = {
  cn: {
    justNow: '刚刚',
    minuteAgo: '分钟前',
    yesterday: '昨天',
    monthDayTime: 'MM-DD HH:mm',
    full: 'YYYY-MM-DD HH:mm',
  },
  en: {
    justNow: 'Just now',
    minuteAgo: ' minutes ago',
    yesterday: 'Yesterday',
    monthDayTime: 'MM/DD HH:mm',
    full: 'MM/DD/YYYY HH:mm',
  },
}

type FormatType = 'date' | 'datetime' | 'datetimeShort' | 'time'

class Time {
  private getLocale() {
    return i18n.language ?? 'en'
  }

  format(date: number | Date, type: FormatType = 'date') {
    return dayjs(date).format(TIME_FORMAT_STR[this.getLocale()][type])
  }

  formatDynamic(date: number | Date) {
    const d = dayjs(date)
    const now = dayjs()
    if (now.diff(d, 'minute') < 1) {
      return TIME_DYNAMIC_FORMAT_STR[this.getLocale()].justNow
    }
    if (now.diff(d, 'hour') < 1) {
      return `${now.diff(d, 'minute')}${
        TIME_DYNAMIC_FORMAT_STR[this.getLocale()].minuteAgo
      }`
    }
    // current day
    if (d.isSame(now, 'day')) {
      return d.format('HH:mm')
    }
    // yesterday
    if (d.isSame(now.subtract(1, 'day'), 'day')) {
      return `${
        TIME_DYNAMIC_FORMAT_STR[this.getLocale()].yesterday
      }, ${d.format('HH:mm')}`
    }
    // same year
    if (d.isSame(now, 'year')) {
      return d.format(TIME_DYNAMIC_FORMAT_STR[this.getLocale()].monthDayTime)
    }
    // different year, full date time
    return d.format(TIME_DYNAMIC_FORMAT_STR[this.getLocale()].full)
  }

  formatDateGroupTitle(date: number | Date) {
    const d = dayjs(date)
    const now = dayjs()

    // same year - only show month and day
    if (d.isSame(now, 'year')) {
      return this.getLocale() === 'cn' ? d.format('M月D日') : d.format('MMM D')
    }

    // different year - show full date
    return this.getLocale() === 'cn'
      ? d.format('YYYY年M月D日')
      : d.format('MMM D, YYYY')
  }
}

export const time = new Time()

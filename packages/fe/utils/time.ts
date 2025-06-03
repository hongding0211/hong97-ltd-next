import dayjs from 'dayjs'

const TIME_FORMAT_STR = {
  cn: {
    date: 'YYYY/M/D',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    datetimeShort: 'YYYY/M/D H:m',
  },
  en: {
    date: 'MMM D, YYYY',
    datetime: 'MM/DD/YYYY HH:mm:ss',
    datetimeShort: 'MMM D, YYYY H:m',
  },
}

const TIME_DYNAMIC_FORMAT_STR = {
  cn: {
    yesterday: '昨天',
    monthDayTime: 'MM-DD HH:mm',
    full: 'YYYY-MM-DD HH:mm',
  },
  en: {
    yesterday: 'Yesterday',
    monthDayTime: 'MM/DD HH:mm',
    full: 'MM/DD/YYYY HH:mm',
  },
}

type FormatType = 'date' | 'datetime' | 'datetimeShort' | 'time'

class Time {
  private locale: string

  constructor() {
    this.locale = 'cn'
  }

  setLocale(locale: string) {
    if (!locale) {
      return
    }
    this.locale = locale
  }

  format(date: number | Date, type: FormatType = 'date') {
    return dayjs(date).format(TIME_FORMAT_STR[this.locale][type])
  }

  formatDynamic(date: number | Date) {
    const d = dayjs(date)
    const now = dayjs()
    // current day
    if (d.isSame(now, 'day')) {
      return d.format('HH:mm')
    }
    // yesterday
    if (d.isSame(now.subtract(1, 'day'), 'day')) {
      return `${TIME_DYNAMIC_FORMAT_STR[this.locale].yesterday}, ${d.format(
        'HH:mm',
      )}`
    }
    // same year
    if (d.isSame(now, 'year')) {
      return d.format(TIME_DYNAMIC_FORMAT_STR[this.locale].monthDayTime)
    }
    // different year, full date time
    return d.format(TIME_DYNAMIC_FORMAT_STR[this.locale].full)
  }
}

export const time = new Time()

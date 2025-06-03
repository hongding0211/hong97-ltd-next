import dayjs from 'dayjs'

const TIME_FORMAT_STR = {
  cn: {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
    datetimeShort: 'YYYY/MM/DD HH:mm',
  },
  en: {
    date: 'MM/DD/YYYY',
    datetime: 'MM/DD/YYYY HH:mm:ss',
    datetimeShort: 'MM/DD/YYYY HH:mm',
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
  private local: string

  constructor() {
    this.local = 'cn'
  }

  setLocale(local: string) {
    this.local = local
  }

  format(date: number | Date, type: FormatType = 'date') {
    return dayjs(date).format(TIME_FORMAT_STR[this.local][type])
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
      return `${TIME_DYNAMIC_FORMAT_STR[this.local].yesterday}, ${d.format(
        'HH:mm',
      )}`
    }
    // same year
    if (d.isSame(now, 'year')) {
      return d.format(TIME_DYNAMIC_FORMAT_STR[this.local].monthDayTime)
    }
    // different year, full date time
    return d.format(TIME_DYNAMIC_FORMAT_STR[this.local].full)
  }
}

export const time = new Time()

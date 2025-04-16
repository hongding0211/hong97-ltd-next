import dayjs from 'dayjs'

const TIME_FORMAT_STR = {
  cn: {
    date: 'YYYY-MM-DD',
    datetime: 'YYYY-MM-DD HH:mm:ss',
  },
  en: {
    date: 'MM/DD/YYYY',
    datetime: 'MM/DD/YYYY HH:mm:ss',
  },
}

type FormatType = 'date' | 'datetime' | 'time'

class Time {
  private local: string

  constructor() {
    this.local = 'cn'
  }

  setLocal(local: string) {
    this.local = local
  }

  format(date: number | Date, type: FormatType = 'date') {
    return dayjs(date).format(TIME_FORMAT_STR[this.local][type])
  }
}

export const time = new Time()

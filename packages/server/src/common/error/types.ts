export interface IStructureResponse<T = any> {
  isSuccess: boolean
  data?: T
  msg?: string
  errCode?: number
}

export interface IStructureErrorResponse {
  isSuccess: false
  msg: string
  errCode?: number
}

export interface IStructureSuccessResponse<T> {
  isSuccess: true
  data: T
}

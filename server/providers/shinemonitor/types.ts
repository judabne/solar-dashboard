export interface ShineMonitorAuthResponse {
  err: number
  desc: string
  dat?: {
    secret: string
    token: string
    expire: number
    role: number
  }
}

export interface ShineMonitorDevice {
  pn: string
  devcode: string | number
  devaddr: string | number
  sn: string
  alias?: string
}

export interface ShineMonitorStoredSession {
  username: string
  passwordEnc: string
  secret: string
  token: string
  tokenExpiresAt: string
  device: ShineMonitorDevice
}

export interface ShineMonitorDeviceRow {
  pn?: string
  devcode?: string | number
  devaddr?: string | number
  sn?: string
  alias?: string
  status?: number
  devtype?: number
}

export interface ShineMonitorDevicesResponse {
  err: number
  desc: string
  dat?: {
    total: number
    page: number
    pagesize: number
    device: ShineMonitorDeviceRow[]
  }
}

export interface ShineMonitorPlantsResponse {
  err: number
  desc: string
  dat?: {
    total: number
    page: number
    pagesize: number
    plant: Array<{ pid?: number | string, plantid?: number | string, name?: string }>
  }
}

export interface ShineMonitorCollectorsResponse {
  err: number
  desc: string
  dat?: {
    total: number
    page: number
    pagesize: number
    collector: Array<{ pn?: string, pid?: number | string }>
  }
}

export interface ShineMonitorCollectorDevicesResponse {
  err: number
  desc: string
  dat?: {
    pn?: string
    dev: ShineMonitorDeviceRow[]
  }
}

export interface ShineMonitorBusinessRequestOptions {
  useAppParams?: boolean
  baseUrl?: string
}

export interface ShineMonitorDataTitle {
  title: string
  unit?: string
}

export interface ShineMonitorDataRow {
  realtime?: boolean
  field?: string[]
  filed?: string[]
}

export interface ShineMonitorDataResponse {
  err: number
  desc: string
  dat?: {
    total?: number
    page?: number
    pagesize?: number
    title: ShineMonitorDataTitle[]
    row: ShineMonitorDataRow[]
  }
}

export interface REXUIDefinition {
  title:string,
  identifier:string,
  depends_on:string[]
  load_dynamic?:boolean
}

export interface REXConfiguration {
  ui:REXUIDefinition[],
  configuration_url:string,
  [key: string]: any // eslint-disable-line @typescript-eslint/no-explicit-any
}

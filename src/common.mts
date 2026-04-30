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

export function sha256(cleartext:string):Promise<string> {
  return new Promise<string>((resolve) => {
    const msgUint8 = new TextEncoder().encode(cleartext); // encode as (utf-8) Uint8Array

    crypto.subtle.digest('SHA-256', msgUint8).then((hashBuffer) => {
      const hashHex = new Uint8Array(hashBuffer).toHex()

      resolve(hashHex)
    })
  })
}
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

export function hash(cleartext:string, algorithm: string|undefined):Promise<string> {
  if (algorithm === undefined) {
    algorithm = 'SHA-256'
  }

  return new Promise<string>((resolve) => {
    const msgUint8 = new TextEncoder().encode(cleartext); // encode as (utf-8) Uint8Array

    crypto.subtle.digest(algorithm, msgUint8).then((hashBuffer) => {
      const hexBytes = new Uint8Array(hashBuffer)

      const hashHex = Array.from(hexBytes, (byte) => 
        byte.toString(16).padStart(2, '0')
      ).join('');      

      resolve(hashHex)
    })
  })
}

export function sha256(cleartext:string):Promise<string> {
  return hash(cleartext, 'SHA-256')
}

export function sha512(cleartext:string):Promise<string> {
  return hash(cleartext, 'SHA-512')
}
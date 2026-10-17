import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const raw = useRuntimeConfig().credentialEncryptionKey
  if (!raw) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Credential encryption is not configured'
    })
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex')
  }
  const buf = Buffer.from(raw, 'base64')
  if (buf.length !== 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (base64 or 64-char hex)'
    })
  }
  return buf
}

export function encryptString(plain: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptString(payload: string): string {
  const key = getEncryptionKey()
  const buf = Buffer.from(payload, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function hashDeviceSecret(deviceId: string, secret: string): string {
  const pepper = useRuntimeConfig().deviceHashSecret || useRuntimeConfig().credentialEncryptionKey || ''
  const salt = createHash('sha256').update(`${pepper}:device:${deviceId}`).digest()
  return scryptSync(secret, salt, 64).toString('hex')
}

export function sha1Hex(input: string): string {
  return createHash('sha1').update(input, 'utf8').digest('hex')
}

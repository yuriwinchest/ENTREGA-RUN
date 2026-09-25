import crypto from 'node:crypto'

const HASH_PREFIX = 'scrypt'

export function hashPassword(password) {
  const salt = crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, salt, 64)
  return `${HASH_PREFIX}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string') return false
  const [algorithm, saltHex, hashHex] = storedHash.split('$')
  if (algorithm !== HASH_PREFIX || !/^[0-9a-f]{32}$/.test(saltHex || '') || !/^[0-9a-f]{128}$/.test(hashHex || '')) return false
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64)
  const expected = Buffer.from(hashHex, 'hex')
  return crypto.timingSafeEqual(actual, expected)
}

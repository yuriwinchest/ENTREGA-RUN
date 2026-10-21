import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// O gate de deploy (dataSnapshot verify-api) confere pela API que eventos e
// entregas sobreviveram, e essas rotas exigem login. Em vez de credencial fixa,
// o servidor gera um token a cada boot no tmpdir do container (fora do volume
// e do backup); o gate roda via docker exec no mesmo container e o lê dali.
export function deployCheckTokenFile(port) {
  return path.join(os.tmpdir(), `entregas-run-deploy-check-${Number(port)}.token`)
}

export function readDeployCheckToken(port) {
  try {
    return fs.readFileSync(deployCheckTokenFile(port), 'utf8').trim()
  } catch {
    return ''
  }
}

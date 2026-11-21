/**
 * Google Cloud Vision SafeSearch for uploaded photos (underscore files aren't
 * deployed as routes).
 *
 * Login is keyless: Vercel gives each production function an OIDC token, and
 * Google (Workload Identity Federation, pool/provider "vercel" in project
 * communio-d2e19) trusts only catholic-app's production environment to act as
 * the vercel-image-check service account. No key or secret is stored anywhere.
 * Preview deployments and local dev have no trusted token, so photos there
 * come back "unchecked".
 */

const PROJECT_NUMBER = '178530452794'
const PROJECT_ID = 'communio-d2e19'
const SERVICE_ACCOUNT = `vercel-image-check@${PROJECT_ID}.iam.gserviceaccount.com`
const AUDIENCE = `//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/vercel/providers/vercel`

const RANK = { UNKNOWN: 0, VERY_UNLIKELY: 1, UNLIKELY: 2, POSSIBLE: 3, LIKELY: 4, VERY_LIKELY: 5 }

/**
 * 'blocked' or 'ok' for a SafeSearch result. Kept deliberately narrow:
 * religious art (crucifixions, martyrs, classical paintings) can score
 * "possible" or "likely" for violence or racy content, so only clear cases
 * are blocked. Members can still report anything that gets through.
 */
export function verdictFor(safe) {
  if (!safe) return 'ok'
  const r = (k) => RANK[safe[k]] ?? 0
  if (r('adult') >= RANK.LIKELY) return 'blocked'
  if (r('violence') >= RANK.VERY_LIKELY) return 'blocked'
  if (r('racy') >= RANK.VERY_LIKELY) return 'blocked'
  return 'ok'
}

let cached = null // { token, expires }

async function googleAccessToken(req) {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token
  const oidc = req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN
  if (!oidc) throw new Error('no Vercel OIDC token')

  const sts = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grantType: 'urn:ietf:params:oauth:grant-type:token-exchange',
      audience: AUDIENCE,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      requestedTokenType: 'urn:ietf:params:oauth:token-type:access_token',
      subjectToken: oidc,
      subjectTokenType: 'urn:ietf:params:oauth:token-type:jwt',
    }),
    signal: AbortSignal.timeout(5000),
  })
  if (!sts.ok) throw new Error(`STS ${sts.status}: ${(await sts.text()).slice(0, 200)}`)
  const { access_token: federated } = await sts.json()

  const imp = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${federated}` },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/cloud-platform'], lifetime: '3600s' }),
      signal: AbortSignal.timeout(5000),
    }
  )
  if (!imp.ok) throw new Error(`impersonate ${imp.status}: ${(await imp.text()).slice(0, 200)}`)
  const { accessToken, expireTime } = await imp.json()
  cached = { token: accessToken, expires: Date.parse(expireTime) || Date.now() + 3_000_000 }
  return accessToken
}

/** SafeSearch annotation for image bytes; throws on any failure. */
export async function safeSearch(req, bytes) {
  const token = await googleAccessToken(req)
  const r = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': PROJECT_ID,
    },
    body: JSON.stringify({
      requests: [{
        image: { content: Buffer.from(bytes).toString('base64') },
        features: [{ type: 'SAFE_SEARCH_DETECTION' }],
      }],
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!r.ok) throw new Error(`Vision ${r.status}: ${(await r.text()).slice(0, 200)}`)
  const out = (await r.json()).responses?.[0]
  if (out?.error) throw new Error(`Vision: ${out.error.message}`)
  return out?.safeSearchAnnotation || null
}

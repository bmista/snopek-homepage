export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';

  if (!cronSecret) {
    return res.status(500).json({ ok: false, error: 'Missing CRON_SECRET env var' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!deployHookUrl) {
    return res.status(500).json({ ok: false, error: 'Missing VERCEL_DEPLOY_HOOK_URL env var' });
  }

  try {
    const hookRes = await fetch(deployHookUrl, { method: 'POST' });
    const text = await hookRes.text();
    if (!hookRes.ok) {
      return res.status(502).json({
        ok: false,
        error: `Deploy hook failed with ${hookRes.status}`,
        details: text.slice(0, 500),
      });
    }
    return res.status(200).json({
      ok: true,
      message: 'Deploy triggered',
      hookStatus: hookRes.status,
      hookResponse: text.slice(0, 500),
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || 'Unknown error while calling deploy hook',
    });
  }
}

import { Router } from 'express';
import { scanDomain } from '../../../email-fixer-code/src/scanner.js';
import type { ScanResult } from '../../../email-fixer-code/src/scanner.js';

const router = Router();

// Accepts: empresa.com.br | www.empresa.com.br | https://empresa.com.br | user@empresa.com.br
const DOMAIN_RE = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function sanitize(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')   // strip protocol
    .replace(/^www\./i, '')          // strip www.
    .replace(/\/.*$/, '')            // strip /path
    .replace(/\?.*$/, '')            // strip ?query
    .replace(/^.*@/, '');            // handle user@domain → domain
}

router.post('/', async (req, res) => {
  const { domain: rawDomain } = req.body as { domain?: unknown };

  if (!rawDomain || typeof rawDomain !== 'string') {
    res.status(400).json({ error: 'Domínio não informado.' });
    return;
  }

  const domain = sanitize(rawDomain);

  if (!DOMAIN_RE.test(domain)) {
    res.status(400).json({
      error: 'Formato de domínio inválido. Informe apenas o domínio (ex: empresa.com.br).',
    });
    return;
  }

  let result: ScanResult;

  try {
    result = await Promise.race([
      scanDomain(domain),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), 10_000)
      ),
    ]);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === 'ETIMEOUT') {
      res.status(504).json({ error: 'O diagnóstico demorou mais que o esperado. Tente novamente.' });
      return;
    }
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      res.status(404).json({
        error: `Domínio "${domain}" não encontrado no DNS. Verifique se está escrito corretamente.`,
      });
      return;
    }
    console.error('[scan] Unexpected error:', err);
    res.status(500).json({ error: 'Erro interno ao verificar o domínio. Tente novamente.' });
    return;
  }

  if (!result.domainExists) {
    res.status(404).json({
      error: `Domínio "${domain}" não encontrado no DNS. Verifique se está escrito corretamente.`,
    });
    return;
  }

  res.json(result);
});

export default router;

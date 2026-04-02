export function buildEmailHtml(domain: string, orderId: string): string {
  const reportUrl = `${process.env.APP_URL ?? 'https://emailcorreto.com.br'}/relatorio?order=${orderId}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Seu relatório EmailCorreto está pronto</title>
</head>
<body style="margin:0;padding:0;background:#F6F7F6;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7F6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#FF4D2E;padding:28px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 12px;">
                    <span style="font-family:Georgia,serif;font-weight:700;font-size:18px;color:#ffffff;letter-spacing:-0.5px;">
                      ✉ EmailCorreto
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111311;line-height:1.2;">
                Seu relatório está pronto 🎉
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6B6F6B;line-height:1.6;">
                Identificamos e preparamos as correções para o domínio
                <strong style="color:#111311;">${domain}</strong>.
                Clique no botão abaixo para acessar seus registros DNS corrigidos e as instruções passo a passo.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background:#FF4D2E;border-radius:12px;">
                    <a href="${reportUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.2px;">
                      Acessar meu relatório →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's included -->
              <table cellpadding="0" cellspacing="0" style="width:100%;background:#F6F7F6;border-radius:14px;padding:20px 24px;margin-bottom:32px;">
                <tr><td colspan="2" style="padding-bottom:12px;font-size:13px;font-weight:600;color:#111311;text-transform:uppercase;letter-spacing:0.05em;">O que está incluído</td></tr>
                ${[
                  'Registros SPF, DKIM e DMARC prontos para copiar e colar',
                  'Instruções específicas para o seu registrador de domínio',
                  'Verificação em mais de 50 blacklists',
                  'Reverificações ilimitadas — acesso vitalício',
                ].map(item => `
                <tr>
                  <td style="width:20px;padding:4px 8px 4px 0;font-size:14px;color:#27D07C;">✓</td>
                  <td style="padding:4px 0;font-size:14px;color:#6B6F6B;">${item}</td>
                </tr>`).join('')}
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#6B6F6B;">
                Se tiver qualquer dúvida, basta responder este e-mail ou escrever para
                <a href="mailto:suporte@emailcorreto.com.br" style="color:#FF4D2E;">suporte@emailcorreto.com.br</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #F0F0F0;">
              <p style="margin:0;font-size:12px;color:#9B9F9B;line-height:1.6;">
                © 2026 EmailCorreto · Pedido <code style="background:#F6F7F6;padding:2px 6px;border-radius:4px;">${orderId.slice(0, 8)}</code><br />
                Você recebeu este e-mail porque efetuou uma compra em emailcorreto.com.br.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

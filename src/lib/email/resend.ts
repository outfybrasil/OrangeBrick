import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

export const DEFAULT_FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Orange Brick <onboarding@resend.dev>";

interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

function baseEmailWrapper(content: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Orange Brick</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0d0e12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0d0e12; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #14161d; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1); overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 900; letter-spacing: 1px; color: #ffffff; text-transform: uppercase;">
                      ORANGE<span style="color: #ff5e00;">_</span>BRICK
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 20px; background-color: rgba(255, 94, 0, 0.15); border: 1px solid rgba(255, 94, 0, 0.3); font-size: 11px; font-weight: 700; color: #ff7526; text-transform: uppercase; letter-spacing: 0.5px;">
                      Comunidade Gamer
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 36px 32px 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #0f1015; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #737682; line-height: 18px;">
                Orange Brick — O portal termina. A conversa começa.
              </p>
              <p style="margin: 0; font-size: 11px; color: #52545d;">
                Se você não solicitou este e-mail, pode desconsiderá-lo com segurança.
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

export async function sendVerificationEmail({
  to,
  confirmationUrl,
  userName,
}: {
  to: string;
  confirmationUrl: string;
  userName?: string;
}): Promise<EmailResult> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY não configurada no ambiente.",
    };
  }

  const name = userName ? userName : "Gamer";
  const html = baseEmailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.2;">
      Confirme seu cadastro no Orange Brick
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #b8bac2; line-height: 24px;">
      Olá, <strong style="color: #ffffff;">${name}</strong>! Falta apenas um passo para ativar seu perfil, votar nas matérias, debater com a comunidade e acumular XP.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${confirmationUrl}" target="_blank" style="display: inline-block; background-color: #ff5e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(255, 94, 0, 0.35);">
        CONFIRMAR MEU E-MAIL
      </a>
    </div>
    <p style="margin: 24px 0 8px 0; font-size: 12px; color: #737682; line-height: 18px;">
      Ou copie e cole o link a seguir no seu navegador:
    </p>
    <p style="margin: 0; font-size: 11px; color: #ff7526; word-break: break-all; line-height: 16px;">
      ${confirmationUrl}
    </p>
  `);

  try {
    const data = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject: "Ative sua conta no Orange Brick",
      html,
    });

    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, id: data.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
}: {
  to: string;
  resetUrl: string;
  userName?: string;
}): Promise<EmailResult> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY não configurada no ambiente.",
    };
  }

  const name = userName ? userName : "Gamer";
  const html = baseEmailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.2;">
      Redefinição de Senha
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: #b8bac2; line-height: 24px;">
      Olá, <strong style="color: #ffffff;">${name}</strong>. Recebemos uma solicitação para redefinir a senha da sua conta no Orange Brick.
    </p>
    <div style="margin: 32px 0; text-align: center;">
      <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #ff5e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; letter-spacing: 0.5px; box-shadow: 0 4px 16px rgba(255, 94, 0, 0.35);">
        REDEFINIR MINHA SENHA
      </a>
    </div>
    <p style="margin: 24px 0 8px 0; font-size: 12px; color: #737682; line-height: 18px;">
      Se não foi você quem solicitou, sua conta continua segura e você pode ignorar esta mensagem.
    </p>
  `);

  try {
    const data = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject: "Redefinir senha — Orange Brick",
      html,
    });

    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, id: data.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

export async function sendWelcomeEmail({
  to,
  userName,
}: {
  to: string;
  userName: string;
}): Promise<EmailResult> {
  if (!resend) {
    return {
      success: false,
      error: "RESEND_API_KEY não configurada no ambiente.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://orangebrick.com.br";
  const html = baseEmailWrapper(`
    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.2;">
      Bem-vindo ao Orange Brick, ${userName}! 🎮
    </h1>
    <p style="margin: 0 0 16px 0; font-size: 15px; color: #b8bac2; line-height: 24px;">
      Sua conta está confirmada e pronta para uso. Agora você tem acesso a todos os recursos da comunidade:
    </p>
    <ul style="margin: 0 0 24px 0; padding-left: 20px; color: #b8bac2; font-size: 14px; line-height: 22px;">
      <li>Debata e comente nas notícias do setor de games sem moderação burocrática</li>
      <li>Vote no Radar de Lançamentos e influencie o termômetro de hype</li>
      <li>Salve matérias para ler depois nos seus favoritos</li>
      <li>Construa seu perfil exclusivo no Brickboard</li>
    </ul>
    <div style="margin: 28px 0; text-align: center;">
      <a href="${siteUrl}/brickboard" target="_blank" style="display: inline-block; background-color: #ff5e00; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; letter-spacing: 0.5px;">
        ACESSAR O BRICKBOARD
      </a>
    </div>
  `);

  try {
    const data = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to,
      subject: `Bem-vindo ao Orange Brick, ${userName}!`,
      html,
    });

    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, id: data.data?.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return { success: false, error: msg };
  }
}

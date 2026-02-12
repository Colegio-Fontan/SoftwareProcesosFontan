import nodemailer from 'nodemailer';
import type { User } from '@/types';

// Configuración del transportador de correo
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('⚠️ Configuración SMTP incompleta. Las notificaciones por correo no se enviarán.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: false, // true para 465, false para otros puertos
    auth: {
      user,
      pass,
    },
    tls: {
      ciphers: 'SSLv3',
      rejectUnauthorized: false
    }
  });
};

interface ProcessNotificationData {
  processId: number;
  processType: string;
  processTitle: string;
  processDescription: string;
  createdBy: {
    name: string;
    email: string;
  };
  urgency: string;
  isForwarded?: boolean;
  forwardedBy?: {
    name: string;
    email: string;
  };
}

/**
 * Envía una notificación por correo cuando se asigna un proceso a un usuario
 */
export async function sendProcessAssignmentNotification(
  recipientUser: User,
  processData: ProcessNotificationData
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('📧 Notificación no enviada: Configuración SMTP no disponible');
      return false;
    }

    const emailFrom = process.env.EMAIL_FROM || 'no-reply@colegiofontan.edu.co';
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Sistema de Procesos Fontán';

    const subject = processData.isForwarded
      ? `📬 Proceso Reenviado: ${processData.processTitle}`
      : `📋 Nuevo Proceso Asignado: ${processData.processTitle}`;

    const htmlContent = generateEmailHTML(recipientUser, processData);

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: recipientUser.email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo enviado exitosamente a ${recipientUser.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo:', error);
    return false;
  }
}

/**
 * Genera el contenido HTML del correo electrónico
 */
function generateEmailHTML(
  recipient: User,
  processData: ProcessNotificationData
): string {
  const urgencyColors: Record<string, string> = {
    'bajo': '#10b981',
    'medio': '#f59e0b',
    'alto': '#ef4444',
  };

  const urgencyColor = urgencyColors[processData.urgency.toLowerCase()] || '#6b7280';

  const actionText = processData.isForwarded ? 'reenviado' : 'asignado';
  // const actionBy = processData.isForwarded && processData.forwardedBy
  //   ? processData.forwardedBy.name
  //   : processData.createdBy.name;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación de Proceso</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${processData.isForwarded ? '📬 Proceso Reenviado' : '📋 Nuevo Proceso Asignado'}
              </h1>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Hola <strong>${recipient.name}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Se te ha ${actionText} un nuevo proceso que requiere tu atención.
              </p>
            </td>
          </tr>
          
          <!-- Process Details Card -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #f9fafb; border-left: 4px solid ${urgencyColor}; border-radius: 4px; padding: 20px;">
                
                <!-- Process Title -->
                <h2 style="margin: 0 0 15px; font-size: 20px; color: #111827;">
                  ${processData.processTitle}
                </h2>
                
                <!-- Process Type and Urgency -->
                <div style="margin-bottom: 15px;">
                  <span style="display: inline-block; background-color: #e0e7ff; color: #4338ca; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-right: 8px;">
                    ${processData.processType.toUpperCase()}
                  </span>
                  <span style="display: inline-block; background-color: ${urgencyColor}20; color: ${urgencyColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                    URGENCIA: ${processData.urgency.toUpperCase()}
                  </span>
                </div>
                
                <!-- Description -->
                <div style="margin-bottom: 20px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">
                    Descripción
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                    ${processData.processDescription}
                  </p>
                </div>
                
                <!-- Created By -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">
                    ${processData.isForwarded ? 'Creado originalmente por' : 'Creado por'}
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #374151;">
                    <strong>${processData.createdBy.name}</strong><br>
                    <a href="mailto:${processData.createdBy.email}" style="color: #667eea; text-decoration: none;">
                      ${processData.createdBy.email}
                    </a>
                  </p>
                </div>

                ${processData.isForwarded && processData.forwardedBy ? `
                <!-- Forwarded By -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 15px;">
                  <p style="margin: 0 0 5px; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">
                    Reenviado por
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #374151;">
                    <strong>${processData.forwardedBy.name}</strong><br>
                    <a href="mailto:${processData.forwardedBy.email}" style="color: #667eea; text-decoration: none;">
                      ${processData.forwardedBy.email}
                    </a>
                  </p>
                </div>
                ` : ''}
                
              </div>
            </td>
          </tr>
          
          <!-- Action Button -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/requests/my" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ver Proceso #${processData.processId}
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Este es un correo automático del Sistema de Procesos Fontán.<br>
                Por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envía un correo de bienvenida y confirmación de cuenta
 */
export async function sendConfirmationEmail(
  email: string,
  name: string,
  token: string,
  baseUrl: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    if (!transporter) return false;

    const emailFrom = process.env.EMAIL_FROM || 'no-reply@colegiofontan.edu.co';
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Sistema de Procesos Fontán';
    const confirmationUrl = `${baseUrl}/confirm?token=${token}`;

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: email,
      subject: '🔐 Confirma tu cuenta - Sistema de Procesos Fontán',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h1 style="color: #667eea; font-size: 24px;">¡Bienvenido, ${name}!</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Gracias por registrarte en el Sistema de Procesos Fontán. Para comenzar a usar tu cuenta, por favor confírmala haciendo clic en el botón de abajo:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${confirmationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Confirmar mi cuenta
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:<br>
            <a href="${confirmationUrl}" style="color: #667eea;">${confirmationUrl}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de confirmación enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de confirmación:', error);
    return false;
  }
}

const emailService = {
  sendProcessAssignmentNotification,
  sendConfirmationEmail,
};

export default emailService;

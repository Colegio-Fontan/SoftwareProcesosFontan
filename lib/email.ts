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
 * Envía una notificación por correo cuando se resuelve un proceso
 */
export async function sendProcessResolutionNotification(
  recipientUser: User,
  processData: ProcessNotificationData & { resolutionComment?: string }
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('📧 Notificación no enviada: Configuración SMTP no disponible');
      return false;
    }

    const emailFrom = process.env.EMAIL_FROM || 'no-reply@colegiofontan.edu.co';
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Sistema de Procesos Fontán';

    const subject = `✅ Proceso Finalizado: ${processData.processTitle}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proceso Finalizado</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ✅ Proceso Finalizado
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Hola <strong>${recipientUser.name}</strong>,
              </p>
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Tu solicitud "<strong>${processData.processTitle}</strong>" ha sido marcada como <strong>FINALIZADA</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #f9fafb; border-left: 4px solid #10b981; border-radius: 4px; padding: 20px;">
                <h2 style="margin: 0 0 10px; font-size: 18px; color: #111827;">Comentario de resolución:</h2>
                <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6;">
                  ${processData.resolutionComment || 'El proceso ha sido completado satisfactoriamente.'}
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/requests/${processData.processId}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ver Detalles y Evidencias
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Este es un correo automático del Sistema de Procesos Fontán.
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

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: recipientUser.email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de resolución:', error);
    return false;
  }
}

/**
 * Envía una notificación por correo al creador sobre cambios de estado menores
 */
export async function sendProcessStatusUpdateNotification(
  recipientUser: User,
  processData: ProcessNotificationData & { newStatus: string; statusComment?: string; updatedBy?: { name: string; role?: string }; expectedDate?: string },
  isForwardAction = false
): Promise<boolean> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.log('📧 Notificación no enviada: Configuración SMTP no disponible');
      return false;
    }

    const emailFrom = process.env.EMAIL_FROM || 'no-reply@colegiofontan.edu.co';
    const emailFromName = process.env.EMAIL_FROM_NAME || 'Sistema de Procesos Fontán';

    let subject = `🔄 Actualización en tu proceso: ${processData.processTitle}`;
    let icon = '🔄';
    let gradient = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    let statusDisplay = processData.newStatus.toUpperCase();

    if (processData.newStatus === 'rechazado') {
      subject = `❌ Proceso Rechazado: ${processData.processTitle}`;
      icon = '❌';
      gradient = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    } else if (processData.newStatus === 'aceptado') {
      subject = `👍 Proceso Recibido: ${processData.processTitle}`;
      icon = '👍';
      gradient = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
      statusDisplay = 'RECIBIDO';
    } else if (isForwardAction) {
      subject = `↗️ Proceso Reenviado: ${processData.processTitle}`;
      icon = '↗️';
      gradient = 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)';
      statusDisplay = 'REENVIADO';
    }

    const formatter = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long' });
    const formattedDate = processData.expectedDate ? formatter.format(new Date(processData.expectedDate)) : null;

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Actualización de Proceso</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="background: ${gradient}; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${icon} Actualización de Estado
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 30px 20px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #374151; line-height: 1.5;">
                Hola <strong>${recipientUser.name}</strong>,
              </p>
              <p style="margin: 0 0 10px; font-size: 16px; color: #374151; line-height: 1.5;">
                Tu solicitud "<strong>${processData.processTitle}</strong>" ahora se encuentra en estado <strong>${statusDisplay}</strong>.
              </p>
              ${processData.updatedBy ? `
              <p style="margin: 0 0 20px; font-size: 14px; color: #6b7280; line-height: 1.5;">
                Actualizado por: <strong>${processData.updatedBy.name}</strong> ${processData.updatedBy.role ? `(${processData.updatedBy.role})` : ''}
              </p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px;">
              <div style="background-color: #f9fafb; border-left: 4px solid #9ca3af; border-radius: 4px; padding: 20px;">
                ${formattedDate ? `
                <div style="margin-bottom: 15px;">
                  <h2 style="margin: 0 0 5px; font-size: 16px; color: #111827;">📅 Fecha Estimada de Respuesta:</h2>
                  <p style="margin: 0; font-size: 15px; color: #374151; font-weight: 600;">
                    ${formattedDate}
                  </p>
                </div>
                ` : ''}
                <div>
                  <h2 style="margin: 0 0 10px; font-size: 16px; color: #111827;">Comentario:</h2>
                  <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; font-style: italic;">
                    "${processData.statusComment || 'Sin comentarios adicionales.'}"
                  </p>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/requests/${processData.processId}" 
                 style="display: inline-block; background: ${gradient}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Ver Detalles
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                Este es un correo automático del Sistema de Procesos Fontán.
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

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: recipientUser.email,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de actualización de estado:', error);
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
              <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/requests/${processData.processId}" 
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

/**
 * Envía un correo con el link para restablecer la contraseña
 */
export async function sendPasswordResetEmail(
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
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const mailOptions = {
      from: `"${emailFromName}" <${emailFrom}>`,
      to: email,
      subject: '🔑 Restablecer contraseña - Sistema de Procesos Fontán',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h1 style="color: #667eea; font-size: 24px;">Restablecer contraseña</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Hola <strong>${name}</strong>,
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.5;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Restablecer mi contraseña
            </a>
          </div>
          <p style="color: #6b7280; font-size: 14px;">
            Este enlace es válido por <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este correo.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
            <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            Este es un correo automático, por favor no respondas a este mensaje.
          </p>
        </div>
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Correo de restablecimiento enviado a ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error al enviar correo de restablecimiento:', error);
    return false;
  }
}

const emailService = {
  sendProcessAssignmentNotification,
  sendProcessResolutionNotification,
  sendProcessStatusUpdateNotification,
  sendConfirmationEmail,
  sendPasswordResetEmail,
};

export default emailService;

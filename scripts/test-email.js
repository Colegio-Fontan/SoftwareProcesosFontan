/**
 * Script de prueba para verificar la configuración de correo electrónico
 * 
 * Uso: node scripts/test-email.js
 * 
 * ANTES DE EJECUTAR:
 * 1. Asegúrate de configurar las variables SMTP en .env.local
 * 2. Para Gmail, necesitas una "Contraseña de Aplicación":
 *    https://myaccount.google.com/apppasswords
 */

const nodemailer = require('nodemailer');
require('dotenv').config({ path: '.env.local' });

async function testEmailConfiguration() {
  console.log('🔍 Verificando configuración de correo electrónico...\n');

  // Verificar variables de entorno
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('❌ ERROR: Faltan las siguientes variables de entorno:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPor favor configúralas en el archivo .env.local\n');
    process.exit(1);
  }

  console.log('✅ Variables de entorno configuradas correctamente\n');
  console.log('📧 Configuración:');
  console.log(`   Host: ${process.env.SMTP_HOST}`);
  console.log(`   Puerto: ${process.env.SMTP_PORT}`);
  console.log(`   Usuario: ${process.env.SMTP_USER}`);
  console.log(`   Desde: ${process.env.EMAIL_FROM}\n`);

  // Crear transportador
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('🔌 Verificando conexión con servidor SMTP...');
    await transporter.verify();
    console.log('✅ Conexión exitosa con el servidor SMTP!\n');

    // Enviar correo de prueba
    console.log('📨 Enviando correo de prueba...');
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Sistema de Procesos Fontán'}" <${process.env.EMAIL_FROM}>`,
      to: process.env.SMTP_USER, // Enviamos al mismo usuario como prueba
      subject: '✅ Prueba de Configuración de Correo - Sistema de Procesos Fontán',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h1 style="color: #667eea; margin-top: 0;">🎉 ¡Configuración Exitosa!</h1>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Este es un correo de prueba del <strong>Sistema de Procesos Fontán</strong>.
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              Si estás viendo este mensaje, significa que la configuración de correo electrónico 
              está funcionando correctamente y el sistema puede enviar notificaciones.
            </p>
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; font-size: 14px; color: #0c4a6e;">
                <strong>✅ Servidor SMTP:</strong> ${process.env.SMTP_HOST}<br>
                <strong>✅ Puerto:</strong> ${process.env.SMTP_PORT}<br>
                <strong>✅ Estado:</strong> Conectado
              </p>
            </div>
            <p style="font-size: 14px; color: #666; margin-bottom: 0;">
              Los usuarios ahora recibirán notificaciones automáticas cuando se les asignen procesos.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ ¡Correo de prueba enviado exitosamente!');
    console.log(`📬 ID del mensaje: ${info.messageId}\n`);
    console.log('🎉 ¡La configuración de correo está lista para usarse!\n');

  } catch (error) {
    console.error('\n❌ ERROR al verificar/enviar correo:');
    console.error(error.message);

    if (error.message.includes('Invalid login')) {
      console.error('\n⚠️  SOLUCIÓN:');
      console.error('   - Si usas Gmail/Google Workspace, necesitas una "Contraseña de Aplicación"');
      console.error('   - Si usas Outlook/Office 365, asegúrate de que SMTP AUTH esté habilitado');
      console.error('   - Genera una contraseña en la configuración de seguridad de tu cuenta');
      console.error('   - NO uses tu contraseña normal si tienes 2FA activado\n');
    }

    process.exit(1);
  }
}

testEmailConfiguration();

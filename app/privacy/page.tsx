'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/20 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold mb-2">Política de Privacidad</h1>
          <p className="text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">1. Introducción</h2>
              <p className="text-foreground/90 leading-relaxed">
                En FinTec, respetamos tu privacidad y nos comprometemos a proteger tus datos personales y financieros. 
                Esta Política de Privacidad explica cómo recopilamos, utilizamos, almacenamos y protegemos tu información 
                cuando utilizas nuestra plataforma de gestión de finanzas personales.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">2. Información que Recopilamos</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">2.1 Información de Cuenta</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Nombre y dirección de correo electrónico (durante el registro)</li>
                <li>Credenciales de autenticación (contraseñas encriptadas)</li>
                <li>Información de perfil (opcional)</li>
                <li>Preferencias de usuario y configuraciones</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">2.2 Información Financiera</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Datos de cuentas bancarias y financieras (nombre, tipo, saldo)</li>
                <li>Transacciones financieras (monto, fecha, descripción, categoría)</li>
                <li>Presupuestos y metas de ahorro</li>
                <li>Información de categorías y etiquetas personalizadas</li>
                <li>Historial de conversiones de moneda</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">2.3 Información Técnica</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Dirección IP y datos de ubicación aproximada</li>
                <li>Información del dispositivo y navegador</li>
                <li>Registros de acceso y actividad</li>
                <li>Cookies y tecnologías de seguimiento similares</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">2.4 Información de Pago</h3>
              <p className="text-foreground/90 leading-relaxed">
                Para procesar suscripciones, trabajamos con Paddle, nuestro proveedor de pagos. Paddle recopila y procesa 
                información de pago (números de tarjeta, dirección de facturación) directamente. FinTec no almacena ni 
                tiene acceso a información completa de tarjetas de crédito. Solo recibimos información sobre el estado de 
                la suscripción y los identificadores necesarios para gestionar tu cuenta.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">3. Cómo Utilizamos tu Información</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Utilizamos la información recopilada para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li><strong>Proporcionar y mejorar el servicio:</strong> Procesar tus transacciones, generar reportes y proporcionar funcionalidades de IA</li>
                <li><strong>Gestionar tu cuenta:</strong> Autenticación, recuperación de contraseña y soporte al cliente</li>
                <li><strong>Procesar pagos:</strong> Gestionar suscripciones y facturación a través de Paddle</li>
                <li><strong>Comunicarnos contigo:</strong> Enviar notificaciones importantes, actualizaciones del servicio y respuestas a consultas</li>
                <li><strong>Seguridad:</strong> Detectar y prevenir fraudes, abusos y actividades no autorizadas</li>
                <li><strong>Cumplimiento legal:</strong> Cumplir con obligaciones legales y responder a solicitudes legales</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">4. Almacenamiento de Datos</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Tus datos se almacenan utilizando los siguientes servicios:
              </p>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">4.1 Supabase</h3>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Utilizamos Supabase como plataforma de backend para almacenar y gestionar tus datos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Todos los datos se almacenan en servidores seguros con encriptación en tránsito y en reposo</li>
                <li>Implementamos políticas de acceso basadas en roles (RLS) para garantizar que solo tú puedas acceder a tus datos</li>
                <li>Los backups se realizan regularmente para proteger contra pérdida de datos</li>
                <li>Supabase cumple con estándares de seguridad como SOC 2 Type II</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">4.2 Retención de Datos</h3>
              <p className="text-foreground/90 leading-relaxed">
                Conservamos tus datos personales mientras tu cuenta esté activa y durante un período razonable después 
                de que la cierres, según los requisitos legales. Los datos financieros históricos se mantienen según tu 
                plan de suscripción (6 meses para plan gratuito, ilimitado para planes pagos).
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">5. Compartir Información</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                No vendemos ni alquilamos tu información personal. Solo compartimos datos en las siguientes circunstancias:
              </p>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">5.1 Proveedores de Servicios</h3>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li><strong>Paddle:</strong> Para procesar pagos y gestionar suscripciones</li>
                <li><strong>Supabase:</strong> Para almacenamiento y gestión de base de datos</li>
                <li><strong>Proveedores de hosting:</strong> Para operar y mantener la infraestructura del servicio</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                Todos estos proveedores están contractualmente obligados a proteger tu información y utilizarla únicamente 
                para los fines especificados.
              </p>

              <h3 className="text-xl font-semibold mt-4 mb-3">5.2 Requisitos Legales</h3>
              <p className="text-foreground/90 leading-relaxed">
                Podemos divulgar información si es requerido por ley, orden judicial o proceso legal, o para proteger 
                nuestros derechos, propiedad o seguridad, o la de nuestros usuarios.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">6. Seguridad de los Datos</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Encriptación de datos en tránsito (HTTPS/TLS) y en reposo</li>
                <li>Autenticación de dos factores disponible para cuentas</li>
                <li>Controles de acceso estrictos y políticas de seguridad basadas en roles</li>
                <li>Monitoreo continuo para detectar y prevenir accesos no autorizados</li>
                <li>Auditorías regulares de seguridad</li>
                <li>Capacitación del equipo en prácticas de seguridad de datos</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro. 
                Aunque nos esforzamos por proteger tus datos, no podemos garantizar seguridad absoluta.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">7. Tus Derechos</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Dependiendo de tu ubicación, tienes los siguientes derechos sobre tus datos personales:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li><strong>Acceso:</strong> Solicitar una copia de tus datos personales</li>
                <li><strong>Rectificación:</strong> Corregir datos inexactos o incompletos</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de tus datos ("derecho al olvido")</li>
                <li><strong>Portabilidad:</strong> Recibir tus datos en un formato estructurado y portátil</li>
                <li><strong>Oposición:</strong> Oponerte al procesamiento de tus datos en ciertas circunstancias</li>
                <li><strong>Limitación:</strong> Solicitar la restricción del procesamiento de tus datos</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                Para ejercer estos derechos, contacta a{' '}
                <a href="mailto:privacy@fintec.com" className="text-primary hover:underline">
                  privacy@fintec.com
                </a>
                . Responderemos a tu solicitud dentro de los plazos legales aplicables.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">8. Cookies y Tecnologías de Seguimiento</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Utilizamos cookies y tecnologías similares para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Mantener tu sesión activa y autenticada</li>
                <li>Recordar tus preferencias y configuraciones</li>
                <li>Analizar el uso del servicio para mejorar la experiencia</li>
                <li>Garantizar la seguridad y prevenir fraudes</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                Puedes gestionar las preferencias de cookies a través de la configuración de tu navegador. Sin embargo, 
                deshabilitar ciertas cookies puede afectar la funcionalidad del servicio.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">9. Transferencias Internacionales</h2>
              <p className="text-foreground/90 leading-relaxed">
                Tus datos pueden ser transferidos y almacenados en servidores ubicados fuera de tu país de residencia. 
                Aseguraremos que cualquier transferencia internacional de datos se realice con las salvaguardas adecuadas 
                y de acuerdo con las leyes de protección de datos aplicables.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">10. Privacidad de Menores</h2>
              <p className="text-foreground/90 leading-relaxed">
                FinTec no está dirigido a menores de 18 años. No recopilamos intencionalmente información personal de 
                menores. Si descubrimos que hemos recopilado información de un menor, la eliminaremos inmediatamente.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">11. Cambios a esta Política</h2>
              <p className="text-foreground/90 leading-relaxed">
                Podemos actualizar esta Política de Privacidad periódicamente. Te notificaremos sobre cambios materiales 
                publicando la nueva política en esta página y actualizando la fecha de "Última actualización". Te 
                recomendamos revisar esta política regularmente para mantenerte informado sobre cómo protegemos tu información.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">12. Consentimiento</h2>
              <p className="text-foreground/90 leading-relaxed">
                Al utilizar FinTec, consientes la recopilación, uso y divulgación de tu información según se describe en 
                esta Política de Privacidad. Si no estás de acuerdo con esta política, no debes utilizar nuestro servicio.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">13. Contacto</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Si tienes preguntas, preocupaciones o deseas ejercer tus derechos relacionados con esta Política de 
                Privacidad, puedes contactarnos:
              </p>
              <ul className="list-none space-y-2 text-foreground/90">
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@fintec.com" className="text-primary hover:underline">
                    privacy@fintec.com
                  </a>
                </li>
                <li>
                  <strong>Soporte:</strong>{' '}
                  <a href="mailto:support@fintec.com" className="text-primary hover:underline">
                    support@fintec.com
                  </a>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


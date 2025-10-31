'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
          <h1 className="text-4xl font-bold mb-2">Términos de Servicio</h1>
          <p className="text-muted-foreground mb-8">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
              <p className="text-foreground/90 leading-relaxed">
                Al acceder y utilizar FinTec, una plataforma de gestión de finanzas personales, aceptas cumplir con estos 
                Términos de Servicio y todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos 
                términos, no debes utilizar nuestro servicio.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">2. Descripción del Servicio</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                FinTec es una plataforma digital que permite a los usuarios:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Gestionar múltiples cuentas bancarias y financieras</li>
                <li>Registrar y categorizar transacciones financieras</li>
                <li>Crear presupuestos y establecer metas de ahorro</li>
                <li>Generar reportes y análisis de sus finanzas personales</li>
                <li>Utilizar herramientas de inteligencia artificial para análisis financiero (en planes premium)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">3. Registro y Cuenta de Usuario</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Para utilizar FinTec, debes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Proporcionar información precisa y actualizada durante el registro</li>
                <li>Mantener la confidencialidad de tu contraseña y credenciales de acceso</li>
                <li>Ser responsable de todas las actividades que ocurran bajo tu cuenta</li>
                <li>Notificarnos inmediatamente sobre cualquier uso no autorizado de tu cuenta</li>
                <li>Tener al menos 18 años de edad o contar con la autorización de un padre o tutor</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">4. Planes de Suscripción y Facturación</h2>
              
              <h3 className="text-xl font-semibold mt-4 mb-3">4.1 Planes Disponibles</h3>
              <p className="text-foreground/90 leading-relaxed mb-3">
                FinTec ofrece los siguientes planes:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li><strong>Plan Gratis:</strong> Incluye funcionalidades básicas con limitaciones de uso</li>
                <li><strong>Plan Full:</strong> Acceso completo a todas las funcionalidades estándar</li>
                <li><strong>Plan Premium IA:</strong> Incluye todas las funcionalidades del Plan Full más herramientas de inteligencia artificial avanzadas</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">4.2 Facturación</h3>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Las suscripciones se facturan mediante Paddle, nuestro proveedor de procesamiento de pagos:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Los pagos se procesan automáticamente en intervalos mensuales o anuales según tu plan</li>
                <li>Todos los precios incluyen los impuestos aplicables según tu jurisdicción</li>
                <li>Paddle actúa como Merchant of Record y gestiona todos los aspectos de facturación e impuestos</li>
                <li>No ofrecemos reembolsos para períodos parciales no utilizados</li>
              </ul>

              <h3 className="text-xl font-semibold mt-4 mb-3">4.3 Renovación y Cancelación</h3>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Las suscripciones se renuevan automáticamente al finalizar cada período de facturación. Puedes cancelar 
                tu suscripción en cualquier momento desde la sección de configuración de tu cuenta. La cancelación será 
                efectiva al finalizar el período de facturación actual.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">5. Uso Aceptable</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Te comprometes a utilizar FinTec únicamente para fines legítimos y de acuerdo con estos términos. 
                Específicamente, te comprometes a NO:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Utilizar el servicio para actividades ilegales o no autorizadas</li>
                <li>Intentar acceder a áreas restringidas del servicio o a otras cuentas</li>
                <li>Interferir con o interrumpir el funcionamiento del servicio</li>
                <li>Transmitir virus, malware o código malicioso</li>
                <li>Realizar ingeniería inversa, descompilar o desensamblar cualquier parte del servicio</li>
                <li>Utilizar el servicio para competir con FinTec o desarrollar productos similares</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">6. Datos y Privacidad</h2>
              <p className="text-foreground/90 leading-relaxed">
                Tu privacidad es importante para nosotros. El manejo de tus datos personales y financieros se describe 
                detalladamente en nuestra{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Política de Privacidad
                </Link>
                . Al utilizar FinTec, también aceptas nuestra Política de Privacidad.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">7. Propiedad Intelectual</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Todos los derechos de propiedad intelectual relacionados con FinTec, incluyendo pero no limitado a:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>El software y código fuente</li>
                <li>Diseños, logotipos y elementos gráficos</li>
                <li>Contenido y documentación</li>
                <li>Algoritmos y tecnologías de IA</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                Son propiedad de FinTec o sus licenciantes. Se te otorga una licencia limitada, no exclusiva y no 
                transferible para utilizar el servicio únicamente según estos términos.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">8. Limitación de Responsabilidad</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                FinTec se proporciona "tal cual" y "según disponibilidad". No garantizamos que el servicio será:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Ininterrumpido, seguro o libre de errores</li>
                <li>Libre de virus u otros componentes dañinos</li>
                <li>Preciso, completo o actualizado</li>
              </ul>
              <p className="text-foreground/90 leading-relaxed mt-3">
                En la máxima medida permitida por la ley, FinTec no será responsable por daños indirectos, incidentales, 
                especiales, consecuentes o punitivos, incluyendo pérdida de beneficios, datos o uso, incluso si hemos sido 
                advertidos de la posibilidad de tales daños.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">9. Exactitud de la Información Financiera</h2>
              <p className="text-foreground/90 leading-relaxed">
                Es tu responsabilidad verificar y validar la exactitud de toda la información financiera que ingreses en 
                FinTec. Aunque proporcionamos herramientas para ayudarte a gestionar tus finanzas, no garantizamos la 
                exactitud de tus registros y no somos responsables por decisiones financieras basadas en la información 
                en la plataforma.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">10. Modificaciones del Servicio y Términos</h2>
              <p className="text-foreground/90 leading-relaxed">
                Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto del servicio en 
                cualquier momento, con o sin previo aviso. También podemos actualizar estos términos periódicamente. 
                Las modificaciones entrarán en vigor al publicarlas en esta página. Tu uso continuado del servicio después 
                de cualquier modificación constituye tu aceptación de los nuevos términos.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">11. Terminación</h2>
              <p className="text-foreground/90 leading-relaxed mb-3">
                Podemos suspender o terminar tu acceso al servicio inmediatamente, sin previo aviso, si:
              </p>
              <ul className="list-disc list-inside space-y-2 text-foreground/90 ml-4">
                <li>Violas estos Términos de Servicio</li>
                <li>Tu cuenta permanece inactiva por un período prolongado</li>
                <li>No realizas el pago de una suscripción cuando corresponde</li>
                <li>Determinamos que tu uso del servicio presenta un riesgo para otros usuarios o para FinTec</li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">12. Ley Aplicable y Jurisdicción</h2>
              <p className="text-foreground/90 leading-relaxed">
                Estos términos se regirán e interpretarán de acuerdo con las leyes aplicables. Cualquier disputa relacionada 
                con estos términos o el servicio será resuelta en los tribunales competentes.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold mb-4">13. Contacto</h2>
              <p className="text-foreground/90 leading-relaxed">
                Si tienes preguntas sobre estos Términos de Servicio, puedes contactarnos a través de:{' '}
                <a href="mailto:support@fintec.com" className="text-primary hover:underline">
                  support@fintec.com
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


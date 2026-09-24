import { Link } from "react-router";

export default function CookiePolicyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-text">Política de Cookies</h1>
      <p className="mb-8 text-sm text-text-muted">Última actualización: 24 de septiembre de 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-text">
        <section>
          <h2 className="text-xl font-semibold text-text">1. ¿Qué son las Cookies?</h2>
          <p>
            Las cookies son pequeños archivos de texto que se almacenan en su dispositivo (computadora, tablet o teléfono móvil) cuando visita un sitio web. Permiten que el sitio recuerde información sobre su visita, como sus preferencias de idioma y otras configuraciones, para facilitar su próxima visita y hacer que el sitio le resulte más útil.
          </p>
          <p>
            Además de cookies, utilizamos otras tecnologías similares como localStorage, sessionStorage y web beacons para los mismos propósitos descritos en esta política.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">2. ¿Qué Cookies Utilizamos?</h2>

          <h3 className="text-lg font-semibold text-text mt-4">2.1 Cookies Esenciales (Estrictamente Necesarias)</h3>
          <p>
            Estas cookies son necesarias para el funcionamiento básico de la Plataforma y no se pueden desactivar. Sin estas cookies, la Plataforma no funcionaría correctamente.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold">Cookie</th>
                  <th className="py-2 text-left font-semibold">Propósito</th>
                  <th className="py-2 text-left font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">sb-[project].auth.token</td>
                  <td className="py-2">Autenticación y sesión de usuario (Supabase)</td>
                  <td className="py-2">Sesión</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">cookie_consent</td>
                  <td className="py-2">Almacena sus preferencias de consentimiento de cookies</td>
                  <td className="py-2">1 año</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-xs">auth_intent</td>
                  <td className="py-2">Recuerda la intención de autenticación del usuario</td>
                  <td className="py-2">Sesión</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-text mt-4">2.2 Cookies Funcionales</h3>
          <p>
            Estas cookies permiten mejorar la funcionalidad y personalización de la Plataforma. Pueden ser establecidas por nosotros o por proveedores de terceros cuyos servicios hemos agregado.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold">Cookie</th>
                  <th className="py-2 text-left font-semibold">Propósito</th>
                  <th className="py-2 text-left font-semibold">Duración</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">theme</td>
                  <td className="py-2">Preferencia de tema (claro/oscuro)</td>
                  <td className="py-2">1 año</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">i18next</td>
                  <td className="py-2">Preferencia de idioma</td>
                  <td className="py-2">1 año</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 font-mono text-xs">pwa_install_dismissed</td>
                  <td className="py-2">Recuerda si el usuario descartó la instalación PWA</td>
                  <td className="py-2">30 días</td>
                </tr>
                <tr>
                  <td className="py-2 font-mono text-xs">lpav_cart / lpav_cart_&#123;userId&#125;</td>
                  <td className="py-2">Carrito de compras del usuario</td>
                  <td className="py-2">30 días</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-lg font-semibold text-text mt-4">2.3 Cookies de Telemetría y Analítica</h3>
          <p>
            Estas cookies y tecnologías nos permiten recopilar datos sobre cómo los usuarios interactúan con la Plataforma, para mejorar el servicio y personalizar la experiencia.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 text-left font-semibold">Tipo</th>
                  <th className="py-2 text-left font-semibold">Propósito</th>
                  <th className="py-2 text-left font-semibold">Base Legal</th>
                </tr>
              </thead>
              <tbody className="text-text-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2">Telemetría interna</td>
                  <td className="py-2">Registro de eventos: visualización de paquetes, búsquedas, carrito, generación de itinerarios</td>
                  <td className="py-2">Interés legítimo / Consentimiento</td>
                </tr>
                <tr>
                  <td className="py-2">Analítica de comportamiento</td>
                  <td className="py-2">Análisis de patrones de navegación para recomendaciones personalizadas</td>
                  <td className="py-2">Consentimiento</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Para más detalles sobre la telemetría que recopilamos, consulte la sección 4 de nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">3. Gestión de Cookies</h2>
          <p>
            Usted puede gestionar sus preferencias de cookies de las siguientes maneras:
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">3.1 Banner de Consentimiento</h3>
          <p>
            En su primera visita a la Plataforma, se le presentará un banner de consentimiento de cookies donde puede:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Aceptar todas:</strong> Permite el uso de todas las cookies, incluidas las funcionales y de telemetría.</li>
            <li><strong>Rechazar no esenciales:</strong> Solo se mantienen las cookies estrictamente necesarias.</li>
            <li><strong>Personalizar:</strong> Elegir qué categorías de cookies desea activar o desactivar.</li>
          </ul>
          <p>
            Puede cambiar sus preferencias en cualquier momento haciendo clic en el enlace &ldquo;Configuración de Cookies&rdquo; disponible en el pie de página de la Plataforma.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">3.2 Configuración del Navegador</h3>
          <p>
            La mayoría de los navegadores web permiten controlar las cookies a través de su configuración. Puede:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ver qué cookies tiene almacenadas y eliminarlas individualmente.</li>
            <li>Bloquear cookies de terceros.</li>
            <li>Bloquear todas las cookies (puede afectar la funcionalidad de la Plataforma).</li>
            <li>Eliminar todas las cookies al cerrar el navegador.</li>
          </ul>
          <p>
            Consulte la ayuda de su navegador para más información:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chrome: chrome://settings/cookies</li>
            <li>Firefox: about:preferences#privacy</li>
            <li>Safari: Preferencias → Privacidad</li>
            <li>Edge: edge://settings/cookies</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">3.3 Señal Global Privacy Control (GPC)</h3>
          <p>
            Avimo respeta la señal Global Privacy Control (GPC), un estándar de la industria que permite a los usuarios comunicar su preferencia de no venta/compartir de datos personales. Si su navegador envía una señal GPC, Avimo desactivará automáticamente las cookies de telemetría y analítica.
          </p>
          <p>
            La señal GPC es reconocida y requerida por las leyes de privacidad de California (CCPA/CPRA), Colorado, Connecticut y otros estados de EE.UU.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">4. Consentimiento por Jurisdicción</h2>
          <p>
            Dependiendo de su ubicación, las reglas de consentimiento para cookies varían:
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">4.1 México</h3>
          <p>
            Conforme a la LFPDPPP 2025 y sus reglamentos, Avimo informa sobre el uso de tecnologías de rastreo a través de este aviso de privacidad simplificado. El consentimiento para cookies no esenciales se obtiene mediante el banner de consentimiento. Las cookies estrictamente necesarias no requieren consentimiento previo por ser técnicamente indispensables.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">4.2 Estados Unidos</h3>
          <p>
            Conforme al CCPA/CPRA y leyes estatales aplicables:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Se proporciona un link &ldquo;Do Not Sell or Share My Personal Information&rdquo; en el pie de página.</li>
            <li>Se respeta la señal Global Privacy Control (GPC).</li>
            <li>Los usuarios de California, Colorado, Connecticut y otros estados con leyes de privacidad tienen derecho a optar por no participar en la &ldquo;venta&rdquo; o &ldquo;compartir&rdquo; de datos.</li>
            <li>No se requiere consentimiento previo (opt-in) para cookies no sensibles, pero se proporciona un mecanismo de opt-out claro.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">4.3 Canadá</h3>
          <p>
            Conforme a PIPEDA y la Ley 25 de Quebec:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Canadá (federal):</strong> Se requiere consentimiento implícito o explícito según la sensibilidad de los datos recopilados.</li>
            <li><strong>Quebec (Ley 25, Art. 8.1):</strong> Las tecnologías de identificación, localización y perfilado están desactivadas por defecto. El usuario debe activarlas explícitamente. El banner se presenta en francés e inglés.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">4.4 Latinoamérica</h3>
          <p>
            Para usuarios en Latinoamérica, se aplica el modelo de consentimiento informado conforme a la legislación de cada país. El banner de consentimiento proporciona opciones claras para aceptar o rechazar cookies no esenciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">5. Cookies de Terceros</h2>
          <p>
            Actualmente, la Plataforma <strong>no utiliza cookies de terceros para publicidad</strong> (Google Ads, Facebook Pixel, etc.).
          </p>
          <p>
            Sin embargo, algunos servicios integrados pueden establecer sus propias cookies:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Supabase:</strong> Cookies de autenticación para gestionar la sesión del usuario.</li>
            <li><strong>Stripe:</strong> Cookies de seguridad durante el proceso de pago (limitadas al checkout de Stripe).</li>
          </ul>
          <p>
            Estos terceros tienen sus propias políticas de privacidad y cookies que le recomendamos revisar.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">6. Actualizaciones de esta Política</h2>
          <p>
            Esta Política de Cookies puede ser actualizada periódicamente para reflejar cambios en las tecnologías utilizadas, la legislación aplicable o las prácticas de la Plataforma. Se notificará al usuario de cambios significativos mediante un aviso en la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">7. Contacto</h2>
          <p>
            Para preguntas sobre esta Política de Cookies:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Correo electrónico: <strong>privacidad@avimo.travel</strong></li>
            <li>Página de contacto: <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-text-muted">
            <strong>Aviso importante:</strong> Esta Política de Cookies forma parte integral del Aviso de Privacidad de la Plataforma Avimo, conforme a la LFPDPPP 2025 de México, el CCPA/CPRA de California, PIPEDA y Ley 25 de Canadá, y las leyes de protección de datos de Latinoamérica. Última revisión: 24 de septiembre de 2026. Se recomienda la revisión por parte de asesoría legal especializada antes de su publicación definitiva.
          </p>
        </div>
      </div>
    </div>
  );
}

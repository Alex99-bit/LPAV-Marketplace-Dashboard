import { Link } from "react-router";

export default function AgencyTermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-text">Términos y Condiciones para Agencias de Viaje</h1>
      <p className="mb-8 text-sm text-text-muted">Última actualización: 24 de septiembre de 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-text">
        <section>
          <h2 className="text-xl font-semibold text-text">1. Partes y Aceptación</h2>
          <p>
            Los presentes Términos y Condiciones para Agencias de Viaje (en adelante, los &ldquo;Términos de Agencia&rdquo;) regulan la relación entre Avimo Technologies S.A. de C.V. (en adelante, &ldquo;Avimo&rdquo;), con domicilio fiscal en Ciudad de México, México, y toda persona moral o física que se registre como agencia de viajes en la Plataforma (en adelante, la &ldquo;Agencia&rdquo;).
          </p>
          <p>
            Al completar el proceso de registro, la Agencia declara haber leído, comprendido y aceptado expresamente estos Términos de Agencia, así como la <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, la <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link> y los <Link to="/terms" className="text-primary hover:underline">Términos y Condiciones para Viajeros</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">2. Objeto y Naturaleza de la Relación</h2>
          <p>
            Avimo proporciona a la Agencia una plataforma tecnológica (SaaS) para la publicación, promoción y venta de paquetes turísticos, gestión de clientes (CRM), comunicación con viajeros, analíticas y herramientas de gestión financiera.
          </p>
          <p>
            <strong>Naturaleza de la relación:</strong> La relación entre Avimo y la Agencia es de prestación de servicios tecnológicos. Avimo actúa como intermediario tecnológico y no como agente de viajes, tour operador ni mayorista. La Agencia es la única responsable de los servicios turísticos que ofrece.
          </p>
          <p>
            <strong>No existe relación laboral, de sociedad, joint venture ni agencia</strong> entre Avimo y la Agencia. Cada parte actúa como contratista independiente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">3. Registro y Verificación</h2>
          <p>Para registrarse como Agencia en la Plataforma, se requiere:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Ser una persona moral o física debidamente constituida conforme a las leyes de su país de operación.</li>
            <li>Contar con registro fiscal vigente (RFC en México, EIN en EE.UU., o equivalente en su jurisdicción).</li>
            <li>Proporcionar documentación fiscal válida (Constancia de Situación Fiscal o equivalente).</li>
            <li>Contar con certificaciones turísticas vigentes cuando aplique (RNT, IATA, CLIA, AMTR, etc.).</li>
            <li>Designar un representante legal autorizado para operar la cuenta.</li>
            <li>Completar la verificación de identidad y cuenta bancaria a través de Stripe Connect.</li>
          </ul>
          <p>
            Avimo se reserva el derecho de rechazar o suspender el registro de cualquier Agencia que no cumpla con los requisitos de verificación o que proporcione documentación falsa o alterada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">4. Planes SaaS y Comisiones</h2>
          <p>La Plataforma ofrece los siguientes planes de suscripción:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Plan Básico:</strong> Publicación limitada de flyers, CRM básico, herramientas esenciales.</li>
            <li><strong>Plan Intermedio:</strong> Mayor límite de flyers, CRM avanzado, herramientas de analítica.</li>
            <li><strong>Plan Premium:</strong> Flyers ilimitados, CRM completo, analítica avanzada, soporte prioritario.</li>
            <li><strong>Plan Fundador:</strong> Todos los beneficios Premium más beneficios exclusivos, sujeto a aprobación de Avimo.</li>
          </ul>
          <p>
             <strong>Comisión por transacción:</strong> Avimo retendrá una comisión sobre cada pago confirmado a través de la Plataforma. La tasa de comisión varía según el plan contratado y se detalla en la configuración de la cuenta de la Agencia. Esta comisión se descuenta de la liquidación de la Agencia.
          </p>
          <p>
            <strong>Pagos:</strong> Los pagos de la suscripción SaaS se procesan a través de Stripe. Los ingresos por ventas de paquetes se depositan directamente en la cuenta bancaria de la Agencia una vez completado el proceso de verificación de Stripe Connect, menos la comisión aplicable de Avimo.
          </p>
          <p>
            Avimo se reserva el derecho de modificar los precios de los planes y las tasas de comisión con un aviso previo de 30 días.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">5. Publicación de Flyers y Contenido</h2>
          <p>La Agencia es la única responsable de:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>La veracidad, exactitud y legalidad de toda la información publicada en sus flyers (precios, disponibilidad, itinerarios, imágenes, descripciones).</li>
            <li>Obtener los derechos de uso de todas las imágenes, textos y materiales publicados.</li>
            <li>Actualizar la disponibilidad y precios de forma oportuna.</li>
            <li>Retirar flyers que ya no estén disponibles o cuyo contenido sea incorrecto.</li>
          </ul>
          <p>
            Al publicar contenido en la Plataforma, la Agencia otorga a Avimo una licencia no exclusiva, mundial, gratuita y sublicenciable para usar, reproducir, modificar y distribuir dicho contenido exclusivamente para la operación y promoción de la Plataforma.
          </p>
          <p>
            <strong>Prohibiciones de contenido:</strong> Está prohibido publicar contenido que sea ilegal, ofensivo, discriminatorio, engañoso, que infrinja derechos de propiedad intelectual de terceros, o que contenga información de contacto personal para eludir el sistema de comunicación de la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">6. Obligaciones Fiscales</h2>
          <p>
            <strong>IVA y tributación:</strong> La Agencia es la única responsable de cumplir con todas sus obligaciones fiscales, incluyendo pero no limitándose a:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Emitir comprobantes fiscales (facturas) conforme a la legislación de su jurisdicción.</li>
            <li>Causar y enterar el IVA correspondiente sobre los servicios turísticos vendidos.</li>
            <li>Declarar y pagar todos los impuestos aplicables a sus ingresos.</li>
            <li>Cumplir con las obligaciones de retención y entero de impuestos cuando aplique.</li>
          </ul>
          <p>
            <strong>Precios con IVA:</strong> La Agencia se compromete a que todos los precios publicados en la Plataforma incluyan el IVA aplicable o, en su defecto, a indicar claramente que el IVA será cobrado adicionalmente.
          </p>
          <p>
            Avimo no es responsable de las obligaciones fiscales de la Agencia ni de las consecuencias derivadas del incumplimiento fiscal de esta.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">7. Pagos y Stripe Connect</h2>
          <p>
            La Agencia debe configurar su cuenta de Stripe Connect para recibir pagos de los viajeros. Los pagos se procesan de la siguiente manera:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>El viajero paga a través de Stripe Checkout.</li>
             <li>El Viajero paga el precio del servicio y la tarifa de procesamiento mostrada en el checkout; la comisión de Avimo se descuenta de la liquidación de la Agencia.</li>
             <li>Stripe transfiere a la Agencia el importe del servicio menos la comisión aplicable de Avimo. La tarifa de procesamiento se utiliza para cubrir el costo del cobro electrónico y puede ajustarse contra el costo real de Stripe.</li>
            <li>Los tiempos de liquidación dependen de la configuración de Stripe Connect y la institución bancaria de la Agencia.</li>
            <li>La Agencia es responsable de proporcionar información bancaria veraz y actualizada.</li>
          </ul>
          <p>
            Avimo no es responsable por retrasos en la liquidación de pagos causados por Stripe, la institución bancaria de la Agencia, o por información bancaria incorrecta proporcionada por la Agencia.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">8. Cancelaciones, Reembolsos y Reserva Financiera</h2>
          <p>
            La Agencia acepta que la política de cancelación de Avimo es parte del contrato celebrado con el Viajero y no puede ser sustituida por condiciones particulares menos favorables que no hayan sido informadas y aceptadas previamente.
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>El anticipo inicial estándar es del 20% del precio total del paquete.</li>
            <li>La Agencia debe mantener actualizados los costos no recuperables y las condiciones de sus proveedores.</li>
            <li>La Agencia absorbe las comisiones, tarifas de procesamiento, reversos y costos que resulten de una cancelación imputable a ella.</li>
            <li>Avimo puede descontar dichos importes de liquidaciones futuras, revertir transferencias de Stripe o registrar un saldo negativo exigible a la Agencia.</li>
            <li>Avimo puede establecer una reserva financiera mínima y suspender nuevas liquidaciones mientras exista un saldo negativo o reembolso pendiente.</li>
            <li>La Agencia debe colaborar con la documentación fiscal y operativa de cada reembolso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">9. Uso de Datos para Inteligencia Artificial</h2>
          <p>
            La Agencia acepta expresamente que:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>La Plataforma utiliza inteligencia artificial para cualificar leads (potenciales clientes) en las conversaciones de chat entre la Agencia y los viajeros.</li>
            <li>Los datos de las conversaciones pueden ser procesados por sistemas de IA para mejorar la cualificación de leads y la experiencia del usuario.</li>
            <li>La Agencia puede tomar control manual de la conversación en cualquier momento, desactivando la asistencia de IA.</li>
            <li>Los datos de comportamiento de los viajeros (búsquedas, visualizaciones, etc.) pueden ser utilizados para generar recomendaciones y analíticas.</li>
            <li>Todo el procesamiento de datos se realiza conforme a la <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link> y la legislación aplicable de protección de datos.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">10. Confidencialidad y NDA</h2>
          <p>
            La Agencia se compromete a mantener estricta confidencialidad respecto a:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Información técnica, comercial y operativa de la Plataforma a la que tenga acceso.</li>
            <li>Datos personales de los viajeros que procese a través de la Plataforma.</li>
            <li>Estrategias comerciales, algoritmos, modelos de negocio y know-how de Avimo.</li>
            <li>Cualquier información marcada como confidencial por Avimo.</li>
          </ul>
          <p>
            Esta obligación de confidencialidad subsistirá durante la vigencia de la relación comercial y por un período de 5 años después de su terminación.
          </p>
          <p>
            <strong>Excepciones:</strong> La obligación de confidencialidad no aplica a información que: (a) sea de dominio público sin incumplimiento de la Agencia; (b) la Agencia ya conocía legítimamente antes de acceder a la Plataforma; (c) sea requerida por orden judicial o administrativa válida.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">11. Transferencia de Datos Personales</h2>
          <p>
            La Agencia reconoce que, como resultado de la operación en la Plataforma, recibirá datos personales de los viajeros. En consecuencia:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>La Agencia se compromete a tratar dichos datos conforme a la legislación aplicable de protección de datos (LFPDPPP en México, CCPA/CPRA en California, PIPEDA en Canadá, y leyes equivalentes en otras jurisdicciones).</li>
            <li>La Agencia debe poner a disposición de los viajeros su propio aviso de privacidad para el tratamiento de datos que realice como responsable independiente.</li>
            <li>La Agencia no podrá utilizar los datos personales de los viajeros para fines distintos a la prestación del servicio turístico contratado.</li>
            <li>La Agencia mantendrá las medidas de seguridad administrativas, técnicas y físicas necesarias para proteger los datos personales.</li>
            <li>La Agencia será la única responsable del tratamiento que realice de los datos personales y deberá sacar en paz y a salvo a Avimo de cualquier reclamación, demanda o sanción derivada de su incumplimiento.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">12. Censura, Strikes y Suspensión</h2>
          <p>
            La Plataforma cuenta con un sistema de censura automatizado que monitorea las comunicaciones para prevenir el intercambio de datos de contacto. La Agencia acepta que:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Compartir datos de contacto a través del chat resultará en la acumulación de strikes.</li>
            <li>Al acumular 5 strikes, el acceso al chat será bloqueado temporalmente.</li>
            <li>Avimo podrá suspender o terminar la cuenta de la Agencia en caso de reincidencia o violaciones graves.</li>
            <li>Avimo podrá retirar flyers que no cumplan con las políticas de contenido de la Plataforma.</li>
            <li>La Agencia tiene derecho a apelar las decisiones de censura a través del sistema de soporte.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">13. Propiedad Intelectual</h2>
          <p>
            La Plataforma, incluyendo su código fuente, diseño, logotipos, marcas y funcionalidades, es propiedad exclusiva de Avimo y está protegida por las leyes de propiedad intelectual aplicables. El registro como Agencia no otorga ningún derecho de propiedad sobre la Plataforma.
          </p>
          <p>
            La Agencia se compromete a no realizar ingeniería inversa, descompilar o desensamblar cualquier parte de la Plataforma, ni crear obras derivadas basadas en la misma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">14. Limitación de Responsabilidad</h2>
          <p>
            EN LA MÁXIMA EXTENSIÓN PERMITIDA POR LA LEY APLICABLE:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Avimo proporciona la Plataforma &ldquo;tal cual&rdquo; (as-is) y no garantiza su disponibilidad ininterrumpida, libre de errores o que cumplirá con todas las necesidades de la Agencia.</li>
            <li>Avimo no será responsable por pérdidas de ingresos, beneficios, datos de negocio o daños indirectos derivados del uso de la Plataforma.</li>
            <li>Avimo no será responsable por disputas entre la Agencia y los viajeros.</li>
            <li>La responsabilidad total de Avimo ante la Agencia no excederá las comisiones pagadas por la Agencia a Avimo en los últimos 12 meses.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">15. Vigencia y Terminación</h2>
          <p>
            Estos Términos de Agencia entrarán en vigor a partir de la aceptación durante el proceso de registro y permanecerán vigentes mientras la Agencia mantenga una cuenta activa en la Plataforma.
          </p>
          <p>
            Cualquiera de las partes podrá terminar la relación comercial:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>La Agencia:</strong> En cualquier momento, notificando a Avimo por escrito con 30 días de antelación.</li>
            <li><strong>Avimo:</strong> En cualquier momento, notificando a la Agencia con 30 días de antelación, o inmediatamente en caso de violación grave de estos Términos.</li>
          </ul>
          <p>
            Tras la terminación, la Agencia deberá: (a) cesar el uso de la Plataforma; (b) cumplir con las reservas ya confirmadas; (c) eliminar cualquier contenido confidencial de Avimo; y (d) cumplir con sus obligaciones fiscales pendientes.
          </p>
          <p>
            Las disposiciones que por su naturaleza deban sobrevivir a la terminación (confidencialidad, limitación de responsabilidad, propiedad intelectual, ley aplicable) permanecerán vigentes.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">16. Ley Aplicable y Resolución de Disputas</h2>
          <h3 className="text-lg font-semibold text-text mt-4">16.1 Agencias en México</h3>
          <p>
            Para Agencias con domicilio fiscal en México, estos Términos se rigen por el Código de Comercio, la Ley Federal de Protección al Consumidor, la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP 2025) y demás legislación aplicable. Las disputas se someterán a los tribunales competentes de la Ciudad de México.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">16.2 Agencias en Estados Unidos</h3>
          <p>
            Para Agencias con domicilio en Estados Unidos, estos Términos se rigen por las leyes del Estado de Delaware. Las disputas se resolverán mediante arbitraje vinculante individual conforme a las reglas de la American Arbitration Association (AAA).
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">16.3 Agencias en Canadá</h3>
          <p>
            Para Agencias con domicilio en Canadá, estos Términos se rigen por el PIPEDA y las leyes provinciales aplicables. Las disputas se someterán a la jurisdicción de la provincia de Ontario.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">16.4 Agencias en Latinoamérica</h3>
          <p>
            Para Agencias con domicilio en otros países de Latinoamérica, estos Términos se rigen por las leyes comerciales y de protección de datos de cada país. Las disputas se resolverán mediante arbitraje en la Ciudad de México.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">17. Disposiciones Generales</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Acuerdo completo:</strong> Estos Términos de Agencia, junto con la Política de Privacidad, la Política de Cookies y los Términos para Viajeros, constituyen el acuerdo completo entre la Agencia y Avimo.</li>
            <li><strong>Severabilidad:</strong> Si alguna disposición es declarada inválida, las demás mantendrán su plena vigencia.</li>
            <li><strong>Modificaciones:</strong> Avimo podrá modificar estos Términos con aviso previo de 30 días. El uso continuado de la Plataforma constituye aceptación.</li>
            <li><strong>Cesión:</strong> Avimo podrá ceder sus derechos y obligaciones. La Agencia no podrá ceder los suyos sin consentimiento previo por escrito de Avimo.</li>
            <li><strong>Notificaciones:</strong> Las notificaciones se enviarán al correo electrónico registrado por la Agencia. La Agencia debe mantener su información de contacto actualizada.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">18. Contacto</h2>
          <p>
            Para preguntas o aclaraciones sobre estos Términos de Agencia:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Correo electrónico: legal@avimo.travel</li>
            <li>Página de contacto: <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-text-muted">
            <strong>Aviso importante:</strong> Este documento constituye los Términos y Condiciones de Uso de la Plataforma Avimo para Agencias de Viaje. Se recomienda guardar una copia de estos Términos para sus registros. Última revisión: 24 de septiembre de 2026. Este documento ha sido elaborado con base en la legislación aplicable de México (LFPC, LFPDPPP 2025, Código de Comercio), Estados Unidos (CCPA/CPRA, leyes estatales), Canadá (PIPEDA, Ley 25 de Quebec) y principales jurisdicciones de Latinoamérica. Se recomienda la revisión por parte de asesoría legal especializada antes de su publicación definitiva.
          </p>
        </div>
      </div>
    </div>
  );
}

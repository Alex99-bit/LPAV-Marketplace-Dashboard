import { Link } from "react-router";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-text">Términos y Condiciones de Uso</h1>
      <p className="mb-8 text-sm text-text-muted">Última actualización: 24 de septiembre de 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-text">
        <section>
          <h2 className="text-xl font-semibold text-text">1. Partes y Aceptación</h2>
          <p>
            Los presentes Términos y Condiciones de Uso (en adelante, los &ldquo;Términos&rdquo;) regulan el acceso y uso de la plataforma digital <strong>Avimo</strong> (en adelante, la &ldquo;Plataforma&rdquo;), operada por Avimo Technologies S.A. de C.V. (en adelante, &ldquo;Avimo&rdquo;), con domicilio fiscal en Ciudad de México, México, a favor de toda persona física que se registre como viajero o usuario final (en adelante, el &ldquo;Viajero&rdquo;).
          </p>
          <p>
            Al crear una cuenta, acceder o utilizar la Plataforma, el Viajero declara haber leído, comprendido y aceptado expresamente estos Términos, así como la <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link> y la <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>. Si no está de acuerdo con alguna de estas disposiciones, debe abstenerse de utilizar la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">2. Objeto</h2>
          <p>
            La Plataforma es un marketplace digital que conecta a viajeros con agencias de viaje registradas (en adelante, las &ldquo;Agencias&rdquo;), permitiendo la exploración, reserva y pago de paquetes turísticos, así como la generación de itinerarios personalizados mediante inteligencia artificial y la comunicación directa con las Agencias a través de un sistema de chat.
          </p>
          <p>
            Avimo actúa exclusivamente como intermediario tecnológico entre el Viajero y las Agencias. <strong>Avimo no es agencia de viajes</strong> y no opera, organiza ni presta directamente los servicios turísticos publicados en la Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">3. Elegibilidad y Registro</h2>
          <p>Para utilizar la Plataforma, el Viajero debe:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Tener al menos 18 años de edad o la mayoría de edad aplicable en su jurisdicción.</li>
            <li>Proporcionar información veraz, completa y actualizada durante el registro.</li>
            <li>Aceptar estos Términos, la Política de Privacidad y la Política de Cookies.</li>
            <li>No estar inhabilitado legal o contractualmente para utilizar la Plataforma.</li>
          </ul>
          <p>
            El Viajero es responsable de la veracidad de los datos proporcionados y de mantener la confidencialidad de sus credenciales de acceso. Avimo se reserva el derecho de suspender o cancelar cuentas que contengan información falsa o que sean utilizadas de manera no autorizada.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">4. Compras, Pagos y Depósitos</h2>
          <p>
            Los paquetes turísticos son ofrecidos y operados exclusivamente por las Agencias. Los precios, disponibilidad y condiciones de cada paquete son responsabilidad de la Agencia publicadora.
          </p>
          <p>El proceso de pago funciona de la siguiente manera:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Anticipo:</strong> Para reservar un paquete, el Viajero debe pagar un anticipo equivalente al 20% del precio total del paquete.</li>
            <li><strong>Abonos:</strong> El saldo restante puede pagarse mediante abonos parciales hasta completar el pago total antes de la fecha de salida del viaje.</li>
            <li><strong>Procesamiento de pagos:</strong> Todos los pagos se procesan de forma segura a través de Stripe Connect. Avimo no almacena información de tarjetas de crédito o débito.</li>
            <li><strong>Moneda:</strong> Los precios pueden estar expresados en pesos mexicanos (MXN), dólares estadounidenses (USD) o euros (EUR), según lo indique la Agencia.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">5. Política de Reembolsos y Cancelaciones</h2>
          <p>
            <strong>Política de No Reembolso del Anticipo:</strong> Una vez realizado el pago del anticipo, este no es reembolsable en caso de que el Viajero decida cancelar la reserva por motivos personales. El anticipo queda en poder de la Agencia como compensación por la reserva realizada.
          </p>
          <p>
            <strong>Morosidad:</strong> Si el Viajero no completa el pago total del paquete antes de la fecha de salida indicada, la reserva podrá ser cancelada automáticamente sin derecho a reembolso del anticipo.
          </p>
          <p>
            <strong>Cancelación por la Agencia:</strong> Si la Agencia cancela el paquete por causas imputables a ella, la Agencia será responsable de gestionar el reembolso directo al Viajero conforme a sus propias políticas y a la legislación aplicable.
          </p>
          <p>
            <strong>Impuestos:</strong> Los precios publicados incluyen el Impuesto al Valor Agregado (IVA) cuando aplique. El Viajero recibirá un desglose del subtotal y el IVA en el resumen de su orden.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">6. Itinerarios Generados por Inteligencia Artificial</h2>
          <p>
            La Plataforma ofrece la generación de itinerarios de viaje personalizados mediante inteligencia artificial. El Viajero acepta que:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Los itinerarios generados son sugerencias y no constituyen una reserva confirmada de servicios.</li>
            <li>La información proporcionada por la IA puede contener imprecisiones y debe ser verificada con la Agencia correspondiente.</li>
            <li>Los datos de viaje del Viajero pueden ser utilizados para generar recomendaciones personalizadas, conforme a la Política de Privacidad.</li>
            <li>El uso de esta función está sujeto a límites de frecuencia (rate limiting) para prevenir abuso.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">7. Sistema de Chat y Censura</h2>
          <p>
            La Plataforma ofrece un sistema de mensajería directa entre el Viajero y la Agencia. El Viajero acepta que:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Está <strong>estrictamente prohibido</strong> compartir datos de contacto personal (teléfonos, correos electrónicos, enlaces a redes sociales, información bancaria) a través del chat.</li>
            <li>Los mensajes son monitoreados automáticamente por un sistema de censura que bloquea contenido con datos de contacto.</li>
            <li>El incumplimiento de esta norma puede resultar en la acumulación de &ldquo;strikes&rdquo; y la suspensión temporal o permanente de la cuenta.</li>
            <li>La Plataforma puede utilizar un asistente de IA para cualificar leads en conversaciones entre Agencias y Viajeros, conforme a la Política de Privacidad.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">8. Obligaciones del Viajero</h2>
          <p>El Viajero se compromete a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Utilizar la Plataforma únicamente para fines lícitos y conforme a estos Términos.</li>
            <li>No realizar actividades que puedan dañar, inhabilitar o sobrecargar la Plataforma.</li>
            <li>No intentar acceder a áreas restringidas, sistemas de otros usuarios o datos de terceros.</li>
            <li>No reproducir, copiar o distribuir contenido de la Plataforma sin autorización.</li>
            <li>No utilizar la Plataforma para enviar spam, publicidad no solicitada o contenido malicioso.</li>
            <li>Verificar directamente con la Agencia toda información relevante antes de realizar un pago.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">9. Propiedad Intelectual</h2>
          <p>
            Todos los contenidos de la Plataforma, incluyendo pero no limitándose a textos, imágenes, logotipos, iconos, diseño gráfico, código fuente y software, son propiedad de Avimo o de sus respectivos titulares y están protegidos por las leyes de propiedad intelectual aplicables.
          </p>
          <p>
            El uso de la Plataforma no otorga al Viajero ningún derecho de propiedad intelectual sobre la Plataforma o su contenido, salvo el derecho limitado, personal, no exclusivo y revocable de utilizar la Plataforma para fines personales y no comerciales.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">10. Limitación de Responsabilidad</h2>
          <p>
            EN LA MÁXIMA EXTENSIÓN PERMITIDA POR LA LEY APLICABLE:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Avimo no es responsable por los servicios turísticos ofrecidos por las Agencias, su calidad, puntualidad, seguridad o cumplimiento.</li>
            <li>Avimo no garantiza la disponibilidad ininterrumpida o libre de errores de la Plataforma.</li>
            <li>Avimo no será responsable por daños indirectos, incidentales, consecuentes o punitivos derivados del uso de la Plataforma.</li>
            <li>La responsabilidad total de Avimo ante el Viajero no excederá el monto pagado por el Viajero a Avimo en los últimos 12 meses.</li>
            <li>Las disputas sobre servicios turísticos deben resolverse directamente entre el Viajero y la Agencia correspondiente.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">11. Protección de Datos Personales y Telemetría</h2>
          <p>
            El tratamiento de datos personales del Viajero se rige por nuestra <Link to="/privacy" className="text-primary hover:underline">Política de Privacidad</Link>, la cual forma parte integral de estos Términos.
          </p>
          <p>
            El Viajero acepta expresamente que la Plataforma recopila y procesa datos de comportamiento (telemetría) con fines de mejora del servicio, personalización y prevención de fraude, incluyendo:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Paquetes visualizados y tiempo de navegación.</li>
            <li>Búsquedas realizadas y filtros utilizados.</li>
            <li>Paquetes agregados al carrito.</li>
            <li>Itinerarios generados con IA.</li>
            <li>Eventos de límite de frecuencia y bloqueos por abuso.</li>
          </ul>
          <p>
            Para más información sobre el uso de cookies y tecnologías de rastreo, consulte nuestra <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">12. Modificaciones a la Plataforma y los Términos</h2>
          <p>
            Avimo se reserva el derecho de modificar estos Términos en cualquier momento. Las modificaciones serán notificadas al Viajero mediante un aviso en la Plataforma o por correo electrónico con al menos 15 días de antelación a su entrada en vigor.
          </p>
          <p>
            El uso continuado de la Plataforma después de la entrada en vigor de las modificaciones constituye aceptación de los nuevos Términos. Si el Viajero no está de acuerdo con las modificaciones, debe cesar el uso de la Plataforma y puede solicitar la cancelación de su cuenta.
          </p>
          <p>
            Avimo también se reserva el derecho de modificar, suspender o discontinuar cualquier funcionalidad de la Plataforma, total o parcialmente, en cualquier momento y sin previo aviso.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">13. Suspensión y Terminación</h2>
          <p>
            Avimo podrá suspender o terminar la cuenta del Viajero, total o parcialmente, de forma temporal o permanente, en cualquier momento y sin previo aviso, en caso de:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Incumplimiento de estos Términos o cualquier política de la Plataforma.</li>
            <li>Uso fraudulento, abusivo o ilegal de la Plataforma.</li>
            <li>Violación de derechos de propiedad intelectual de Avimo o terceros.</li>
            <li>Comportamiento que afecte negativamente a otros usuarios o a la Plataforma.</li>
            <li>Acumulación de 5 o más strikes de censura en el chat.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">14. Ley Aplicable y Resolución de Disputas</h2>
          <h3 className="text-lg font-semibold text-text mt-4">15.1 Usuarios en México</h3>
          <p>
            Para usuarios residentes en México, estos Términos se rigen por la Ley Federal de Protección al Consumidor (LFPC), el Código de Comercio, la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y demás legislación aplicable. Las disputas se someterán a los tribunales competentes de la Ciudad de México, renunciando a cualquier otro fuero que pudiera corresponderles.
          </p>
          <p>
            Conforme al artículo 76 bis de la LFPC, el Viajero tiene derecho a: recibir información completa y veraz sobre los servicios; conocer la identidad del proveedor; negarse a aceptar cláusulas no acordadas; recibir confirmación escrita de la transacción; y ejercer el derecho de retracto conforme a la legislación vigente.
          </p>
          <p>
            En caso de inconformidad, el Viajero puede acudir a la Procuraduría Federal del Consumidor (PROFECO) en: <a href="https://www.gob.mx/profeco" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.gob.mx/profeco</a>.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">15.2 Usuarios en Estados Unidos</h3>
          <p>
            Para usuarios residentes en Estados Unidos, estos Términos se rigen por las leyes del Estado de Delaware, sin considerar sus conflictos de principios legales. Cualquier disputa se resolverá mediante arbitraje vinculante individual conforme a las reglas de la American Arbitration Association (AAA), con sede en Wilmington, Delaware.
          </p>
          <p>
            El Viajero renuncia a su derecho a participar en acciones de clase (class action) o arbitrajes colectivos. Si alguna disposición de esta cláusula es considerada inaplicable, las demás disposiciones mantendrán su plena vigencia.
          </p>
          <p>
            Conforme al California Consumer Privacy Act (CCPA/CPRA) y leyes estatales aplicables, los usuarios en EE.UU. tienen derecho a: optar por no participar en la &ldquo;venta&rdquo; o &ldquo;compartir&rdquo; de su información personal; solicitar acceso, corrección o eliminación de sus datos; y no ser discriminados por ejercer sus derechos de privacidad. Avimo respeta las señales de Global Privacy Control (GPC).
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">15.3 Usuarios en Canadá</h3>
          <p>
            Para usuarios residentes en Canadá, estos Términos se rigen por el Personal Information Protection and Electronic Documents Act (PIPEDA) y las leyes provinciales aplicables, incluyendo la Loi sur la protection des renseignements personnels dans le secteur privé (Quebec). Las disputas se someterán a la jurisdicción de la provincia de Ontario.
          </p>
          <p>
            Para usuarios en Quebec, la Plataforma cumple con la Ley 25 y el artículo 8.1 respecto a tecnologías de identificación, localización y perfilado, manteniendo dichas funciones desactivadas por defecto hasta que el usuario otorgue consentimiento expreso.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">15.4 Usuarios en Latinoamérica</h3>
          <p>
            Para usuarios residentes en otros países de Latinoamérica, estos Términos se rigen por las leyes de protección de datos y defensa del consumidor de cada país, incluyendo pero no limitándose a: Ley 1581 de 2012 (Colombia), Ley 19.628 (Chile), Ley 25.326 (Argentina) y Ley 29733 (Perú). Las disputas se resolverán mediante arbitraje en la Ciudad de México.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">15. Disposiciones Generales</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Acuerdo completo:</strong> Estos Términos, junto con la Política de Privacidad y la Política de Cookies, constituyen el acuerdo completo entre el Viajero y Avimo respecto al uso de la Plataforma.</li>
            <li><strong>Severabilidad:</strong> Si alguna disposición de estos Términos es declarada inválida o inaplicable, las demás disposiciones mantendrán su plena vigencia y efecto.</li>
            <li><strong>Renuncia:</strong> La falta de ejercicio de un derecho por parte de Avimo no constituye renuncia al mismo.</li>
            <li><strong>Cesión:</strong> Avimo podrá ceder sus derechos y obligaciones bajo estos Términos a cualquier afiliado o sucesor. El Viajero no podrá ceder sus derechos sin consentimiento previo por escrito de Avimo.</li>
            <li><strong>Idioma:</strong> Estos Términos fueron redactados originalmente en español. En caso de discrepancia entre versiones en diferentes idiomas, la versión en español prevalecerá.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">16. Contacto</h2>
          <p>
            Para preguntas, quejas o aclaraciones sobre estos Términos, el Viajero puede contactarnos a través de:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Correo electrónico: legal@avimo.travel</li>
            <li>Página de contacto: <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-text-muted">
            <strong>Aviso importante:</strong> Este documento constituye los Términos y Condiciones de Uso de la Plataforma Avimo para viajeros. Se recomienda guardar una copia de estos Términos para sus registros. Última revisión: 24 de septiembre de 2026. Este documento ha sido elaborado con base en la legislación aplicable de México (LFPC, LFPDPPP 2025), Estados Unidos (CCPA/CPRA, leyes estatales de privacidad), Canadá (PIPEDA, Ley 25 de Quebec) y principales jurisdicciones de Latinoamérica. Se recomienda la revisión por parte de asesoría legal especializada antes de su publicación definitiva.
          </p>
        </div>
      </div>
    </div>
  );
}

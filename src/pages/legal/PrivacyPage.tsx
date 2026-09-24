import { Link } from "react-router";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold text-text">Política de Privacidad y Aviso de Privacidad</h1>
      <p className="mb-8 text-sm text-text-muted">Última actualización: 24 de septiembre de 2026</p>

      <div className="prose prose-sm max-w-none space-y-8 text-text">
        <section>
          <h2 className="text-xl font-semibold text-text">1. Responsable del Tratamiento de Datos</h2>
          <p>
            <strong>Avimo Technologies S.A. de C.V.</strong> (en adelante, &ldquo;Avimo&rdquo;, &ldquo;nos&rdquo; o &ldquo;nosotros&rdquo;), con domicilio en Ciudad de México, México, es el responsable del tratamiento de los datos personales recopilados a través de la Plataforma Avimo (en adelante, la &ldquo;Plataforma&rdquo;).
          </p>
          <p>
            Para efectos de la legislación aplicable, Avimo actúa como &ldquo;Responsable&rdquo; (data controller) del tratamiento de datos personales, conforme al artículo 3 fracción XVI de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP 2025) de México, al &ldquo;business&rdquo; bajo el CCPA/CPRA de California, y al &ldquo;organization&rdquo; bajo PIPEDA de Canadá.
          </p>
          <p>
            Contacto del Delegado de Protección de Datos (DPO): <strong>dpo@avimo.travel</strong>
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">2. Datos Personales que Recopilamos</h2>

          <h3 className="text-lg font-semibold text-text mt-4">2.1 Datos de Viajeros</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de registro:</strong> Nombre completo, correo electrónico, contraseña (almacenada de forma cifrada).</li>
            <li><strong>Datos de perfil:</strong> Foto de perfil, número telefónico (si se proporciona).</li>
            <li><strong>Datos de compra:</strong> Historial de órdenes, montos pagados, paquetes reservados, abonos realizados.</li>
            <li><strong>Datos de pago:</strong> Procesados por Stripe — Avimo no almacena números de tarjeta de crédito/débito.</li>
            <li><strong>Datos de preferencias:</strong> Intereses de viaje, destinos preferidos, presupuesto, estilo de viaje (recopilados a través del onboarding).</li>
            <li><strong>Datos de comunicación:</strong> Mensajes enviados y recibidos a través del chat de la Plataforma.</li>
            <li><strong>Datos de billetera:</strong> Saldo de puntos Avimo, historial de canjes.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">2.2 Datos de Agencias</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de registro:</strong> Razón social, RFC/EIN/equivalente, domicilio fiscal, documentación fiscal (Constancia de Situación Fiscal).</li>
            <li><strong>Datos del representante:</strong> Nombre completo, correo electrónico, cargo.</li>
            <li><strong>Datos de equipo:</strong> Nombre y correo de miembros del equipo invitados.</li>
            <li><strong>Datos de certificación:</strong> Tipo y número de certificación turística (RNT, IATA, CLIA, etc.).</li>
            <li><strong>Datos financieros:</strong> Información de cuenta Stripe, ingresos generados, comisiones.</li>
            <li><strong>Datos de suscripción:</strong> Plan SaaS contratado, estado de la suscripción, historial de pagos.</li>
            <li><strong>Datos de contenido:</strong> Flyers publicados, descripciones, imágenes, precios.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">2.3 Datos de Navegación y Telemetría</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de dispositivo:</strong> Tipo de navegador, sistema operativo, resolución de pantalla, idioma.</li>
            <li><strong>Datos de navegación:</strong> Páginas visitadas, tiempo de permanencia, enlaces clicados.</li>
            <li><strong>Datos de comportamiento (telemetría):</strong> Paquetes visualizados, búsquedas realizadas, paquetes agregados al carrito, itinerarios generados con IA, eventos de rate limiting.</li>
            <li><strong>Datos de cookies:</strong> Conforme a nuestra <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">3. Finalidades del Tratamiento</h2>

          <h3 className="text-lg font-semibold text-text mt-4">3.1 Finalidades Primarias (no requieren consentimiento adicional)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Crear y administrar la cuenta del usuario en la Plataforma.</li>
            <li>Procesar reservas, pagos y abonos de paquetes turísticos.</li>
            <li>Facilitar la comunicación entre viajeros y agencias a través del chat.</li>
            <li>Generar itinerarios personalizados con inteligencia artificial.</li>
            <li>Gestionar el sistema de puntos de lealtad (Avimo Puntos).</li>
            <li>Verificar la identidad y documentación de las Agencias.</li>
            <li>Procesar pagos a través de Stripe Connect.</li>
            <li>Cumplir con obligaciones legales y fiscales.</li>
            <li>Garantizar la seguridad de la Plataforma y prevenir fraude.</li>
            <li>Aplicar el sistema de censura para proteger datos de contacto.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">3.2 Finalidades Secundarias (sujetas a consentimiento)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Enviar comunicaciones promocionales, ofertas y novedades (marketing).</li>
            <li>Personalizar recomendaciones de paquetes basadas en el comportamiento de navegación.</li>
            <li>Realizar análisis estadísticos y de tendencias de viaje.</li>
            <li>Mejorar los algoritmos de inteligencia artificial de la Plataforma.</li>
            <li>Enviar encuestas de satisfacción y solicitudes de reseñas.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">4. Telemetría y Registro de Comportamiento</h2>
          <p>
            La Plataforma implementa un sistema de telemetría que registra automáticamente eventos de comportamiento del usuario para mejorar el servicio, personalizar la experiencia y prevenir abuso. Los eventos registrados incluyen:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>view_package:</strong> Cuando un viajero visualiza la página de detalle de un paquete turístico.</li>
            <li><strong>search_query:</strong> Las búsquedas realizadas por el viajero en la Plataforma.</li>
            <li><strong>add_to_cart:</strong> Cuando un viajero agrega un paquete a su carrito de compras.</li>
            <li><strong>generate_itinerary:</strong> Cuando se genera un itinerario personalizado con IA.</li>
            <li><strong>rate_limit_ban:</strong> Cuando un usuario excede los límites de frecuencia establecidos.</li>
          </ul>
          <p>
            Estos datos se almacenan en la tabla <code>user_behavior_logs</code> de nuestra base de datos y se utilizan para:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generar recomendaciones personalizadas de paquetes turísticos.</li>
            <li>Identificar tendencias de búsqueda y preferencias de viaje.</li>
            <li>Prevenir el uso abusivo de las funcionalidades de la Plataforma (rate limiting).</li>
            <li>Mejorar la experiencia general del usuario.</li>
          </ul>
          <p>
            La base legal para este tratamiento es el interés legítimo de Avimo en mejorar su servicio (artículo 9 LFPDPPP 2025), y el consentimiento del usuario para finalidades secundarias de personalización.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">5. Base Legal para el Tratamiento</h2>

          <h3 className="text-lg font-semibold text-text mt-4">5.1 México (LFPDPPP 2025)</h3>
          <p>
            El tratamiento de datos personales se basa en:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Consentimiento:</strong> Otorgado por el usuario al aceptar estos Términos y la Política de Privacidad durante el registro (artículo 8 LFPDPPP). Para datos sensibles, se requiere consentimiento expreso y por escrito.</li>
            <li><strong>Relación contractual:</strong> El tratamiento necesario para la ejecución del contrato de servicios entre el usuario y Avimo (artículo 9 LFPDPPP).</li>
            <li><strong>Obligación legal:</strong> El tratamiento necesario para cumplir con obligaciones fiscales y regulatorias.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">5.2 Estados Unidos (CCPA/CPRA y leyes estatales)</h3>
          <p>
            Para usuarios en EE.UU., el tratamiento se basa en:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Necesidad contractual:</strong> Para cumplir con el servicio solicitado.</li>
            <li><strong>Interés legítimo:</strong> Para mejorar el servicio y prevenir fraude.</li>
            <li><strong>Consentimiento:</strong> Para finalidades de marketing y datos sensibles.</li>
          </ul>
          <p>
            Avimo no &ldquo;vende&rdquo; información personal en el sentido tradicional. Sin embargo, conforme al CCPA/CPRA, el uso de cookies analíticas y de personalización puede considerarse &ldquo;compartir&rdquo; (sharing) datos para publicidad cross-context behavioral. El usuario tiene derecho a optar por no participar mediante el link &ldquo;Do Not Sell or Share My Personal Information&rdquo; o activando la señal Global Privacy Control (GPC) en su navegador.
          </p>

          <h3 className="text-lg font-semibold text-text mt-4">5.3 Canadá (PIPEDA y Ley 25 de Quebec)</h3>
          <p>
            Para usuarios en Canadá:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Consentimiento implícito:</strong> Para datos no sensibles donde el propósito es evidente (operación de la cuenta, procesamiento de pagos).</li>
            <li><strong>Consentimiento expreso:</strong> Para datos sensibles, marketing y tecnologías de perfilado.</li>
            <li><strong>Quebec (Ley 25, Art. 8.1):</strong> Las tecnologías de identificación, localización y perfilado están desactivadas por defecto. El usuario debe activarlas explícitamente.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">5.4 Latinoamérica</h3>
          <p>
            Para usuarios en otros países de Latinoamérica, el tratamiento se basa en el consentimiento del titular, la relación contractual y las obligaciones legales aplicables conforme a la legislación de cada país (Ley 1581/2012 Colombia, Ley 19.628 Chile, Ley 25.326 Argentina, Ley 29733 Perú).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">6. Transferencias de Datos a Terceros</h2>
          <p>
            Avimo comparte datos personales con los siguientes terceros, exclusivamente para las finalidades descritas:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Stripe:</strong> Para el procesamiento de pagos. Datos compartidos: montos, identificadores de transacción. (<a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Política de privacidad de Stripe</a>)</li>
            <li><strong>Supabase:</strong> Como proveedor de infraestructura de base de datos y autenticación. Los datos se almacenan en servidores ubicados en Estados Unidos.</li>
            <li><strong>Agencias de Viaje:</strong> Cuando un viajero realiza una reserva o solicita información, los datos necesarios para la prestación del servicio se comparten con la Agencia correspondiente. La Agencia se convierte en responsable independiente del tratamiento.</li>
            <li><strong>Proveedores de IA:</strong> Para la generación de itinerarios y cualificación de leads. Los datos se procesan conforme a acuerdos de procesamiento de datos (DPA) con cláusulas de confidencialidad.</li>
          </ul>
          <p>
            <strong>Transferencias internacionales:</strong> Los datos pueden ser transferidos y procesados fuera del país de residencia del usuario, incluyendo Estados Unidos y otros países donde operan nuestros proveedores de servicios. Al utilizar la Plataforma, el usuario consiente estas transferencias, conforme al artículo 36 y 37 de la LFPDPPP y disposiciones equivalentes en otras jurisdicciones.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">7. Derechos del Titular de los Datos</h2>

          <h3 className="text-lg font-semibold text-text mt-4">7.1 Derechos ARCO (México)</h3>
          <p>Conforme a la LFPDPPP, todo titular de datos personales tiene derecho a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Acceso:</strong> Conocer qué datos personales se tienen y las condiciones del tratamiento (artículo 22).</li>
            <li><strong>Rectificación:</strong> Solicitar la corrección de datos inexactos o incompletos (artículo 23).</li>
            <li><strong>Cancelación:</strong> Solicitar la eliminación de datos cuando considere que no son necesarios para los fines para los que fueron recabados (artículo 24).</li>
            <li><strong>Oposición:</strong> Oponerse al tratamiento de sus datos por causa legítima (artículo 26).</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">7.2 Derechos bajo CCPA/CPRA (California/EE.UU.)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Derecho a saber:</strong> Qué datos personales se recopilan, con qué fin y a quién se comparten.</li>
            <li><strong>Derecho a eliminar:</strong> Solicitar la eliminación de datos personales.</li>
            <li><strong>Derecho a corregir:</strong> Solicitar la corrección de datos inexactos.</li>
            <li><strong>Derecho a optar por no participar:</strong> En la &ldquo;venta&rdquo; o &ldquo;compartir&rdquo; de datos personales.</li>
            <li><strong>Derecho a la portabilidad:</strong> Recibir una copia de sus datos en formato portable.</li>
            <li><strong>Derecho a no discriminación:</strong> No recibir trato diferente por ejercer sus derechos de privacidad.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">7.3 Derechos bajo PIPEDA y Ley 25 (Canadá)</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Derecho de acceso:</strong> Solicitar acceso a sus datos personales.</li>
            <li><strong>Derecho a la portabilidad:</strong> Recibir sus datos en un formato estructurado.</li>
            <li><strong>Derecho a la eliminación:</strong> Solicitar la eliminación de sus datos.</li>
            <li><strong>Derecho a retirar el consentimiento:</strong> En cualquier momento, con las limitaciones legales aplicables.</li>
            <li><strong>Quebec:</strong> Derecho a la desindexación y a que los datos de perfilado sean desactivados por defecto.</li>
          </ul>

          <h3 className="text-lg font-semibold text-text mt-4">7.4 Derechos bajo legislaciones de Latinoamérica</h3>
          <p>
            Los titulares en Colombia, Chile, Argentina, Perú y demás países de Latinoamérica tienen derechos equivalentes de acceso, rectificación, cancelación y oposición, conforme a la legislación de cada país.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">8. Cómo Ejercer sus Derechos</h2>
          <p>
            Para ejercer cualquiera de los derechos descritos, el titular puede:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Enviar un correo electrónico a: <strong>privacidad@avimo.travel</strong></li>
            <li>Utilizar el formulario de contacto en: <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
          </ul>
          <p>La solicitud debe incluir:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Nombre completo del titular.</li>
            <li>Correo electrónico asociado a la cuenta.</li>
            <li>Descripción clara del derecho que desea ejercer.</li>
            <li>Documentación que acredite la identidad del titular (cuando sea necesario).</li>
          </ul>
          <p>
            Avimo responderá a la solicitud en un plazo máximo de:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>México:</strong> 20 días hábiles (conforme a LFPDPPP).</li>
            <li><strong>California/EE.UU.:</strong> 45 días calendario (conforme a CCPA/CPRA).</li>
            <li><strong>Canadá:</strong> 30 días (conforme a PIPEDA).</li>
          </ul>
          <p>
            El ejercicio de los derechos ARCO es gratuito, aunque Avimo podrá cobrar los costos de reproducción o envío conforme al artículo 34 de la LFPDPPP.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">9. Medidas de Seguridad</h2>
          <p>
            Avimo ha implementado medidas de seguridad administrativas, técnicas y físicas para proteger los datos personales, conforme al artículo 18 de la LFPDPPP y estándares de la industria:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Cifrado de datos en tránsito (TLS 1.3) y en reposo.</li>
            <li>Contraseñas almacenadas con hashing seguro (bcrypt).</li>
            <li>Autenticación de dos factores disponible para todas las cuentas.</li>
            <li>Control de acceso basado en roles (RBAC) para datos internos.</li>
            <li>Monitoreo continuo de accesos y detección de anomalías.</li>
            <li>Copias de seguridad periódicas y cifradas.</li>
            <li>Infraestructura alojada en centros de datos certificados (Supabase).</li>
          </ul>
          <p>
            En caso de violación de seguridad de datos, Avimo notificará a los titulares y autoridades competentes conforme a los plazos establecidos por la legislación aplicable (72 horas para notificación regulatoria en jurisdicciones que lo requieran).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">10. Retención de Datos</h2>
          <p>
            Los datos personales se conservarán durante el tiempo necesario para cumplir con las finalidades para las que fueron recopilados:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Datos de cuenta:</strong> Mientras la cuenta esté activa y por 5 años después de su cancelación (para cumplir con obligaciones legales y fiscales).</li>
            <li><strong>Datos de transacciones:</strong> Por el período requerido por la legislación fiscal aplicable (mínimo 5 años en México conforme al CFF).</li>
            <li><strong>Datos de telemetría:</strong> Hasta 24 meses desde su recopilación.</li>
            <li><strong>Datos de chat:</strong> Hasta 12 meses después de la última interacción.</li>
            <li><strong>Cookies:</strong> Conforme a los plazos establecidos en la <Link to="/cookies" className="text-primary hover:underline">Política de Cookies</Link>.</li>
          </ul>
          <p>
            Una vez transcurridos los plazos de retención, los datos serán eliminados o anonimizados de forma segura.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">11. Menores de Edad</h2>
          <p>
            La Plataforma no está dirigida a menores de 18 años. Avimo no recopila intencionalmente datos personales de menores de edad. Si un padre o tutor detecta que un menor ha proporcionado datos personales a través de la Plataforma, puede solicitar su eliminación contactando a <strong>privacidad@avimo.travel</strong>.
          </p>
          <p>
            Para usuarios en EE.UU., Avimo cumple con la Children&apos;s Online Privacy Protection Act (COPPA) y no recopila datos de menores de 13 años sin consentimiento verificable de los padres.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">12. Decisiones Automatizadas y Perfilado</h2>
          <p>
            La Plataforma utiliza sistemas de inteligencia artificial y toma de decisiones automatizada para:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Generar itinerarios de viaje personalizados.</li>
            <li>Cualificar leads automáticamente en conversaciones de chat.</li>
            <li>Recomendar paquetes turísticos basados en el comportamiento del usuario.</li>
            <li>Detectar y prevenir fraude y abuso de la Plataforma.</li>
            <li>Aplicar el sistema de censura automatizado en el chat.</li>
          </ul>
          <p>
            El titular tiene derecho a oponerse al tratamiento de sus datos mediante sistemas de IA o toma de decisiones automatizada, conforme al artículo 26 de la LFPDPPP y disposiciones equivalentes en otras jurisdicciones. Para ejercer este derecho, contacte a <strong>privacidad@avimo.travel</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">13. Cambios a esta Política</h2>
          <p>
            Avimo se reserva el derecho de modificar esta Política de Privacidad en cualquier momento. Los cambios serán notificados mediante:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Un aviso visible en la Plataforma con al menos 15 días de antelación.</li>
            <li>Un correo electrónico a la dirección registrada del usuario.</li>
            <li>La actualización de la fecha de &ldquo;Última actualización&rdquo; al inicio de este documento.</li>
          </ul>
          <p>
            El uso continuado de la Plataforma después de la entrada en vigor de los cambios constituye aceptación de la nueva Política de Privacidad.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-text">14. Contacto</h2>
          <p>
            Para cualquier pregunta, queja o solicitud relacionada con esta Política de Privacidad o el tratamiento de sus datos personales:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Delegado de Protección de Datos (DPO):</strong> dpo@avimo.travel</li>
            <li><strong>Privacidad:</strong> privacidad@avimo.travel</li>
            <li><strong>Página de contacto:</strong> <Link to="/contact" className="text-primary hover:underline">/contact</Link></li>
          </ul>
        </section>

        <div className="mt-10 rounded-xl border border-border bg-surface p-6">
          <p className="text-xs text-text-muted">
            <strong>Aviso importante:</strong> Esta Política de Privacidad constituye el Aviso de Privacidad integral de la Plataforma Avimo, conforme al artículo 15 y 16 de la LFPDPPP 2025 de México, al CCPA/CPRA de California, al PIPEDA y Ley 25 de Canadá, y a las leyes de protección de datos aplicables en Latinoamérica (Colombia, Chile, Argentina, Perú y demás). Última revisión: 24 de septiembre de 2026. Se recomienda la revisión por parte de asesoría legal especializada antes de su publicación definitiva.
          </p>
        </div>
      </div>
    </div>
  );
}

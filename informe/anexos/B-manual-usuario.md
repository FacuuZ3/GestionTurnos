# Anexo B — Manual de Usuario

Este anexo describe el uso del sistema desde la perspectiva de los dos
roles principales: **Cliente** y **Administrador**. Se asume que el
sistema está instalado y en ejecución según el Anexo A.

## B.1 Manual del cliente

### B.1.1 Registro de cuenta

1. Acceder a `http://localhost:3000`.
2. En la barra superior, hacer clic en **"Registrarme"**.
3. Completar el formulario con nombre, email, contraseña (mínimo 8
   caracteres) y teléfono opcional.
4. Hacer clic en **"Crear cuenta"**.
5. Aparece un mensaje verde: *"Cuenta creada. Revisá tu email para
   verificar la cuenta."*

> **Nota.** En entorno de desarrollo, el correo no se envía
> efectivamente: el contenido se imprime en la consola del backend.
> Buscar la línea con el formato `http://localhost:3000/verify-email?token=...`
> y pegar esa URL en el navegador para activar la cuenta.

### B.1.2 Inicio de sesión

1. En la barra superior, hacer clic en **"Ingresar"**.
2. Ingresar email y contraseña.
3. Hacer clic en **"Ingresar"**.
4. El sistema redirige automáticamente a `/dashboard/user` (panel del
   cliente).

### B.1.3 Recuperación de contraseña

1. En la pantalla de login, hacer clic en **"Olvidé mi contraseña"**.
2. Ingresar el email asociado a la cuenta.
3. Hacer clic en **"Enviar enlace"**.
4. Buscar en la consola del backend la URL de reseteo
   (`http://localhost:3000/reset-password?token=...`) y pegarla en el
   navegador.
5. Ingresar nueva contraseña y confirmación.
6. Hacer clic en **"Cambiar contraseña"**.

### B.1.4 Reservar un turno

1. Estando autenticado, hacer clic en **"Reservar"** en la barra
   superior.
2. El sistema muestra la timeline horizontal de todas las canchas
   activas para el día actual.
3. Hacer clic en el botón **calendario** del header para cambiar la
   fecha. Los atajos "Hoy", "Mañana" y "Próx. semana" facilitan la
   navegación.
4. Hacer clic sobre un slot disponible (barra con borde verde
   punteado). Los slots ocupados (gris sólido) no son interactivos.
5. En el modal de confirmación, revisar cancha, fecha, horario y
   precio.
6. Opcionalmente, agregar observaciones en el campo libre.
7. Hacer clic en **"Confirmar reserva"**.
8. Si la operación es exitosa, el sistema redirige a "Mis reservas"
   donde la nueva reserva aparece como **"Próxima reserva"**.

### B.1.5 Cancelar una reserva

1. Acceder a **"Mis reservas"**.
2. En la card de la reserva (próxima o de otras próximas), hacer clic
   en **"Cancelar"**.
3. La reserva pasa al historial con badge **"Cancelada"** y el slot
   queda libre para otros usuarios.

> **Restricción.** Las reservas no pueden cancelarse dentro de las
> cuatro horas previas al inicio del turno. Para cancelaciones de
> último momento, contactar al complejo directamente.

### B.1.6 Editar perfil

1. Hacer clic en **"Mi cuenta"** en la barra superior.
2. En la card **"Datos personales"**, modificar nombre o teléfono.
3. Hacer clic en **"Guardar cambios"**.
4. Para cambiar la contraseña, completar la card **"Contraseña"** con
   la contraseña actual, la nueva y la confirmación. Hacer clic en
   **"Cambiar contraseña"**.

### B.1.7 Cerrar sesión

Hacer clic en **"Cerrar sesión"** en la barra superior. El sistema
redirige a la landing pública.

---

## B.2 Manual del administrador

### B.2.1 Acceso al panel administrativo

El administrador utiliza las credenciales `admin@padelturnos.local` /
`Admin123!` (o las configuradas en el seed). Al iniciar sesión, el
sistema redirige automáticamente a `/dashboard/admin`.

El panel se organiza en seis pestañas:

| Pestaña | Función |
|---|---|
| **Reservas** | Calendario operativo del día + lista agrupada de reservas |
| **Canchas** | CRUD de canchas |
| **Turnos fijos** | Gestión de bloqueos recurrentes semanales |
| **Estadísticas** | Dashboard con métricas operativas |
| **Club** | Edición de información institucional |
| **Auditoría** | Registro de acciones administrativas |

### B.2.2 Crear una reserva como administrador

1. En la pestaña **"Reservas"**, navegar al día deseado mediante las
   flechas del header del calendario o el selector de fecha.
2. Hacer clic sobre un slot disponible de cualquier cancha. Como
   administrador, no aplican las restricciones de anticipación mínima
   ni de cupo.
3. Confirmar la reserva en el modal.

### B.2.3 Reprogramar una reserva

1. En **"Reservas del día"**, ubicar la reserva en su sección
   correspondiente (Pendientes, Confirmadas, Reprogramadas o
   Canceladas).
2. Hacer clic en **"Reprogramar"**.
3. En el modal, seleccionar la nueva hora de inicio y fin.
4. Hacer clic en **"Confirmar cambio"**.

La reserva pasará a la sección "Reprogramadas" con la marca temporal
del cambio.

### B.2.4 Cancelar una reserva ajena

1. En **"Reservas del día"**, ubicar la reserva.
2. Hacer clic en **"Cancelar"**. La operación es inmediata; el
   administrador no está sujeto al plazo de cancelación.

### B.2.5 Confirmar una reserva pendiente

1. En la sección **"Pendientes de confirmación"**, hacer clic en
   **"Confirmar"** sobre la reserva.
2. La reserva pasa a la sección "Confirmadas".

### B.2.6 Crear una cancha nueva

1. En la pestaña **"Canchas"**, hacer clic en **"Nueva cancha"**.
2. Completar el modal: nombre, deporte, precio por hora y descripción
   opcional.
3. El switch **"Cancha habilitada"** debe estar activo para que la
   cancha aparezca disponible para los clientes.
4. Hacer clic en **"Crear cancha"**.

### B.2.7 Suspender una cancha

1. En la fila de la cancha, hacer clic en **"Suspender"**.
2. La cancha pasa a estado **"Suspendida"**: deja de aparecer en la
   landing y no acepta nuevas reservas, pero el historial queda
   preservado.

### B.2.8 Eliminar definitivamente una cancha

1. La cancha debe estar previamente suspendida.
2. Hacer clic en **"Eliminar"** sobre una cancha suspendida.
3. Aceptar el diálogo de confirmación.
4. La cancha y todas sus reservas históricas se eliminan en una
   operación atómica.

> **Advertencia.** Esta operación es irreversible. Para conservar el
> historial, utilizar **"Suspender"**.

### B.2.9 Crear un turno fijo (bloqueo recurrente)

1. En la pestaña **"Turnos fijos"**, hacer clic en **"Nuevo turno
   fijo"**.
2. Seleccionar cancha, día de la semana, hora de inicio y hora de
   fin.
3. Agregar observación opcional (ej.: *"Escuela de pádel"*).
4. Hacer clic en **"Crear turno fijo"**.

El bloqueo se aplica automáticamente a todas las semanas futuras.

### B.2.10 Liberar un turno fijo

En la pestaña **"Turnos fijos"**, hacer clic en **"Liberar"** sobre
el bloqueo. A partir de ese momento el slot vuelve a estar disponible
para reservas.

### B.2.11 Consultar estadísticas

En la pestaña **"Estadísticas"**, el dashboard muestra:

- **KPIs** en cuatro cards: reservas confirmadas, facturación
  estimada, ocupación promedio, clientes únicos.
- **Gráfico de barras**: facturación por cancha.
- **Heatmap**: popularidad por día y horario.
- **Barras de ocupación**: porcentaje de horas reservadas por cancha.
- **Tabla**: top cinco clientes por cantidad de reservas.

El selector superior derecho permite cambiar el rango temporal
(7, 30 o 90 días).

### B.2.12 Editar información del club

1. En la pestaña **"Club"**, modificar los campos: dirección, URL del
   mapa, horarios y servicios.
2. Para la URL del mapa, copiar el atributo `src` del iframe de
   Google Maps (Compartir → Insertar un mapa).
3. Los servicios se ingresan uno por línea. Si el nombre coincide con
   una de las categorías reconocidas (Wi-Fi, Vestuario, Bar, etc.),
   se asignará un ícono automáticamente en la landing.
4. Hacer clic en **"Guardar cambios"**.

### B.2.13 Consultar la auditoría

En la pestaña **"Auditoría"**, el sistema muestra las últimas cien
acciones administrativas registradas, con:

- Verbo HTTP coloreado (POST en verde, PATCH en ámbar, DELETE en
  rojo).
- Recurso afectado y su identificador.
- Email del administrador que ejecutó la acción.
- Dirección IP de origen.
- Tiempo relativo y timestamp exacto.

---

## B.3 Modo claro / modo oscuro

El sistema soporta ambos modos. El selector se encuentra en la barra
superior, representado con un ícono de sol (en modo oscuro) o de luna
(en modo claro). La preferencia se persiste localmente y se aplica a
todas las páginas, incluido el calendario.

Por defecto, el sistema utiliza la preferencia del sistema operativo.

---

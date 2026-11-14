# Mi Entrega UTM

Aplicación web para llevar el control de tareas, entregas con foto y puntos.
HTML5 + CSS3 + JavaScript vanilla, sin librerías y sin servidor.

## Estructura

```
mi-entrega-utm/
├── separado/
│   ├── index.html      Estructura de las 7 pantallas (secciones <section class="vista">)
│   ├── style.css       Estilos, primero celular, con media queries a 700 px y 1024 px
│   └── script.js       Toda la lógica (9 secciones, ver el comentario al inicio)
├── autocontenido/
│   └── index.html      Lo mismo en un solo archivo (CSS en <style>, JS en <script>)
├── generar-autocontenido.ps1   Vuelve a armar autocontenido/ desde separado/
└── README.md
```

**Modos de visualización:** el selector del encabezado cambia entre ☀ Día, ⛅ Medio día y ☾ Noche.
Cada modo solo redefine las variables de color al inicio de `style.css` (`:root[data-tema="..."]`).
La elección se guarda en `localStorage` (`meu_tema`). Si nunca se eligió uno, se usa el modo claro u oscuro del sistema.

Las reglas de puntos están en las constantes al inicio de `script.js` (sección 1).
Si cambias un valor ahí, cambian los cálculos, los textos y la tabla de reglas.

**Dónde vive cada dato**

| Dato | Lugar | Clave |
|---|---|---|
| Usuarios (sal + hash) | localStorage | `meu_usuarios` |
| Sesión activa | localStorage | `meu_sesion` |
| Materias, tareas, eventos, puntos, logros y rango | localStorage | `meu_datos_<usuario>` |
| Fotos (Blob) | IndexedDB `mi-entrega-utm`, almacén `fotos` | `usuario:tarea:timestamp` |

## Cómo abrirla

- **Versión autocontenida:** doble clic en `autocontenido/index.html` (Chrome, Edge o Firefox recientes).
- **Versión separada:** doble clic en `separado/index.html`, o mejor, sírvela desde un servidor local
  (por ejemplo, la extensión Live Server de VS Code).
- Si editas `separado/`, regenera la otra versión desde PowerShell:
  `powershell -ExecutionPolicy Bypass -File .\generar-autocontenido.ps1`

## Decisiones de diseño

- **Retraso:** se cuenta desde la fecha límite. Si es de 2 h o menos, no hay penalización y la entrega cuenta como a tiempo.
  Si es mayor, se restan 20 puntos por cada 24 h o fracción (3 h de retraso = −20, 25 h = −40), con mínimo de 0 puntos por tarea.
- **Rango:** baja en cuanto los puntos quedan por debajo del mínimo del rango y sube al llegar al mínimo del siguiente + 10.
- **Semana sin atrasos:** se desbloquea cuando tu racha actual de entregas a tiempo empezó hace 7 días o más.
- **Reabrir una tarea** no borra nada: agrega el evento "reabierta" y un movimiento negativo que revierte los puntos de esa entrega.
- **Eliminar una materia** la oculta, pero sus tareas y eventos se conservan en la bitácora.
- **Eliminar una tarea** (solo pendientes) la quita de Inicio, Materias y recordatorios sin cambiar los puntos; queda en la bitácora con estado "eliminada". Una tarea entregada se reabre primero para revertir sus puntos.
- **Logos de rango:** cada rango tiene un logo SVG dibujado en `script.js` (escudo, medalla, trofeo, diamante y corona), sin imágenes externas.
- Las tareas entregadas no se editan; primero hay que reabrirlas, y cada edición queda como evento "corregida".

## Limitaciones

- **No es seguridad real.** Las contraseñas usan SHA-256 con sal solo para no guardarlas en texto plano.
  Cualquiera con acceso al navegador puede leer o cambiar los datos.
- Los datos solo existen en ese navegador y en ese equipo. Si borras los datos del sitio, se pierden.
- La "hora de captura" es la fecha de última modificación del archivo (`File.lastModified`), no el dato EXIF de la cámara.
- La foto repetida se detecta solo si es el mismo archivo byte por byte. Si la recortas o la vuelves a guardar, la huella cambia.
- La exportación JSON incluye las huellas, pero no las fotos.
- Si IndexedDB no está disponible (algunos modos privados), la app avisa y no permite entregar.
- Si localStorage o `crypto.subtle` no están disponibles, la app muestra un aviso y no puede funcionar.
- Los recordatorios (Notification API, sin servidor ni costo) solo se envían con la pestaña abierta; con el navegador cerrado no hay forma de avisar sin un servidor. Avisan una vez por tarea cuando faltan menos de 24 h (`HORAS_AVISO`).
- Las notificaciones del sistema piden `localhost` o `https`; si abres el archivo con doble clic (`file://`), el navegador puede bloquearlas y solo verás el aviso dentro de la app.
- Las autopruebas de las reglas corren al cargar la página; si alguna falla, aparece un error en la consola (F12).

## Pruebas manuales

1. **Crear cuenta:** abre la app por primera vez y verás Registro. Prueba un usuario de 2 letras y luego contraseñas distintas: debe salir un error para cada caso. Después crea la cuenta correctamente y debes llegar a Inicio con Bronce y 0 puntos.
2. **Crear materia:** sin materias, pulsa "+ Agregar tarea" y la app te enviará a Materias. Intenta guardar con el nombre vacío (debe salir un error) y luego crea "Programación Web" con un color.
3. **Crear tarea:** pon una fecha límite anterior a la de asignación y verás un error. Después crea tareas con límites en 5 días (verde), 2 días (amarillo), hoy (rojo) y ayer (rojo, "Vencida"). En Inicio deben aparecer ordenadas por fecha límite.
4. **Entregar a tiempo:** entrega la tarea de 5 días con una foto. El resumen debe mostrar el margen, sin penalización, +50 y +30. Al confirmar debes ver el aviso con las reglas aplicadas y el logro "Primera entrega a tiempo".
5. **Entregar tarde:** entrega la tarea vencida. El resumen debe mostrar la penalización (−20 por cada 24 h) y la racha debe volver a 0.
6. **Bajar de rango:** junta 110 puntos o más para subir a Plata. Después, en Materias, reabre una entrega para que el total baje de 100. Debe aparecer "Bajaste de Plata a Bronce…" con el motivo, en Inicio y en Rangos.
7. **Subir la misma foto dos veces:** entrega otra tarea con el mismo archivo. Antes de confirmar debe salir la advertencia ⚠, y en Bitácora → Revisión las dos tareas deben aparecer con "Huella repetida".
8. **Exportar la bitácora:** en Bitácora pulsa "Exportar bitácora (JSON)". Se descarga `bitacora-<usuario>-<fecha>.json` con tareas, eventos y movimientos de puntos.
9. **Sesión:** recarga la página y debes seguir dentro. Cierra sesión, entra con una contraseña incorrecta (debe salir un error) y después con la correcta.
10. **Modos:** cambia entre Día, Medio día y Noche. Todas las pantallas cambian de color y, al recargar, se mantiene el último modo elegido.
11. **Recordatorios:** crea una tarea con límite en 1 hora. Al guardar debe salir el aviso rojo "⏰ Recordatorio". Pulsa "Activar notificaciones" en Inicio, acepta el permiso y crea otra tarea con límite en 2 horas: debe aparecer una notificación del sistema. Se revisa cada minuto con la pestaña abierta.
12. **Eliminar una tarea:** crea una tarea de prueba y pulsa "Eliminar" en Inicio. Tras confirmar, desaparece de Inicio y de Materias y tus puntos no cambian. En Bitácora, con el filtro "Eliminada", aparece con el evento "eliminada". Las tareas entregadas no muestran "Eliminar" hasta reabrirlas.

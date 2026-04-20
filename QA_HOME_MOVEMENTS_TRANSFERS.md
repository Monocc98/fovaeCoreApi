# QA Home, Movements y Transfers

## Alcance
Este checklist valida el flujo funcional entre:

- `POST /api/movements`
- `PUT /api/movements/:idMovement`
- `DELETE /api/movements/:idMovement`
- `GET /api/movements/account/:idAccount`
- `POST /api/transfers`
- `GET /api/transfers/company/:idCompany`
- `GET /api/home`
- `GET /api/home/budget-vs-actual`
- `GET /api/home/buckets-summary`

La validacion esta alineada al comportamiento actual del backend:

- `Home` trabaja con el año fiscal vigente por company.
- `Home` excluye movimientos con `source = "TRANSFER"` de balance, ingresos y egresos.
- Una transferencia crea 2 movimientos espejo: salida en `fromAccount` y entrada en `toAccount`.
- El detalle de cuenta si debe reflejar esos movimientos de transferencia.

## Preparacion minima
Crear esta base de datos de prueba antes de ejecutar los casos:

1. Un usuario con membresia a una company.
2. Un group con 1 company.
3. Un año fiscal vigente para esa company:
   - `startDate`: `2026-01-01`
   - `endDate`: `2026-12-31`
4. Dos cuentas en la misma company:
   - Cuenta A: `Caja Operativa`
   - Cuenta B: `Banco Inversion`
5. Categorias y subcategorias con bucket valido:
   - `Ventas` -> bucket `INCOME`
   - `Nomina` -> bucket `FIXED_EXPENSE`
   - `Marketing` -> bucket `VARIABLE_EXPENSE`
   - `Familia socios` -> bucket `FAMILY`
   - `Varios` -> bucket `OTHER`
6. Una tercera cuenta en otra company para probar errores cross-company.

## Dataset base recomendado
Usar estos movimientos manuales en la Cuenta A dentro del FY 2026:

1. Ingreso `+10000` el `2026-02-10` en bucket `INCOME`
2. Egreso `-3000` el `2026-02-11` en bucket `FIXED_EXPENSE`
3. Egreso `-1200` el `2026-02-12` en bucket `VARIABLE_EXPENSE`
4. Egreso `-500` el `2026-02-13` en bucket `FAMILY`
5. Egreso `-300` el `2026-02-14` en bucket `OTHER`

Resultado esperado base en `Home` para la company:

- `ingresos = 10000`
- `egresos = 5000`
- `balance = 5000`

Resultado esperado base en `buckets-summary`:

- `ingresos = 10000`
- `egresosFijos = 3000`
- `egresosVariables = 1200`
- `family = 500`
- `other = 300`
- `total = 5000`
- `unmappedCount = 0`

## Casos criticos

### HM-01 Alta de movimiento positivo dentro del FY
- Accion: crear movimiento manual `+2500` en Cuenta A con fecha `2026-03-01`.
- Esperado en `GET /api/movements/account/:idAccount`: aparece el movimiento y el balance de la cuenta sube `+2500`.
- Esperado en `GET /api/home`: `company.ingresos` sube `+2500`, `company.balance` sube `+2500`.
- Esperado en frontend: card o tabla de Home refleja el nuevo total sin signos invertidos.

### HM-02 Alta de movimiento negativo dentro del FY
- Accion: crear movimiento manual `-800` en Cuenta A con fecha `2026-03-02`.
- Esperado en detalle de cuenta: aparece el movimiento con monto negativo.
- Esperado en `GET /api/home`: `company.egresos` sube `800`, `company.balance` baja `800`.
- Esperado en frontend: egresos se muestran como magnitud positiva en resumen y como negativo en detalle de cuenta si esa es la convención visual.

### HM-03 Movimiento fuera del FY actual
- Accion: crear movimiento manual `+900` en Cuenta A con fecha `2025-12-31`.
- Esperado en `GET /api/movements/account/:idAccount`: no debe aparecer si la consulta esta filtrada al FY vigente.
- Esperado en `GET /api/home`: no modifica `balance`, `ingresos` ni `egresos`.
- Riesgo que valida: el Home usa `fyStart` y `fyEnd` activos, no todo el historico.

### HM-04 Borde inferior del FY
- Accion: crear movimiento con fecha exacta `2026-01-01`.
- Esperado: si entra en `Home`.

### HM-05 Borde superior del FY
- Accion: crear movimiento con fecha exacta `2026-12-31`.
- Esperado: depende de como llegue la fecha al backend, pero con el filtro actual `occurredAt < fyEnd` conviene validar si entra o queda fuera.
- Criterio QA: confirmar con dato real si `endDate` se almacena a medianoche. Este caso debe quedar documentado porque puede generar off-by-one.

### HM-06 Actualizacion de movimiento
- Accion: editar el ingreso `+10000` y cambiarlo a `+12000`.
- Esperado en detalle de cuenta: el movimiento actualizado conserva su id.
- Esperado en `GET /api/home`: `ingresos` sube `+2000`, `balance` sube `+2000`.
- Esperado en frontend: no debe duplicarse la fila; debe verse el valor actualizado.

### HM-07 Cambio de categoria que cambia bucket
- Accion: editar un movimiento de `VARIABLE_EXPENSE` a `FIXED_EXPENSE`.
- Esperado en `GET /api/home/buckets-summary`: baja en `egresosVariables` y sube en `egresosFijos` por el mismo monto.
- Esperado en `GET /api/home`: `balance`, `ingresos` y `egresos` no cambian si el monto es el mismo.

### HM-08 Eliminacion de movimiento
- Accion: borrar el movimiento `-300`.
- Esperado en detalle de cuenta: desaparece.
- Esperado en `GET /api/home`: `egresos` baja `300`, `balance` sube `300`.
- Esperado en frontend: la suma total y los subtotales se recalculan sin refresh manual duro.

### HM-09 Movimiento con bucket faltante o clasificacion incompleta
- Accion: insertar un movimiento con arbol de categoria que no llegue a `cat.bucket`.
- Esperado en `GET /api/home/buckets-summary`: `unmappedCount` aumenta.
- Esperado en frontend: debe mostrarse alerta, badge o al menos no romper la tabla.

### HM-10 Movimiento con monto cero
- Accion: intentar crear movimiento con `amount = 0`.
- Esperado actual del backend: `400` con error de monto faltante.
- Nota: esto es comportamiento actual, no necesariamente comportamiento deseado.

## Transferencias

### TR-01 Transferencia valida entre dos cuentas de la misma company
- Accion: crear transferencia de `1000` desde Cuenta A hacia Cuenta B en fecha `2026-03-05`.
- Esperado en `POST /api/transfers`: se crea 1 transfer y 2 movements.
- Esperado en detalle de Cuenta A: aparece movimiento `OUT` por `-1000`.
- Esperado en detalle de Cuenta B: aparece movimiento `IN` por `+1000`.
- Esperado en `GET /api/transfers/company/:idCompany`: se lista la transferencia con ambas cuentas.
- Esperado en `GET /api/home`: no cambia `company.balance`, `company.ingresos` ni `company.egresos`.
- Esperado en frontend: la cuenta origen baja y la destino sube en vistas de detalle, pero Home general queda igual.

### TR-02 Transferencia con misma cuenta origen y destino
- Accion: enviar `fromAccount = toAccount`.
- Esperado: `400` con mensaje `fromAccount and toAccount must be different`.

### TR-03 Transferencia entre companies distintas
- Accion: enviar Cuenta A y cuenta de otra company.
- Esperado: `400` con mensaje `Accounts belong to different companies`.

### TR-04 Transferencia con monto negativo o cero
- Accion: probar `amount = 0` y `amount = -1`.
- Esperado: `400` con mensaje `Amount must be greater than 0`.

### TR-05 Idempotencia
- Accion: enviar dos veces la misma transferencia con el mismo `idempotencyKey`.
- Esperado: la segunda respuesta regresa la misma transferencia y `idempotentReplay = true`.
- Esperado en BD: no debe haber duplicado de transfer ni duplicado de movimientos.
- Esperado en frontend: no deben aparecer dos registros iguales tras reintento por timeout.

### TR-06 Orden visual de movimientos de transferencia
- Accion: consultar `GET /api/transfers/:idTransfer`.
- Esperado: vienen dos movimientos, uno `OUT` y uno `IN`.
- Esperado en frontend: las etiquetas visuales origen/destino coinciden con el signo del monto.

## Home y agregaciones

### HO-01 Home overview base
- Accion: consultar `GET /api/home` con el dataset base.
- Esperado:
  - el usuario autenticado existe en la respuesta
  - el group contiene la company
  - la company contiene `fiscalYear`
  - la company contiene `accounts`
  - la company contiene `balance`, `ingresos`, `egresos`

### HO-02 Suma por company
- Accion: tener movimientos en Cuenta A y Cuenta B dentro del mismo FY.
- Esperado: `company.balance` es la suma de balances de ambas cuentas.
- Esperado: `company.ingresos` y `company.egresos` suman ambas cuentas.

### HO-03 Suma por group
- Accion: agregar una segunda company al mismo group con datos propios.
- Esperado: `group.balance`, `group.ingresos` y `group.egresos` son la suma de sus companies.

### HO-04 Company sin FY vigente
- Accion: quitar el fiscal year vigente o dejar fechas fuera de rango.
- Esperado en `GET /api/home`: revisar comportamiento real, porque el overview no filtra por fecha si `fyStart` es `null`.
- Riesgo: hoy podria sumar historico completo si la company no tiene FY vigente.

### HO-05 Buckets summary con dataset base
- Accion: consultar `GET /api/home/buckets-summary`.
- Esperado: coincide exactamente con los montos calculados en la seccion "Dataset base recomendado".

### HO-06 Budget vs actual
- Accion: cargar presupuesto del FY y consultar `GET /api/home/budget-vs-actual`.
- Esperado: `budgetLocked`, `budgetTotal`, `actualTotal` y `budgetVsActual` deben corresponder al mismo FY vigente.
- Esperado en frontend: grafica y tabla mensual muestran 12 posiciones fiscales y diferencias correctas.

## Frontend

### FE-01 Consistencia de signos
- En Home: ingresos y egresos deben mostrarse con signo visual consistente.
- En detalle de cuenta: los egresos deben seguir viendose como salida real y las transferencias como `IN/OUT`.

### FE-02 Refresco post-operacion
- Tras crear, editar o eliminar movimiento, el Home debe refrescar los totales correctos.
- Tras crear transferencia, solo deben cambiar las vistas de cuentas y transferencias; el Home agregado debe quedar igual.

### FE-03 Datos vacios
- Si una company no tiene cuentas o no tiene movimientos, Home debe renderizar en cero y no romper cards, tablas ni graficas.

### FE-04 Año fiscal visible
- La vista debe mostrar el FY correcto de la company que el backend esta usando.
- Si no hay FY vigente, el frontend debe avisarlo en lugar de simular un periodo falso.

### FE-05 Unmapped bucket
- Si `unmappedCount > 0`, el frontend debe visibilizarlo.
- No debe ocultar silenciosamente movimientos mal clasificados.

## Casos de regresion recomendados

### RG-01 Importacion no debe duplicar movimientos existentes
- Subir dos veces el mismo archivo de importacion.
- Esperado: por `account + source + externalNumber` no se insertan duplicados.

### RG-02 Transferencia importada no debe inflar Home
- Si la importacion detecta una transferencia interna y crea transfer, el Home no debe aumentar ni ingresos ni egresos.

### RG-03 Cambio de FY
- Cambiar el FY vigente de la company y volver a consultar Home.
- Esperado: Home recalcula solo con movimientos del nuevo FY vigente.

## Hallazgos y riesgos detectados en el codigo

1. `Home` excluye transferencias del resumen general, lo cual es correcto para evitar doble conteo interno.
2. `GET /api/movements/account/:idAccount` si incluye transferencias; por eso detalle de cuenta y Home no van a coincidir exactamente, y eso debe asumirse en QA.
3. Movimiento con `amount = 0` hoy responde como error de monto faltante, no como "monto invalido".
4. El borde del fin de año fiscal merece prueba puntual porque el filtro usa `< fyEnd`.
5. Si una company no tiene FY vigente, el overview principal puede terminar mezclando historico completo; ese caso necesita validacion funcional explicita.

## Criterio de salida
Se puede considerar el flujo como aprobado cuando:

1. Todos los casos `HM`, `TR` y `HO` pasan.
2. Ninguna transferencia altera los agregados de `Home`.
3. Los totales del frontend coinciden con las respuestas del backend.
4. Los cambios de FY modifican los resultados exactamente como se espera.
5. Los errores de validacion regresan `400` con mensajes consistentes y sin romper UI.

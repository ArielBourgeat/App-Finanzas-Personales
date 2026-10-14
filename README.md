# Finanzas personales

App de finanzas en HTML, CSS y JavaScript. Sirve para registrar cuentas bancarias, ingresos, gastos, deudas, fechas de pago y ver reportes. No hay servidor ni base de datos: **todo se guarda en el navegador de este dispositivo**.

Aunque esté publicada en GitHub Pages, GitHub no ve tus números. Si cerrás la pestaña y volvés a entrar por la misma URL, los datos siguen.

---

## Cómo se guarda la información

- Se usa `localStorage` del navegador (clave `finanzas-app-v1`).
- Cada celular, computadora o perfil de Chrome tiene su propia copia.
- Safari y “Agregar a pantalla de inicio” en iPhone usan el mismo origen (`tuusuario.github.io`), así que conviene entrar siempre por la misma URL.
- Si borrás los datos del sitio o el historial del navegador, se pierde todo. Por eso hay **Exportar backup** en Ajustes.
- No abras el `index.html` como archivo (`file://`). Los scripts necesitan un servidor o GitHub Pages.

---



## Primera vez: el setup (5 pasos)

Al entrar por primera vez aparece un asistente. Después se puede cambiar casi todo en **Ajustes**.

1. **Nombre y moneda**
  Cómo te saluda la app y en qué moneda se muestran los montos (ARS, USD, EUR, etc.).
2. **Dónde tenés el dinero**
  Cuentas de banco, Mercado Pago, efectivo, etc. Elegí bancos sugeridos o agregá los tuyos, y cargá el **saldo actual** de cada uno.  
   **Te queda** se calcula desde acá.
3. **Qué querés manejar**
  Activá o desactivá: gastos, ingresos, presupuestos, deudas, fechas de pago e ingresos próximos, reportes, predicción. Lo que desactives se oculta del menú.
4. **Categorías de gastos**
  Supermercado, transporte, alquiler, ocio, etc. Desmarcá las que no uses o sumá una propia.
5. **Ingreso fijo (opcional)**
  Si cobrás un sueldo un día fijo del mes, la app lo muestra como **ingreso próximo** hasta que lo registres.

Cuando terminás, vas al panel. Si querés repetir el setup: Ajustes → **Borrar todo** (borra también los movimientos).

---



## Qué se puede hacer



### Cuentas (primera sección)

El dinero “vive” en las cuentas, no en el resumen del mes.

**Agregar una cuenta**

1. En **Inicio**, sección **Cuentas**.
2. Nombre (ej. Galicia, Mercado Pago) y saldo actual.
3. **Agregar cuenta**.

**Elegir un banco**

- Chip **Todas**: ves el conjunto.
- Chip o nombre de un banco: ingresos, gastos, gráficos, movimientos y **Te queda** quedan filtrados a esa cuenta.

**Ajustar el saldo**

- Con el valor visible, editá el número en la tarjeta de la cuenta. Eso corrige el saldo a mano (por ejemplo si el banco no coincide).
- Un **gasto** restado a esa cuenta baja el saldo; un **ingreso** lo sube.

**Quitar una cuenta**

- Botón ✕ en la tarjeta. Los movimientos no se borran; dejan de estar atados a esa cuenta.

---



### Te queda

**Te queda** es el saldo real después del análisis:

- **Todas**: suma de los saldos de tus cuentas.
- **Un banco**: saldo de esa cuenta, ya descontados/sumados los movimientos.

No es “ingresos del mes menos gastos del mes”. Esos dos números siguen en las otras tarjetas, para ver el flujo del mes.

**Ocultar el valor**

- En la tarjeta **Te queda**, botón **Ocultar**.
- O en **Ajustes** → Privacidad → *Ocultar “Te queda” y saldos de cuentas*.
- Cuando está oculto se muestra `$****`, nunca `$0,00`.
- **Mostrar** vuelve a dejar los números a la vista.

---



### Cargar un movimiento

En computadora el formulario está a la izquierda. En el celular, el botón **+**.

1. Elegí **Gasto** o **Ingreso**.
2. Poné el monto.
3. Elegí la categoría.
4. Si hay cuentas, elegí **de qué banco** sale o entra el dinero.
5. Fecha de consumo / movimiento.
6. Opcional: **fecha de pago** (si pagás con tarjeta: consumís un día y pagás otro).
7. Nota opcional.
8. **Agregar**.

Eso:

- aparece en **Movimientos del mes**;
- actualiza ingresos o gastos del mes;
- actualiza el saldo de la cuenta elegida y **Te queda**.

**Editar o borrar:** lápiz en el movimiento. Cambiar monto o cuenta también recalcula el saldo del banco.

Filtros de la lista: Todas, Gastos, Ingresos, **A pagar** (gastos con fecha de pago futura).

Mes: flechas ‹ › en el encabezado para ver otro mes.

---



### Gráficos y presupuestos

- **Gastos por categoría**: dona del mes (o de la cuenta seleccionada).
- **Últimos 6 meses**: barras de gastos.
- **Presupuestos**: tope por categoría. Si te pasás, la tarjeta se marca en naranja.
- **Predicción del mes**: estima gastos al ritmo actual y cómo cerraría el mes.

---



### Reportes

Pestaña **Reportes**. Períodos:


| Período | Qué muestra                |
| ------- | -------------------------- |
| Diario  | El día elegido             |
| Semanal | Lunes a domingo            |
| Mensual | El mes                     |
| Anual   | El año, con barras por mes |


Flechas para ir al período anterior o siguiente. Si tenés un banco seleccionado en Inicio, el reporte también se filtra a esa cuenta.

---



### Deudas

Pestaña **Deudas**.

1. Nombre (tarjeta, préstamo, cuota).
2. Monto total, saldo actual (si lo dejás vacío usa el total), fecha de vencimiento, nota.
3. **Agregar deuda**.

**Registrar pago:** poné el importe y confirmá. Baja el saldo de la deuda y crea un gasto. Si hay cuentas, descuenta de la cuenta seleccionada (o de la primera).

---



### Próximos (ingresos y pagos)

Pestaña **Próximos**.

Podés cargar:

- **Ingreso próximo** (sueldo que está por llegar);
- **Fecha de pago**;
- **Gasto esperado**.

Opcional: *Se repite cada mes*.

La app también arma ítems sola:

- el sueldo del setup, si todavía no lo registraste este mes;
- gastos con **fecha de pago** futura.

**Ya ocurrió** lo pasa a movimientos y mueve el saldo de la cuenta.

---



### Ajustes

- Nombre y moneda.
- Ocultar Te queda / saldos.
- Qué módulos mostrar.
- Ingreso fijo (nombre, monto, día del mes).
- **Exportar backup**: baja un JSON. Guardalo en Drive o en el celular.
- **Importar backup**: restaura ese archivo en este dispositivo.
- **Borrar todo**: vuelve al setup vacío.

---



## Cómo se relacionan las piezas

```
Cuentas (saldos)
    ↑
Movimientos (gasto resta / ingreso suma)  ←  categoría, fecha, banco
    ↓
Te queda = suma de cuentas (o la cuenta elegida)

Mes → ingresos, gastos, gráficos, presupuestos, predicción
Deudas y Próximos → pueden generar movimientos
```

---



## Publicar en GitHub Pages

La app es estática: no hace falta build.

1. Subí el repo a GitHub.
2. **Settings → Pages → Deploy from a branch** → `main` / `/ (root)`.
3. En uno o dos minutos queda en:
  `https://TU_USUARIO.github.io/FinanceManagement/`

Usá siempre la URL con la barra final. Entrá por HTTPS (Pages ya lo da).

### iPhone (Safari)

1. Abrí la URL de Pages en **Safari** (no en Chrome).
2. **Compartir → Agregar a pantalla de inicio**.
3. Se abre como app (PWA), sin barra del navegador.

---



## Probar en la computadora

Hace falta un servidor local (no el archivo suelto):

```powershell
cd "C:\Users\ariel\OneDrive\Documentos\Proyectos Web\FinanceManagement"
npx --yes serve . -p 4173
```

O con Python, si lo tenés:

```powershell
python -m http.server 4173
```

Después: [http://127.0.0.1:4173/](http://127.0.0.1:4173/)

---



## Estructura del proyecto


| Archivo                   | Para qué                                                      |
| ------------------------- | ------------------------------------------------------------- |
| `index.html`              | Pantallas: setup, inicio, reportes, deudas, próximos, ajustes |
| `css/styles.css`          | Tema oscuro y layout (celular y escritorio)                   |
| `js/storage.js`           | Guardar / leer / exportar en `localStorage`                   |
| `js/charts.js`            | Gráficos en canvas (sin librerías)                            |
| `js/app.js`               | Lógica de la app                                              |
| `manifest.json` + `sw.js` | PWA e iPhone                                                  |
| `icons/`                  | Ícono para pantalla de inicio                                 |


Hecho solo con HTML, CSS y JS. Sin frameworks ni backend.
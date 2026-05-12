# API Iterator

API Iterator es una app de escritorio tipo “mini Postman” construida con Electron, React, TypeScript y Vite. La primera versión está enfocada en requests `GET`, environments locales y un Iterator que ejecuta una request por cada fila de un CSV.

## Funcionalidades incluidas

- Crear, editar y guardar requests `GET`.
- Configurar URL, headers y query params como pares key/value.
- Ejecutar una request individual y ver status code, tiempo, headers y body formateado como JSON cuando aplica.
- Crear environments locales con variables key/value.
- Usar variables con sintaxis `{{variable}}` en URL, headers y query params.
- Marcar variables sensibles y alternar ocultar/mostrar valores.
- Cargar CSV en Iterator y exponer cada fila como variables por iteración.
- Ejecutar una request guardada N veces según las filas del CSV.
- Configurar delay entre requests y detener la ejecución.
- Ver resultados en tabla con iteración, variables, URL final, status, tiempo, OK/Error y mensaje.
- Exportar resultados a JSON o CSV y guardar errores por separado.

## Requisitos

- Node.js 20 o superior.
- npm 10 o superior.

## Instalación

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

El comando compila el proceso principal de Electron, levanta Vite para React y abre la ventana de escritorio.

## Crear build local

```bash
npm run build
```

El renderer se genera en `dist-renderer/` y el proceso Electron en `dist-electron/`.

## Estructura de carpetas

```text
.
├── electron/
│   ├── main.ts          # Ventana, persistencia JSON local, ejecución HTTP y guardado de archivos
│   └── preload.ts       # API segura expuesta al renderer con contextBridge
├── src/
│   ├── components/      # Componentes reutilizables de UI
│   ├── shared/          # Tipos compartidos entre Electron y React
│   ├── utils/           # CSV, variables y preparación de requests
│   ├── main.tsx         # Aplicación React: Requests, Environments e Iterator
│   └── styles.css       # Estilos de la interfaz
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.electron.json
└── vite.config.ts
```

## Persistencia local

Los requests y environments se guardan como JSON en el directorio `userData` de Electron del sistema operativo. No hay login, nube ni sincronización remota.

## Ejemplo rápido

1. Crea un environment con estas variables:
   - `account`
   - `VTEX_APP_KEY`
   - `VTEX_APP_TOKEN`
2. Crea una request GET:
   - URL: `https://{{account}}.vtexcommercestable.com.br/api/oms/pvt/orders/{{orderId}}`
   - Headers: `X-VTEX-API-AppKey: {{VTEX_APP_KEY}}` y `X-VTEX-API-AppToken: {{VTEX_APP_TOKEN}}`
3. Carga un CSV:

```csv
orderId
123456
987654
```

4. Ejecuta Iterator para obtener una fila de resultado por cada `orderId`.

## Alcance no incluido todavía

- Métodos POST/PUT/DELETE.
- Autenticaciones complejas.
- Cloud sync.
- Workspaces colaborativos.
- Scripts pre-request/post-response.
- Test assertions avanzadas.

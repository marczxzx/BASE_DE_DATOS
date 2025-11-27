<div align="center">
<table>
    <thead>
        <tr>
            <th>
                <img src="https://github.com/RodrigoStranger/imagenes-la-salle/blob/main/logo_secundario_color.png?raw=true" width="150"/>
            </th>
            <th>
                <span style="font-weight:bold;">UNIVERSIDAD LA SALLE DE AREQUIPA</span><br />
                <span style="font-weight:bold;">FACULTAD DE INGENIERÍAS Y ARQUITECTURA</span><br />
                <span style="font-weight:bold;">DEPARTAMENTO ACADEMICO DE INGENIERÍA Y MATEMÁTICAS</span><br />
                <span style="font-weight:bold;">CARRERA PROFESIONAL DE INGENIERÍA DE SOFTWARE</span>
            </th>
        </tr>
    </thead>
</table>
</div>

<div align="center">
  <h2 style="font-weight:bold;">SOCIAL GRAPH ANALYZER - FRONTEND</h2>
</div>

## Tecnologías utilizadas
[![React][React]][react-site]
[![TypeScript][TypeScript]][typescript-site]
[![Vite][Vite]][vite-site]
[![Tailwind][Tailwind]][tailwind-site]
[![Node.js][Nodejs]][nodejs-site]
[![Mapbox][Mapbox]][mapbox-site]

[React]: https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black
[react-site]: https://react.dev/

[TypeScript]: https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white
[typescript-site]: https://www.typescriptlang.org/

[Vite]: https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white
[vite-site]: https://vitejs.dev/

[Tailwind]: https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white
[tailwind-site]: https://tailwindcss.com/

[Nodejs]: https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white
[nodejs-site]: https://nodejs.org/

[Mapbox]: https://img.shields.io/badge/Mapbox-000000?style=for-the-badge&logo=mapbox&logoColor=white
[mapbox-site]: https://www.mapbox.com/


## Cómo Iniciar el Proyecto en Local

Para ejecutar el proyecto en un entorno de desarrollo local, sigue estos pasos:

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu_usuario/social-graph-analyzer.git
   cd social-graph-analyzer/frontend
   ```

2. **Instalar las dependencias**:
   Asegúrate de tener [Node.js](https://nodejs.org/) instalado (versión 18 o superior recomendada). Luego, instala las dependencias del proyecto usando npm:
   ```bash
   npm install
   ```

3. **Configurar las variables de entorno**:
   Crea un archivo `.env` en la raíz del directorio `frontend` con las siguientes variables:
   ```env
   # URL base donde se está ejecutando el backend
   VITE_API_URL=http://localhost:8000

   # Token de acceso público de Mapbox
   VITE_MAPBOX_ACCESS_TOKEN=tu_mapbox_access_token
   ```
   Reemplaza `tu_mapbox_access_token` con tu propio token obtenido desde tu cuenta de [Mapbox](https://www.mapbox.com/).

4. **Ejecutar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   Este comando iniciará el servidor de desarrollo de Vite. La aplicación estará disponible en `http://localhost:5173` (o en el puerto que se indique en la terminal). El servidor se recargará automáticamente cada vez que se detecte un cambio en el código fuente.

5. **Compilar para producción**:
   Para crear una versión optimizada para producción, ejecuta:
   ```bash
   npm run build
   ```
   Los archivos compilados se generarán en el directorio `dist/`. Estos archivos están minificados, optimizados y listos para ser desplegados en un servidor web.

6. **Previsualizar la build de producción**:
   Para verificar que la compilación de producción funciona correctamente antes del despliegue:
   ```bash
   npm run preview
   ```
   Esto servirá los archivos del directorio `dist/` localmente.

## Propósito del Frontend

El frontend de Social Graph Analyzer es una aplicación web interactiva diseñada para visualizar y gestionar redes sociales a través de un mapa mundial. Su función principal es proporcionar una interfaz intuitiva que permite a los usuarios crear, editar y eliminar nodos (usuarios) y conexiones (relaciones), además de ejecutar análisis de grafos como encontrar el camino más corto entre dos usuarios. La aplicación consume la API RESTful del backend para todas las operaciones de datos, manteniendo sincronizada la visualización con el estado del grafo en la base de datos.

## Características Principales

La aplicación frontend ofrece las siguientes funcionalidades:

### Visualización Geoespacial
- Renderización de usuarios como marcadores en un mapa mundial usando Mapbox GL JS.
- Visualización de conexiones entre usuarios como líneas que unen sus ubicaciones geográficas.
- Diferenciación visual de usuarios mediante colores basados en sus hobbies.
- Resaltado dinámico de rutas cuando se calcula el camino más corto entre dos usuarios.

### Gestión de Usuarios
- Creación de nuevos usuarios con información personal (nombre, apellidos, edad, ubicación geográfica y hobby).
- Edición de usuarios existentes.
- Eliminación de usuarios y todas sus conexiones asociadas.
- Búsqueda de usuarios por nombre o apellido.
- Visualización de detalles completos de cada usuario mediante popups interactivos.

### Gestión de Conexiones
- Creación de conexiones direccionales entre usuarios.
- Visualización de todas las conexiones de un usuario específico.
- Eliminación de conexiones existentes.
- Identificación visual de conexiones bidireccionales versus direccionales.

### Análisis de Grafos
- Cálculo y visualización del camino más corto entre dos usuarios.
- Configuración de profundidad máxima de búsqueda para el algoritmo de ruta más corta.
- Sincronización automática de datos mediante React Query.

## Estructura del Proyecto

El frontend está organizado siguiendo una arquitectura de componentes modular y escalable:

```
frontend/
├── src/
│   ├── components/        # Componentes de React
│   │   ├── ui/           # Componentes UI de bajo nivel (shadcn/ui)
│   │   ├── Map.tsx       # Componente principal del mapa
│   │   ├── Navbar.tsx    # Barra de navegación
│   │   ├── SearchBar.tsx # Búsqueda de usuarios
│   │   ├── CreateUserDialog.tsx    # Diálogo de creación de usuario
│   │   ├── EditUserDialog.tsx      # Diálogo de edición de usuario
│   │   ├── DeleteUserDialog.tsx    # Diálogo de eliminación de usuario
│   │   ├── AddConnectionDialog.tsx # Diálogo de creación de conexión
│   │   ├── ViewConnectionsDialog.tsx  # Diálogo de vista de conexiones
│   │   ├── DeleteConnectionDialog.tsx # Diálogo de eliminación de conexión
│   │   └── ShortestPathDialog.tsx     # Diálogo de búsqueda de ruta más corta
│   ├── contexts/         # Contextos de React para estado global
│   │   ├── LoadingStateContext.tsx   # Estado de carga de la aplicación
│   │   ├── MapFocusContext.tsx       # Control de enfoque del mapa
│   │   └── ShortestPathContext.tsx   # Estado del camino más corto
│   ├── hooks/            # Hooks personalizados
│   │   ├── useGraphSync.ts   # Sincronización del grafo
│   │   ├── use-mobile.tsx    # Detección de dispositivos móviles
│   │   └── use-toast.ts      # Sistema de notificaciones
│   ├── pages/            # Páginas de la aplicación
│   │   ├── Index.tsx     # Página principal
│   │   └── NotFound.tsx  # Página de error 404
│   ├── services/         # Servicios de comunicación
│   │   └── api.ts        # Cliente API centralizado
│   ├── types/            # Definiciones de tipos TypeScript
│   │   └── usuario.ts    # Tipos relacionados con usuarios y grafos
│   ├── utils/            # Utilidades y helpers
│   │   ├── hobbyColors.ts       # Mapeo de colores por hobby
│   │   ├── textTransform.ts     # Transformaciones de texto
│   │   ├── pendingUsers.ts      # Gestión de usuarios pendientes
│   │   └── connectionsCache.ts  # Caché de conexiones
│   ├── App.tsx           # Componente raíz de la aplicación
│   └── main.tsx          # Punto de entrada de la aplicación
├── .dockerignore         # Archivos excluidos del contexto Docker
├── package.json          # Dependencias y scripts del proyecto
├── tsconfig.json         # Configuración de TypeScript
├── vite.config.ts        # Configuración de Vite
└── tailwind.config.ts    # Configuración de Tailwind CSS
```

## Archivo .dockerignore

El archivo `.dockerignore` especifica qué archivos y directorios deben ser excluidos del contexto de construcción de Docker. Esto optimiza el proceso de construcción al reducir el tamaño del contexto enviado al daemon de Docker y asegura que archivos innecesarios o sensibles no se incluyan en la imagen final.

```
# Dependencias
node_modules/

# Construcción y distribución
dist/
build/

# IDE
.vscode/
.idea/

# Pruebas y cobertura
coverage/

# Sistemas operativos
.DS_Store
Thumbs.db

# Registros
*.log

# Entorno de configuración
.env.local
.env.development.local
.env.test.local
.env.production.local
```

Excluir `node_modules/` es particularmente importante ya que este directorio puede contener miles de archivos. Las carpetas `dist/` y `build/` se excluyen porque se generarán dentro del contenedor durante el proceso de construcción. Los archivos de entorno locales (`.env.*`) se excluyen para evitar la filtración de credenciales o configuraciones específicas del desarrollador.

## Archivo package.json

El archivo `package.json` define las dependencias del proyecto, los scripts de desarrollo y producción, y los metadatos de la aplicación. Este archivo es el punto de entrada para la gestión de paquetes con npm.

### Scripts Disponibles

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "build:dev": "vite build --mode development",
  "lint": "eslint .",
  "preview": "vite preview"
}
```

- **`npm run dev`**: Inicia el servidor de desarrollo de Vite con hot module replacement (HMR).
- **`npm run build`**: Compila la aplicación para producción, generando archivos optimizados en el directorio `dist/`.
- **`npm run build:dev`**: Compila la aplicación en modo desarrollo, útil para debugging.
- **`npm run lint`**: Ejecuta ESLint para verificar la calidad del código.
- **`npm run preview`**: Sirve la aplicación compilada localmente para previsualización antes del despliegue.

### Dependencias Principales

```json
"dependencies": {
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "@tanstack/react-query": "^5.83.0",
  "mapbox-gl": "^3.16.0",
  "zod": "^3.25.76",
  "react-hook-form": "^7.61.1",
  "@hookform/resolvers": "^3.10.0",
  "tailwindcss": "^3.4.17",
  "lucide-react": "^0.462.0"
}
```

- **React y React DOM**: Biblioteca principal para construir la interfaz de usuario mediante componentes.
- **React Router DOM**: Sistema de navegación y enrutamiento de la aplicación.
- **TanStack React Query**: Gestión avanzada del estado del servidor, incluyendo caché, sincronización y revalidación automática.
- **Mapbox GL**: Biblioteca para renderizar mapas vectoriales interactivos usando WebGL.
- **Zod**: Validación de esquemas y tipo seguro para formularios y datos de API.
- **React Hook Form**: Gestión eficiente de formularios con validación y rendimiento optimizado.
- **Tailwind CSS**: Framework de utilidades CSS para diseño responsivo y consistente.
- **Lucide React**: Conjunto de iconos SVG modulares y personalizables.

## Componentes Principales

### Map.tsx

El componente `Map.tsx` (`src/components/Map.tsx`) es el núcleo de la visualización. Se encarga de:

1. **Inicialización del mapa**: Configura una instancia de Mapbox GL con el token de acceso y establece la vista inicial.
2. **Renderizado de usuarios**: Convierte los datos de usuarios en una capa GeoJSON de puntos, estilizados por color según su hobby.
3. **Renderizado de conexiones**: Crea una capa GeoJSON de líneas que conectan usuarios, diferenciando visualmente conexiones direccionales y bidireccionales.
4. **Interactividad**: Maneja eventos de clic en marcadores para mostrar popups con información del usuario y botones de acción (editar, eliminar, ver conexiones).
5. **Sincronización**: Escucha cambios en los datos de usuarios y conexiones a través de React Query y actualiza las capas del mapa en tiempo real.

```typescript
// Ejemplo de estructura de inicialización del mapa en Map.tsx
useEffect(() => {
  if (!mapContainer.current) return;

  mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ?? '';

  const mapInstance = new mapboxgl.Map({
    container: mapContainer.current,
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-74.5, 40],
    zoom: 2,
  });

  mapInstance.on('load', () => {
    setIsMapReady(true);
  });

  map.current = mapInstance;

  return () => {
    mapInstance.remove();
  };
}, []);
```

### Diálogos de Gestión

Los componentes de diálogo encapsulan la lógica de cada operación CRUD:

- **`CreateUserDialog.tsx`**: Formulario para crear un nuevo usuario. Utiliza React Hook Form con validación de Zod para asegurar que todos los campos requeridos están completos y en formato correcto antes de enviar la solicitud al backend.

- **`EditUserDialog.tsx`**: Permite modificar los datos de un usuario existente. Precarga los valores actuales del usuario en el formulario.

- **`DeleteUserDialog.tsx`**: Confirmación de eliminación de un usuario, advirtiendo que también se eliminarán todas sus conexiones.

- **`AddConnectionDialog.tsx`**: Crea una conexión direccional entre dos usuarios. Incluye un selector de usuarios destino.

- **`ViewConnectionsDialog.tsx`**: Muestra una lista de todos los usuarios a los que un usuario específico está conectado.

- **`DeleteConnectionDialog.tsx`**: Confirmación de eliminación de una conexión específica.

- **`ShortestPathDialog.tsx`**: Calcula y visualiza el camino más corto entre dos usuarios seleccionados, con control de profundidad máxima de búsqueda.

### SearchBar.tsx

Componente de búsqueda que permite filtrar usuarios por nombre o apellido. Cuando se selecciona un usuario de los resultados, el mapa se centra en su ubicación mediante el contexto `MapFocusContext`.

## Contextos y Hooks Personalizados

### Contextos

#### LoadingStateContext

Gestiona el estado de carga global de la aplicación. Se utiliza para mostrar un indicador de carga mientras se inicializan el mapa y se obtienen los datos del backend.

```typescript
// src/contexts/LoadingStateContext.tsx
type LoadingState = 'loading' | 'ready' | 'error';

const { loadingState, setLoadingState } = useLoadingState();
```

#### MapFocusContext

Proporciona funciones para controlar el enfoque del mapa en usuarios específicos. Cuando un usuario es seleccionado desde la búsqueda o desde un resultado de camino más corto, este contexto se utiliza para animar el mapa hacia esa ubicación.

```typescript
// src/contexts/MapFocusContext.tsx
const { focusedUserId, setFocusedUserId, clearFocus } = useMapFocus();
```

#### ShortestPathContext

Almacena el estado del camino más corto calculado, permitiendo que múltiples componentes accedan a la información de la ruta sin necesidad de prop drilling.

```typescript
// src/contexts/ShortestPathContext.tsx
const { shortestPathIds, setShortestPathIds, clearShortestPath } = useShortestPath();
```

### Hooks Personalizados

#### useGraphSync

Hook personalizado que sincroniza el estado del grafo con el backend. Utiliza React Query para obtener usuarios y conexiones, y expone funciones para invalidar las queries cuando se realizan cambios.

```typescript
// src/hooks/useGraphSync.ts
const { usuarios, conexiones, refetchUsuarios, refetchConexiones } = useGraphSync();
```

Este hook encapsula la lógica de sincronización y proporciona una interfaz simple para que los componentes obtengan datos actualizados del grafo sin preocuparse por los detalles de implementación de React Query.

## Consumo de APIs del Backend

La comunicación con el backend se gestiona de forma centralizada en el archivo `src/services/api.ts`. Este módulo exporta un objeto `api` que contiene métodos asíncronos para cada endpoint de la API REST del backend.

### Estructura del Servicio API

Cada método del servicio `api` sigue un patrón consistente:

1. Construye la URL del endpoint utilizando la variable de entorno `VITE_API_URL`.
2. Configura la solicitud HTTP con el método apropiado (GET, POST, PUT, DELETE).
3. Maneja la respuesta, verificando el código de estado HTTP.
4. En caso de error, lanza una excepción con un mensaje descriptivo.
5. En caso de éxito, parsea y devuelve el cuerpo de la respuesta en formato JSON.

### Ejemplos de Métodos de la API

#### Obtener Lista de Usuarios

```typescript
// src/services/api.ts
async getUsuarios(skip: number = 0, limit: number = 1000): Promise<UsuariosResponse> {
  const validLimit = Math.min(limit, 1000);

  const response = await fetch(
    `${API_BASE_URL}/api/v1/usuarios?skip=${skip}&limit=${validLimit}`
  );

  if (!response.ok) {
    throw new Error(`Error al obtener usuarios: ${response.statusText}`);
  }

  return response.json();
}
```

Este método obtiene una lista paginada de usuarios del backend. El parámetro `limit` está validado para no exceder el máximo permitido por el backend (1000).

#### Crear un Nuevo Usuario

```typescript
// src/services/api.ts
async createUsuario(data: CreateUsuarioData): Promise<CreateUsuarioResponse> {
  const response = await fetch(`${API_BASE_URL}/api/v1/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Error al crear usuario');
  }

  return response.json();
}
```

Este método envía una solicitud POST para crear un nuevo usuario. Incluye el manejo de errores tanto del servidor como de la red, y garantiza que el cuerpo de la solicitud esté correctamente serializado en JSON.

#### Calcular Camino Más Corto

```typescript
// src/services/api.ts
async getShortestPath(
  idOrigen: number,
  idDestino: number,
  maxDepth: number = 3
): Promise<ShortestPathResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/graph/shortest-path/${idOrigen}/${idDestino}?max_depth=${maxDepth}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'Error al buscar camino más corto');
  }

  return response.json();
}
```

Este método calcula el camino más corto entre dos usuarios utilizando el algoritmo implementado en el backend. El parámetro `maxDepth` permite configurar la profundidad máxima de búsqueda.

### Integración con React Query

El servicio `api` se integra con React Query para proporcionar características avanzadas como caché, revalidación automática y sincronización de estado del servidor.

```typescript
// Ejemplo de uso de api.ts con React Query en Map.tsx
const { data: usuariosData, isLoading, error } = useQuery({
  queryKey: ['usuarios'],
  queryFn: () => api.getUsuarios(0, 1000),
});
```

React Query gestiona automáticamente:
- Caché de respuestas para reducir solicitudes innecesarias.
- Revalidación de datos cuando la ventana recupera el foco.
- Estado de carga y errores de forma declarativa.
- Invalidación y refetch de datos cuando se realizan mutaciones.

## Gestión del Estado con React Query

React Query (TanStack Query) es la biblioteca central para la gestión del estado del servidor en la aplicación. Proporciona una capa de abstracción sobre las solicitudes HTTP que simplifica el manejo de datos asíncronos.

### Configuración Global

La configuración de React Query se realiza en el componente raíz de la aplicación mediante el `QueryClientProvider`:

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5000,
    },
  },
});

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
```

Esta configuración establece:
- **`refetchOnWindowFocus: false`**: Desactiva la revalidación automática cuando la ventana recupera el foco.
- **`retry: 1`**: Reintenta las queries fallidas una sola vez antes de marcarlas como error.
- **`staleTime: 5000`**: Considera los datos como "frescos" durante 5 segundos antes de marcarlos como obsoletos.

### Queries

Las queries se utilizan para obtener datos del servidor:

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['usuarios'],
  queryFn: () => api.getUsuarios(),
});
```

React Query almacena en caché los resultados usando la `queryKey` como identificador. Múltiples componentes que utilicen la misma `queryKey` compartirán la misma caché y estado.

### Mutations

Las mutations se utilizan para modificar datos en el servidor (POST, PUT, DELETE):

```typescript
const mutation = useMutation({
  mutationFn: (data: CreateUsuarioData) => api.createUsuario(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['usuarios'] });
  },
});
```

Cuando una mutation tiene éxito, se invalida la caché de `usuarios`, lo que provoca que React Query refetch automáticamente los datos actualizados.

### Sincronización Automática

La combinación de queries, mutations e invalidación de caché crea un flujo de sincronización automática:

1. El usuario realiza una acción (por ejemplo, crear un nuevo usuario).
2. Se ejecuta una mutation que llama a `api.createUsuario()`.
3. Si la mutation tiene éxito, se invalida la query de `usuarios`.
4. React Query detecta la invalidación y refetch automáticamente la lista de usuarios.
5. Los componentes que dependen de estos datos se re-renderizan con la información actualizada.

Este patrón elimina la necesidad de gestionar manualmente el estado local y asegura que la interfaz siempre refleje el estado actual del servidor.

## Visualización del Mapa Mundial con Mapbox

Para la representación visual de los datos geoespaciales y la interacción con el mapa, el proyecto utiliza **Mapbox GL JS**, una biblioteca de código abierto para la creación de mapas web personalizables y de alto rendimiento.

### Análisis Técnico

Mapbox GL JS renderiza mapas vectoriales directamente en el navegador utilizando WebGL, lo que permite una experiencia de usuario fluida y dinámica. A diferencia de los mapas basados en teselas de imágenes, los mapas vectoriales se renderizan en el lado del cliente, permitiendo una personalización del estilo en tiempo real, rotación, inclinación y zoom continuo.

En el proyecto, Mapbox se integra a través del componente `Map.tsx` (`src/components/Map.tsx`), que encapsula toda la lógica de inicialización, renderizado y actualización del mapa. Los datos de los usuarios (nodos) y sus conexiones (aristas) se cargan como fuentes de datos GeoJSON, permitiendo a Mapbox manejar de manera eficiente su visualización.

### Fuentes de Datos GeoJSON

Los usuarios se representan como una colección de características GeoJSON de tipo `Point`:

```typescript
const usuariosGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point> = {
  type: 'FeatureCollection',
  features: usuariosData.usuarios.map(usuario => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [usuario.longitud, usuario.latitud],
    },
    properties: {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      apellidos: usuario.apellidos,
      edad: usuario.edad,
      hobby: usuario.hobby?.nombre || 'Sin hobby',
      categoria: usuario.hobby?.categoria_nombre || '',
      color: getHobbyColor(usuario.hobby?.categoria_nombre),
    },
  })),
};
```

Las conexiones se representan como características GeoJSON de tipo `LineString`:

```typescript
const conexionesGeoJSON: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: 'FeatureCollection',
  features: conexionesData.conexiones.map(conexion => ({
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: [
        [conexion.usuario_origen.longitud, conexion.usuario_origen.latitud],
        [conexion.usuario_destino.longitud, conexion.usuario_destino.latitud],
      ],
    },
    properties: {
      id_origen: conexion.usuario_origen.id_usuario,
      id_destino: conexion.usuario_destino.id_usuario,
      tipo: conexion.es_bidireccional ? 'Bidireccional' : 'Direccional',
    },
  })),
};
```

### Estilos de Capas

Mapbox permite definir estilos para cada capa. Los usuarios se renderizan como círculos coloreados según su hobby:

```typescript
map.current.addLayer({
  id: 'usuarios-layer',
  type: 'circle',
  source: 'usuarios',
  paint: {
    'circle-radius': 8,
    'circle-color': ['get', 'color'],
    'circle-stroke-width': 2,
    'circle-stroke-color': '#ffffff',
  },
});
```

Las conexiones se renderizan como líneas con diferentes estilos según sean bidireccionales o direccionales:

```typescript
map.current.addLayer({
  id: 'conexiones-layer',
  type: 'line',
  source: 'conexiones',
  paint: {
    'line-color': [
      'match',
      ['get', 'tipo'],
      'Bidireccional', '#00ff00',
      '#ff0000'
    ],
    'line-width': 2,
  },
});
```

### Propósito en el Proyecto

El propósito principal de Mapbox en Social Graph Analyzer es ofrecer una visualización geográfica clara e interactiva de la red social. Permite a los usuarios:
- Ver la ubicación de cada usuario en un mapa mundial.
- Explorar las conexiones entre usuarios como líneas que unen sus ubicaciones.
- Interactuar con los nodos para obtener información detallada a través de popups.
- Visualizar rutas complejas, como el camino más corto entre dos usuarios, destacando el recorrido en el mapa.

Esta representación visual es fundamental para analizar patrones espaciales en la red, identificar clústeres geográficos y comprender la estructura del grafo de una manera intuitiva.

## Referencias Bibliográficas

1. Meta Platforms. (2024). React Documentation. Meta. Recuperado de https://react.dev/
2. Microsoft Corporation. (2024). TypeScript Documentation. Microsoft. Recuperado de https://www.typescriptlang.org/docs/
3. Vite Team. (2024). Vite Documentation. Vite. Recuperado de https://vitejs.dev/guide/
4. Tailwind Labs. (2024). Tailwind CSS Documentation. Tailwind Labs. Recuperado de https://tailwindcss.com/docs
5. Mapbox. (2024). Mapbox GL JS Documentation. Mapbox. Recuperado de https://docs.mapbox.com/mapbox-gl-js/api/
6. TanStack. (2024). TanStack Query Documentation. TanStack. Recuperado de https://tanstack.com/query/latest
7. Colby Fayock. (2020). GeoJSON Specification. Internet Engineering Task Force (IETF). Recuperado de https://datatracker.ietf.org/doc/html/rfc7946
8. Radix UI. (2024). Radix UI Documentation. WorkOS. Recuperado de https://www.radix-ui.com/

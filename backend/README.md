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
  <h2 style="font-weight:bold;">SOCIAL GRAPH ANALYZER - BACKEND</h2>
</div>

## Tecnologías utilizadas
[![Python][Python]][python-site]
[![FastAPI][FastAPI]][fastapi-site]
[![Psycopg][Psycopg]][psycopg-site]
[![Uvicorn][Uvicorn]][uvicorn-site]
[![Venv][Venv]][venv-site]

[Python]: https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white
[python-site]: https://www.python.org/

[FastAPI]: https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white
[fastapi-site]: https://fastapi.tiangolo.com/

[Psycopg]: https://img.shields.io/badge/Psycopg-336791?style=for-the-badge&logo=postgresql&logoColor=white
[psycopg-site]: https://www.psycopg.org/

[Uvicorn]: https://img.shields.io/badge/Uvicorn-121212?style=for-the-badge&logo=uvicorn&logoColor=white
[uvicorn-site]: https://www.uvicorn.org/

[Venv]: https://img.shields.io/badge/Virtualenv-000000?style=for-the-badge&logo=python&logoColor=white
[venv-site]: https://docs.python.org/3/library/venv.html


## Cómo Ejecutar el Servidor FastAPI

Para ejecutar el servidor FastAPI en un entorno de desarrollo local, sigue estos pasos:

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/tu_usuario/social-graph-analyzer.git
    cd social-graph-analyzer/backend
    ```

2.  **Crear y activar un entorno virtual**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # En Windows: venv\Scripts\activate
    ```

3.  **Instalar las dependencias**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Configurar las variables de entorno**:
    Crea un archivo `.env` en la raíz del directorio `backend` y añade las credenciales de la base de datos, siguiendo el ejemplo del archivo `.env.example` si existe.

5.  **Ejecutar el servidor**:
    ```bash
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    ```
    El servidor estará disponible en `http://localhost:8000`. La opción `--reload` reinicia el servidor automáticamente cada vez que se detecta un cambio en el código.


## Propósito del Backend

El backend de Social Graph Analyzer está diseñado para gestionar y analizar datos de grafos sociales. Su función principal es proporcionar una API RESTful que permita a los clientes interactuar con una base de datos de grafos, realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) en usuarios y sus relaciones, y ejecutar análisis complejos sobre la estructura del grafo social. Esto incluye encontrar rutas de conexión entre usuarios, identificar comunidades y analizar la centralidad de los nodos en la red.

## Endpoints Disponibles

La API del backend, con prefijo `/api/v1`, expone los siguientes endpoints:

### Gestión de Usuarios (`/usuarios`)

-   **`POST /`**: Crea un nuevo usuario.
-   **`GET /`**: Obtiene una lista paginada de todos los usuarios.
-   **`GET /{id_usuario}`**: Obtiene los detalles de un usuario específico por su ID.
-   **`PUT /{id_usuario}`**: Actualiza todos los campos de un usuario.
-   **`PATCH /{id_usuario}`**: Actualiza parcialmente los campos proporcionados de un usuario.
-   **`DELETE /{id_usuario}`**: Elimina un usuario y todas sus relaciones.
-   **`POST /conexiones`**: Crea una conexión direccional entre dos usuarios.
-   **`DELETE /conexiones/{id_origen}/{id_destino}`**: Elimina una conexión direccional.
-   **`GET /{id_usuario}/conexiones`**: Obtiene la lista de usuarios a los que un usuario está conectado.

### Gestión de Hobbies (`/hobbies`)

-   **`GET /`**: Obtiene la lista completa de hobbies disponibles en el sistema.

### Análisis de Grafos (`/graph`)

-   **`GET /shortest-path/{id_origen}/{id_destino}`**: Calcula el camino más corto entre dos usuarios.
-   **`GET /recommendations/{id_usuario}`**: Genera recomendaciones de conexión basadas en amigos de amigos.
-   **`GET /ego/{id_usuario}`**: Obtiene el subgrafo centrado en un usuario y sus conexiones directas.
-   **`GET /communities`**: Detecta comunidades en el grafo basadas en hobbies compartidos.
-   **`GET /connections`**: Obtiene una lista de todos los usuarios y sus respectivas conexiones.

## Archivo .dockerignore

El archivo `.dockerignore` tiene un propósito similar al de `.gitignore`, pero para el contexto de Docker. Este archivo especifica una lista de archivos y directorios que deben ser excluidos del contexto de construcción de Docker. Al construir una imagen de Docker, el motor de Docker primero carga el contexto (todos los archivos del directorio del `Dockerfile`). Excluir archivos innecesarios como entornos virtuales (`venv`), archivos de caché (`__pycache__`) o archivos de configuración locales (`.env`) hace que el proceso de construcción sea más rápido y la imagen resultante más pequeña y segura.

## Archivo requirements.txt

El archivo `requirements.txt` es un estándar en los proyectos de Python para declarar las dependencias de paquetes. Contiene una lista de todos los paquetes de Python que el proyecto necesita para funcionar correctamente, junto con sus versiones específicas.

```
# Web Framework
fastapi
uvicorn[standard]

# Database - Usando psycopg3 para compatibilidad con Python 3.14
psycopg[binary]
psycopg-pool

# Validación de Datos
pydantic
pydantic-settings

# Variables de Entorno
python-dotenv

# Utilitarios
typing-extensions

# Desarrollo y Pruebas
pytest
pytest-asyncio
httpx
```

Esto asegura que cualquier persona que configure el proyecto pueda instalar exactamente las mismas dependencias, creando un entorno de ejecución consistente y predecible. Se utiliza comúnmente con herramientas como `pip` para instalar las dependencias con un solo comando (`pip install -r requirements.txt`).

## Archivos .sh

Los archivos con extensión `.sh` presentes en el repositorio son scripts de shell, diseñados para automatizar tareas en entornos tipo Unix (como Linux o macOS).

- **`entrypoint.sh`**: Este script se utiliza a menudo en contenedores de Docker como el punto de entrada principal. Se ejecuta cuando el contenedor se inicia y su función es preparar el entorno y ejecutar la aplicación principal. Por ejemplo, puede aplicar migraciones de base de datos, configurar variables de entorno o iniciar el servidor.
- **`wait-for-postgres.sh`**: Es un script de utilidad que pausa la ejecución de un servicio (como el backend) hasta que la base de datos PostgreSQL esté completamente iniciada y lista para aceptar conexiones. Esto es crucial en entornos de contenedores donde los servicios pueden iniciarse en un orden impredecible, evitando que la aplicación falle si intenta conectarse a una base de datos que aún no está disponible.

## Acceso a Datos y Consultas de Grafo (Apache AGE)

La aplicación utiliza un patrón de repositorio para separar la lógica de negocio del acceso a la base de datos. Toda la interacción con la base de datos de grafos se realiza mediante consultas `openCypher` ejecutadas a través de la extensión Apache AGE en PostgreSQL.

### 1. Configuración y Conexión

La conexión se gestiona de forma centralizada. Primero, las credenciales se cargan desde un archivo `.env` a un objeto de configuración Pydantic (`app/core/config.py`). Luego, una clase singleton `DatabaseConnection` (`db/database.py`) utiliza esta configuración para establecer una conexión persistente, cargando la extensión de Apache AGE y estableciendo el `search_path` necesario en la sesión.

### 2. Guía de Consultas openCypher por Repositorio

A continuación, se detallan las consultas clave utilizadas en la aplicación.

#### `HobbyRepository`

##### `get_all_hobbies`
- **Propósito**: Obtiene la lista completa de hobbies y la categoría a la que pertenece cada uno.
- **Código**:
  ```cypher
  MATCH (h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
  RETURN h.id_hobby AS id_hobby,
         h.nombre AS nombre,
         c.id_categoria_hobby AS id_categoria,
         c.nombre AS categoria_nombre
  ORDER BY h.id_hobby
  ```
- **Explicación**:
  1. `MATCH (h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)`: Busca un patrón donde un nodo con la etiqueta `Hobby` (variable `h`) tiene una relación de tipo `PERTENECE_A` que apunta hacia un nodo con la etiqueta `CategoriaHobby` (variable `c`).
  2. `RETURN ...`: Devuelve las propiedades `id_hobby` y `nombre` del nodo `h`, y las propiedades `id_categoria_hobby` y `nombre` del nodo `c`.
  3. `ORDER BY h.id_hobby`: Ordena los resultados por el ID del hobby.

---

#### `UsuarioRepository`

##### `create`
- **Propósito**: Crea un nuevo nodo de usuario y, opcionalmente, lo conecta con un hobby existente.
- **Código**:
  ```cypher
  -- Variante con hobby
  MATCH (h:Hobby {id_hobby: {id_hobby}})
  CREATE (u:Usuario {
      id_usuario: {next_id},
      nombre: '{usuario_data['nombre']}',
      ...
  })
  CREATE (u)-[:TIENE_HOBBY]->(h)
  RETURN u
  ```
- **Explicación**:
  1. `MATCH (h:Hobby {id_hobby: {id_hobby}})`: Primero, encuentra el nodo `Hobby` que corresponde al ID proporcionado.
  2. `CREATE (u:Usuario {...})`: Crea un nuevo nodo con la etiqueta `Usuario` y le asigna todas sus propiedades (nombre, edad, etc.).
  3. `CREATE (u)-[:TIENE_HOBBY]->(h)`: Crea una nueva relación de tipo `TIENE_HOBBY` desde el usuario recién creado (`u`) hacia el hobby encontrado (`h`).

##### `find_by_id`
- **Propósito**: Encuentra un usuario por su ID y recupera sus datos, su hobby y la lista de sus conexiones.
- **Código**:
  ```cypher
  MATCH (u:Usuario)
  WHERE u.id_usuario = {id_usuario}
  OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
  OPTIONAL MATCH (u)-[:CONECTADO]->(con:Usuario)
  WITH u, h, c, collect(DISTINCT con.id_usuario) AS conexiones
  RETURN u, h, c, conexiones
  ```
- **Explicación**:
  1. `MATCH (u:Usuario) WHERE u.id_usuario = {id_usuario}`: Encuentra el nodo `Usuario` con el ID especificado.
  2. `OPTIONAL MATCH (u)-...->(c:CategoriaHobby)`: Busca el hobby del usuario y su categoría. Se usa `OPTIONAL MATCH` para que la consulta no falle si el usuario no tiene un hobby asignado.
  3. `OPTIONAL MATCH (u)-[:CONECTADO]->(con:Usuario)`: Busca todos los usuarios (`con`) a los que el usuario principal (`u`) está conectado.
  4. `WITH u, h, c, collect(DISTINCT con.id_usuario) AS conexiones`: `collect()` es una función de agregación que agrupa todos los IDs de los usuarios conectados (`con.id_usuario`) en una sola lista llamada `conexiones`.
  5. `RETURN u, h, c, conexiones`: Devuelve los datos del usuario, su hobby, la categoría del hobby y la lista de IDs de sus conexiones.

##### `delete`
- **Propósito**: Elimina un usuario y todas sus relaciones.
- **Código**:
  ```cypher
  MATCH (u:Usuario)
  WHERE u.id_usuario = {id_usuario}
  DETACH DELETE u
  ```
- **Explicación**:
  1. `MATCH (u:Usuario) WHERE u.id_usuario = {id_usuario}`: Encuentra el usuario que se va to eliminar.
  2. `DETACH DELETE u`: Elimina el nodo `u` y, crucialmente, `DETACH` se encarga de eliminar primero todas las relaciones (tanto entrantes como salientes) conectadas a este nodo.

##### `create_conexion`
- **Propósito**: Crea una relación direccional `CONECTADO` de un usuario a otro.
- **Código**:
  ```cypher
  MATCH (u1:Usuario {id_usuario: {id_origen}}), (u2:Usuario {id_usuario: {id_destino}})
  CREATE (u1)-[:CONECTADO]->(u2)
  RETURN u1, u2
  ```
- **Explicación**:
  1. `MATCH (u1:...), (u2:...)`: Encuentra tanto el nodo de origen (`u1`) como el de destino (`u2`) en una sola cláusula.
  2. `CREATE (u1)-[:CONECTADO]->(u2)`: Crea una relación de tipo `CONECTADO` que va desde `u1` hacia `u2`.

---

#### `GraphRepository`

##### `find_shortest_path`
- **Propósito**: Encuentra el camino más corto entre dos usuarios usando una búsqueda por niveles (BFS).
- **Código**:
  ```cypher
  -- Se ejecuta en un bucle para depth = 1, 2, ..., max_depth
  MATCH path = (origen:Usuario {id_usuario: {id_origen}})-[:CONECTADO*{depth}]-(destino:Usuario {id_usuario: {id_destino}})
  RETURN path
  LIMIT 1
  ```
- **Explicación**:
  1. `MATCH path = ...`: Busca un camino (`path`) entre un nodo `origen` y un nodo `destino`.
  2. `[:CONECTADO*{depth}]`: Especifica que el camino debe consistir en exactamente `{depth}` número de saltos a través de relaciones `CONECTADO`. El bucle en Python que incrementa `depth` (1, 2, 3...) asegura que el primer camino encontrado sea, por definición, el más corto.
  3. `LIMIT 1`: Optimización clave. Tan pronto como se encuentra un camino en un nivel de profundidad, la consulta termina y devuelve ese resultado.

##### `get_friend_of_friend_recommendations`
- **Propósito**: Recomienda usuarios basándose en "amigos de amigos".
- **Código**:
  ```cypher
  MATCH (user:Usuario {id_usuario: {id_usuario}})-[:CONECTADO]->(friend:Usuario)-[:CONECTADO]->(fof:Usuario)
  WHERE user.id_usuario <> fof.id_usuario
    AND NOT EXISTS((user)-[:CONECTADO]->(fof))
  WITH fof, collect(DISTINCT friend.id_usuario) AS common_friends
  WHERE size(common_friends) >= {min_common_friends}
  RETURN fof.id_usuario, fof.nombre, fof.apellidos, common_friends
  ORDER BY size(common_friends) DESC
  LIMIT {limit}
  ```
- **Explicación**:
  1. `MATCH (user)-[:CONECTADO]->(friend)-[:CONECTADO]->(fof)`: Busca un patrón de dos saltos: desde el usuario inicial (`user`) a un amigo (`friend`), y de ese amigo a un "amigo de amigo" (`fof`).
  2. `WHERE user.id_usuario <> fof.id_usuario`: Se asegura de no recomendar al usuario a sí mismo.
  3. `AND NOT EXISTS((user)-[:CONECTADO]->(fof))`: Condición crucial que filtra a los "amigos de amigos" que ya son amigos directos del usuario.
  4. `WITH fof, collect(DISTINCT friend.id_usuario) AS common_friends`: Para cada recomendación potencial (`fof`), agrupa a todos los amigos en común (`friend`) en una lista.
  5. `WHERE size(common_friends) >= {min_common_friends}`: Filtra las recomendaciones para que solo incluyan aquellas con un número mínimo de amigos en común.
  6. `ORDER BY size(common_friends) DESC`: Ordena los resultados para que las personas con más amigos en común aparezcan primero.

## Documentación

1.  Wasserman, S., & Faust, K. (1994). *Social Network Analysis: Methods and Applications*. Cambridge University Press. Recuperado de https://www.cambridge.org/core/books/social-network-analysis/942A2744825B7262D639734A2B70F488
2.  Robinson, I., Webber, J., & Eifrem, E. (2015). *Graph Databases: New Opportunities for Connected Data*. O'Reilly Media. Recuperado de https://www.oreilly.com/library/view/graph-databases-2nd/9781491930819/
3.  Cruz Yoris, A. (2022). *Primeros pasos con FastAPI*. Desarrollo Libre. Recuperado de https://leanpub.com/primeros-pasos-con-fastapi
4.  Apache AGE Development Team. (2024). *Apache AGE Documentation*. Apache Software Foundation. Recuperado de https://age.apache.org/age-manual/master/
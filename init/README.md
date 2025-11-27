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
  <h2 style="font-weight:bold;">SOCIAL GRAPH ANALYZER - POSTGRESQL + APACHE AGE</h2>
</div>

## Tecnologías utilizadas

[![PostgreSQL][PostgreSQL]][postgresql-site]
[![Apache AGE][ApacheAGE]][age-site]
[![openCypher][openCypher]][opencypher-site]

[PostgreSQL]: https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white
[postgresql-site]: https://www.postgresql.org/

[ApacheAGE]: https://img.shields.io/badge/Apache_AGE-D22128?style=for-the-badge&logo=apache&logoColor=white
[age-site]: https://age.apache.org/

[openCypher]: https://img.shields.io/badge/openCypher-008CC1?style=for-the-badge&logo=neo4j&logoColor=white
[opencypher-site]: https://opencypher.org/

## Cómo Inicializar la Base de Datos

Los scripts SQL en este directorio se ejecutan automáticamente al levantar el contenedor de PostgreSQL con Docker. El orden de ejecución es:

1. **01-create-extension.sql**: Habilita Apache AGE
2. **02-load-data-age.sql**: Crea el grafo y carga datos iniciales
3. **03-indices-age.sql**: Crea índices para optimizar consultas

```bash
# Los scripts se ejecutan automáticamente con docker-compose
docker-compose up --build

# Para ejecutarlos manualmente en un contenedor en ejecución:
docker-compose exec postgres-age psql -U graph_user -d social_graph_analyzer -f /docker-entrypoint-initdb.d/01-create-extension.sql
docker-compose exec postgres-age psql -U graph_user -d social_graph_analyzer -f /docker-entrypoint-initdb.d/02-load-data-age.sql
docker-compose exec postgres-age psql -U graph_user -d social_graph_analyzer -f /docker-entrypoint-initdb.d/03-indices-age.sql
```

## ¿Qué es Apache AGE?

**Apache AGE** (A Graph Extension) es una extensión de PostgreSQL que permite trabajar con **bases de datos de grafos** directamente en PostgreSQL. AGE implementa el estándar **openCypher**, un lenguaje declarativo para consultar grafos, similar a como SQL se usa para consultar bases de datos relacionales.

### Ventajas de Apache AGE

- **Combina lo mejor de dos mundos**: Bases de datos relacionales (PostgreSQL) y grafos (openCypher) en un solo sistema.
- **Compatibilidad**: Funciona sobre PostgreSQL, aprovechando su robustez, ACID y ecosistema.
- **openCypher**: Lenguaje expresivo y poderoso para consultas de grafos.
- **Rendimiento**: Optimizado para traversals (recorridos) y queries complejas sobre grafos.
- **Sin migración**: No es necesario migrar a una base de datos de grafos dedicada.

### Componentes de un Grafo

Un grafo en Apache AGE está compuesto por:

1. **Vértices (Vertices/Nodes)**: Entidades del grafo. Ejemplo: `Usuario`, `Hobby`, `CategoriaHobby`
2. **Aristas (Edges/Relationships)**: Relaciones direccionales entre vértices. Ejemplo: `CONECTADO`, `TIENE_HOBBY`, `PERTENECE_A`
3. **Propiedades**: Atributos de vértices y aristas almacenados como pares clave-valor

## PostgreSQL con Apache AGE

PostgreSQL es un sistema de gestión de bases de datos relacional de código abierto (RDBMS), conocido por su robustez, extensibilidad y cumplimiento de estándares SQL. Al instalar Apache AGE como extensión, PostgreSQL se convierte en una **base de datos multimodelo** capaz de manejar:

- **Datos relacionales**: Tablas tradicionales con SQL
- **Datos de grafos**: Nodos y aristas con openCypher

### Arquitectura de Almacenamiento

Apache AGE almacena los grafos usando tablas especiales en PostgreSQL:

- Cada **vértice** se almacena en una tabla específica por etiqueta (ej: `red_usuarios."Usuario"`)
- Cada **arista** se almacena en una tabla específica por tipo (ej: `red_usuarios."CONECTADO"`)
- Las **propiedades** se almacenan en formato JSONB (`agtype`) para flexibilidad

Esto permite:
- Consultar grafos con openCypher
- Acceder a los datos con SQL tradicional
- Combinar queries relacionales y de grafos en una sola transacción

## Archivos SQL del Proyecto

### 01-create-extension.sql

Este script inicializa Apache AGE en la base de datos:

```sql
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;
```

**Explicación**:
- `CREATE EXTENSION IF NOT EXISTS age`: Habilita la extensión Apache AGE si no está ya instalada
- `LOAD 'age'`: Carga la biblioteca compartida de AGE en memoria
- `SET search_path`: Configura la ruta de búsqueda de PostgreSQL para incluir `ag_catalog`, el esquema donde AGE almacena sus funciones y tipos

### 02-load-data-age.sql

Este script crea el grafo `red_usuarios` y carga todos los datos iniciales (usuarios, hobbies, categorías y sus relaciones).

**Estructura del Script**:

1. **Crear el grafo**:
```sql
SELECT * FROM ag_catalog.create_graph('red_usuarios');
```

2. **Crear nodos (vértices)**:
```sql
SELECT * FROM cypher('red_usuarios', $$
    UNWIND [{id_categoria_hobby: 1, nombre: 'deportes'}, ...] AS cat_data
    CREATE (c:CategoriaHobby)
    SET c = cat_data
$$) AS (result agtype);
```

3. **Crear relaciones (aristas)**:
```sql
SELECT * FROM cypher('red_usuarios', $$
    UNWIND [{id_hobby: 1, id_categoria: 1}, ...] AS rel_data
    MATCH (h:Hobby {id_hobby: rel_data.id_hobby})
    MATCH (c:CategoriaHobby {id_categoria_hobby: rel_data.id_categoria})
    CREATE (h)-[:PERTENECE_A]->(c)
$$) AS (result agtype);
```

### 03-indices-age.sql

Este script crea índices en las tablas de vértices y aristas para optimizar el rendimiento de las consultas.

**Tipos de Índices**:

1. **Índices GIN (Generalized Inverted Index)**: Para búsquedas rápidas por cualquier propiedad
```sql
CREATE INDEX idx_usuario_properties_gin
    ON red_usuarios."Usuario"
    USING GIN (properties);
```

2. **Índices UNIQUE**: Para garantizar unicidad (ej: `id_usuario`)
```sql
CREATE UNIQUE INDEX idx_usuario_id_usuario
    ON red_usuarios."Usuario" (
        ag_catalog.agtype_access_operator(properties, '"id_usuario"'::agtype)
    );
```

3. **Índices compuestos**: Para búsquedas combinadas
```sql
CREATE INDEX idx_usuario_nombre_apellidos
    ON red_usuarios."Usuario" (
        ag_catalog.agtype_access_operator(properties, '"nombre"'::agtype),
        ag_catalog.agtype_access_operator(properties, '"apellidos"'::agtype)
    );
```

4. **Índices sobre aristas**: Optimizan traversals y búsquedas de relaciones
```sql
CREATE INDEX idx_conectado_start_end
    ON red_usuarios."CONECTADO" (start_id, end_id);
```

## Sintaxis de openCypher en Apache AGE

Apache AGE utiliza **openCypher**, un lenguaje declarativo para consultar grafos. A continuación se explican los elementos principales de la sintaxis.

### Estructura de una Query openCypher

En Apache AGE, las queries openCypher se ejecutan mediante la función `cypher()`:

```sql
SELECT * FROM cypher('nombre_grafo', $$
    -- Query openCypher aquí
$$) AS (columna1 tipo1, columna2 tipo2, ...);
```

### Cláusulas Principales

#### CREATE - Crear Nodos y Relaciones

Crear un nodo:
```cypher
CREATE (u:Usuario {id_usuario: 1, nombre: 'Juan', edad: 30})
```

Crear una relación:
```cypher
MATCH (u1:Usuario {id_usuario: 1}), (u2:Usuario {id_usuario: 2})
CREATE (u1)-[:CONECTADO]->(u2)
```

#### MATCH - Buscar Patrones

Buscar un nodo específico:
```cypher
MATCH (u:Usuario {id_usuario: 1})
RETURN u
```

Buscar una relación:
```cypher
MATCH (u:Usuario)-[:TIENE_HOBBY]->(h:Hobby)
RETURN u.nombre, h.nombre
```

#### WHERE - Filtrar Resultados

```cypher
MATCH (u:Usuario)
WHERE u.edad > 30
RETURN u.nombre, u.edad
```

#### RETURN - Devolver Resultados

```cypher
MATCH (u:Usuario)
RETURN u.id_usuario, u.nombre, u.apellidos
ORDER BY u.edad DESC
LIMIT 10
```

#### SET - Actualizar Propiedades

```cypher
MATCH (u:Usuario {id_usuario: 1})
SET u.edad = 31
RETURN u
```

#### DELETE - Eliminar Nodos o Relaciones

Eliminar solo una relación:
```cypher
MATCH (u1:Usuario)-[r:CONECTADO]->(u2:Usuario)
WHERE u1.id_usuario = 1 AND u2.id_usuario = 2
DELETE r
```

Eliminar un nodo y todas sus relaciones:
```cypher
MATCH (u:Usuario {id_usuario: 1})
DETACH DELETE u
```

### Funciones de Agregación

```cypher
-- Contar usuarios
MATCH (u:Usuario)
RETURN count(u) AS total_usuarios

-- Agrupar por hobby
MATCH (u:Usuario)-[:TIENE_HOBBY]->(h:Hobby)
RETURN h.nombre, count(u) AS cantidad_usuarios
ORDER BY cantidad_usuarios DESC
```

### UNWIND - Iterar sobre Listas

`UNWIND` descompone una lista en filas individuales:

```cypher
UNWIND [{nombre: 'Juan', edad: 30}, {nombre: 'María', edad: 25}] AS persona
CREATE (u:Usuario)
SET u = persona
```

Esto es equivalente a:
```cypher
CREATE (u1:Usuario {nombre: 'Juan', edad: 30})
CREATE (u2:Usuario {nombre: 'María', edad: 25})
```

### Patrones de Rutas

Camino de longitud variable:
```cypher
-- Amigos de amigos (2 saltos)
MATCH (u:Usuario {id_usuario: 1})-[:CONECTADO*2]->(fof:Usuario)
RETURN fof.nombre

-- Camino más corto (entre 1 y 5 saltos)
MATCH path = (u1:Usuario {id_usuario: 1})-[:CONECTADO*1..5]-(u2:Usuario {id_usuario: 10})
RETURN path
LIMIT 1
```

### OPTIONAL MATCH - Coincidencias Opcionales

Similar a LEFT JOIN en SQL:

```cypher
MATCH (u:Usuario)
OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)
RETURN u.nombre, h.nombre AS hobby
```

Si un usuario no tiene hobby, `h.nombre` será `NULL`, pero el usuario aún aparecerá en los resultados.

### WITH - Encadenar Queries

Permite pasar resultados intermedios a la siguiente parte de la query:

```cypher
MATCH (u:Usuario)-[:CONECTADO]->(amigo:Usuario)
WITH u, collect(amigo.id_usuario) AS amigos
WHERE size(amigos) > 5
RETURN u.nombre, size(amigos) AS cantidad_amigos
```

## Ejemplos de Queries del Proyecto

### Obtener todos los usuarios con sus hobbies

```cypher
MATCH (u:Usuario)
OPTIONAL MATCH (u)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
RETURN u.id_usuario, u.nombre, u.apellidos, h.nombre AS hobby, c.nombre AS categoria
ORDER BY u.id_usuario
```

### Crear un nuevo usuario con hobby

```cypher
-- Primero encontrar el hobby
MATCH (h:Hobby {id_hobby: 5})
-- Crear el usuario
CREATE (u:Usuario {
    id_usuario: 1001,
    nombre: 'Carlos',
    apellidos: 'Pérez',
    edad: 28,
    latitud: -16.4090,
    longitud: -71.5375
})
-- Crear la relación
CREATE (u)-[:TIENE_HOBBY]->(h)
RETURN u
```

### Encontrar amigos de amigos

```cypher
MATCH (user:Usuario {id_usuario: 1})-[:CONECTADO]->(friend:Usuario)-[:CONECTADO]->(fof:Usuario)
WHERE user.id_usuario <> fof.id_usuario
  AND NOT EXISTS((user)-[:CONECTADO]->(fof))
WITH fof, collect(DISTINCT friend.id_usuario) AS common_friends
RETURN fof.id_usuario, fof.nombre, fof.apellidos, common_friends
ORDER BY size(common_friends) DESC
LIMIT 10
```

### Camino más corto entre dos usuarios

```cypher
MATCH path = (origen:Usuario {id_usuario: 1})-[:CONECTADO*1..3]-(destino:Usuario {id_usuario: 50})
RETURN path
LIMIT 1
```

## Integración con PostgreSQL

Una de las ventajas de Apache AGE es que puedes combinar queries de grafos con SQL tradicional:

```sql
-- Query mixta: SQL + openCypher
SELECT
    usuario_data.nombre,
    usuario_data.edad,
    (SELECT count(*)
     FROM cypher('red_usuarios', $$
         MATCH (u:Usuario)-[:CONECTADO]->(amigo:Usuario)
         WHERE u.id_usuario = $1
         RETURN count(amigo)
     $$, usuario_data.id_usuario) AS (total agtype)
    ) AS cantidad_amigos
FROM (
    SELECT * FROM cypher('red_usuarios', $$
        MATCH (u:Usuario)
        RETURN u.id_usuario, u.nombre, u.edad
    $$) AS (id_usuario agtype, nombre agtype, edad agtype)
) AS usuario_data;
```

## Tipo de Datos AGTYPE

Apache AGE utiliza el tipo `agtype`, un tipo de datos JSONB extendido que puede representar:

- Vértices (nodos)
- Aristas (relaciones)
- Propiedades (números, strings, booleanos, listas, mapas)
- Rutas (paths)

### Acceder a Propiedades en SQL

```sql
-- Acceder a una propiedad específica
SELECT properties->>'nombre' AS nombre
FROM red_usuarios."Usuario"
WHERE (properties->>'id_usuario')::integer = 1;

-- Usando el operador de acceso de AGE
SELECT ag_catalog.agtype_access_operator(properties, '"nombre"'::agtype)
FROM red_usuarios."Usuario";
```

## Ventajas de Usar Apache AGE en Este Proyecto

1. **Modelado Natural**: Las redes sociales son inherentemente grafos. AGE permite modelar usuarios y sus conexiones de forma natural.

2. **Consultas Expresivas**: Queries como "camino más corto" o "amigos de amigos" son simples en openCypher pero complejas en SQL puro.

3. **Rendimiento**: Los traversals de grafos son más eficientes que múltiples JOINs en SQL.

4. **Flexibilidad**: Las propiedades en formato JSON permiten añadir atributos sin modificar el esquema.

5. **Un Solo Sistema**: No necesitamos mantener PostgreSQL para datos relacionales y Neo4j (u otra DB de grafos) por separado.

## Estructura del Grafo `red_usuarios`

```
                    ┌─────────────────────┐
                    │  CategoriaHobby     │
                    │  - id_categoria     │
                    │  - nombre           │
                    └──────────▲──────────┘
                               │
                               │ [:PERTENECE_A]
                               │
                    ┌──────────┴──────────┐
                    │     Hobby           │
                    │  - id_hobby         │
                    │  - nombre           │
                    └──────────▲──────────┘
                               │
                               │ [:TIENE_HOBBY]
                               │
                    ┌──────────┴──────────┐
                    │    Usuario          │
                    │  - id_usuario       │
                    │  - nombre           │
                    │  - apellidos        │
                    │  - edad             │
                    │  - latitud          │
                    │  - longitud         │
                    └──────────┬──────────┘
                               │
                               │ [:CONECTADO]
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Usuario          │
                    └─────────────────────┘
```

## Verificar la Instalación

Para verificar que Apache AGE se instaló correctamente:

```sql
-- Verificar extensión
SELECT * FROM pg_extension WHERE extname = 'age';

-- Listar grafos
SELECT * FROM ag_catalog.ag_graph;

-- Contar vértices en el grafo
SELECT * FROM cypher('red_usuarios', $$
    MATCH (n)
    RETURN labels(n) AS tipo, count(n) AS cantidad
$$) AS (tipo agtype, cantidad agtype);

-- Contar relaciones en el grafo
SELECT * FROM cypher('red_usuarios', $$
    MATCH ()-[r]->()
    RETURN type(r) AS tipo_relacion, count(r) AS cantidad
$$) AS (tipo_relacion agtype, cantidad agtype);
```

## Referencias Bibliográficas

1. Apache Software Foundation. (2024). *Apache AGE Documentation*. Apache Software Foundation. Recuperado de https://age.apache.org/age-manual/master/
2. openCypher Project. (2024). *openCypher Query Language Specification*. openCypher. Recuperado de https://opencypher.org/
3. PostgreSQL Global Development Group. (2024). *PostgreSQL Documentation*. PostgreSQL. Recuperado de https://www.postgresql.org/docs/
4. Robinson, I., Webber, J., & Eifrem, E. (2015). *Graph Databases: New Opportunities for Connected Data*. O'Reilly Media. Recuperado de https://www.oreilly.com/library/view/graph-databases-2nd/9781491930819/
5. Rodriguez, M. A., & Neubauer, P. (2010). *Constructions from Dots and Lines*. Bulletin of the American Society for Information Science and Technology, 36(6), 35-41. Recuperado de https://doi.org/10.1002/bult.2010.1720360610
6. Angles, R., & Gutierrez, C. (2008). *Survey of graph database models*. ACM Computing Surveys, 40(1), 1-39. Recuperado de https://doi.org/10.1145/1322432.1322433
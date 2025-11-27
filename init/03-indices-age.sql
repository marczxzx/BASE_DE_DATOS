-- Índices para el grafo red_usuarios en Apache AGE
-- Estos índices mejoran el rendimiento de las consultas comunes

-- Cambiar al esquema de Apache AGE
SET search_path = ag_catalog, "$user", public;

-- ÍNDICES SOBRE VÉRTICES: Usuario
-- Index general GIN para búsquedas por cualquier propiedad de Usuario
CREATE INDEX IF NOT EXISTS idx_usuario_properties_gin
    ON red_usuarios."Usuario"
    USING GIN (properties);

-- Index (casi siempre único) por id_usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuario_id_usuario
    ON red_usuarios."Usuario" (
        ag_catalog.agtype_access_operator(properties, '"id_usuario"'::agtype)
    );

-- Index combinado por nombre + apellidos (para búsquedas y ordenamientos)
CREATE INDEX IF NOT EXISTS idx_usuario_nombre_apellidos
    ON red_usuarios."Usuario" (
        ag_catalog.agtype_access_operator(properties, '"nombre"'::agtype),
        ag_catalog.agtype_access_operator(properties, '"apellidos"'::agtype)
    );

-- ÍNDICES SOBRE VÉRTICES: Hobby
-- GIN para buscar hobbies por cualquier propiedad
CREATE INDEX IF NOT EXISTS idx_hobby_properties_gin
    ON red_usuarios."Hobby"
    USING GIN (properties);

-- Búsquedas por id_hobby
CREATE UNIQUE INDEX IF NOT EXISTS idx_hobby_id_hobby
    ON red_usuarios."Hobby" (
        ag_catalog.agtype_access_operator(properties, '"id_hobby"'::agtype)
    );

-- Búsquedas por nombre de hobby
CREATE INDEX IF NOT EXISTS idx_hobby_nombre
    ON red_usuarios."Hobby" (
        ag_catalog.agtype_access_operator(properties, '"nombre"'::agtype)
    );

-- ÍNDICES SOBRE VÉRTICES: CategoriaHobby
-- GIN para buscar categorías por cualquier propiedad
CREATE INDEX IF NOT EXISTS idx_categoria_properties_gin
    ON red_usuarios."CategoriaHobby"
    USING GIN (properties);

-- Búsquedas por id_categoria_hobby
CREATE UNIQUE INDEX IF NOT EXISTS idx_categoria_id_categoria
    ON red_usuarios."CategoriaHobby" (
        ag_catalog.agtype_access_operator(properties, '"id_categoria_hobby"'::agtype)
    );

-- Búsquedas por nombre de categoría
CREATE INDEX IF NOT EXISTS idx_categoria_nombre
    ON red_usuarios."CategoriaHobby" (
        ag_catalog.agtype_access_operator(properties, '"nombre"'::agtype)
    );

-- ÍNDICES SOBRE ARISTAS (EDGES)
-- Estas ayudan a:
--   - caminos más cortos
--   - friend-of-friend
--   - consultas rápidas por relaciones

-- Edge CONECTADO (Usuario -> Usuario)
-- Índice por (start_id, end_id) para recorridos y caminos
CREATE INDEX IF NOT EXISTS idx_conectado_start_end
    ON red_usuarios."CONECTADO" (start_id, end_id);

-- GIN por propiedades de la arista (por si luego añades peso, fecha, etc.)
CREATE INDEX IF NOT EXISTS idx_conectado_properties_gin
    ON red_usuarios."CONECTADO"
    USING GIN (properties);

-- Edge TIENE_HOBBY (Usuario -> Hobby)
CREATE INDEX IF NOT EXISTS idx_tiene_hobby_start_end
    ON red_usuarios."TIENE_HOBBY" (start_id, end_id);

CREATE INDEX IF NOT EXISTS idx_tiene_hobby_properties_gin
    ON red_usuarios."TIENE_HOBBY"
    USING GIN (properties);

-- Edge PERTENECE_A (Hobby -> CategoriaHobby)
CREATE INDEX IF NOT EXISTS idx_pertenece_a_start_end
    ON red_usuarios."PERTENECE_A" (start_id, end_id);

CREATE INDEX IF NOT EXISTS idx_pertenece_a_properties_gin
    ON red_usuarios."PERTENECE_A"
    USING GIN (properties);

-- Crear extensión AGE automáticamente al iniciar
CREATE EXTENSION IF NOT EXISTS age;
LOAD 'age';
SET search_path = ag_catalog, "$user", public;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE 'Apache AGE instalado y configurado correctamente';
END
$$;
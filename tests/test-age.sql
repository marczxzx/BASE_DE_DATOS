-- Obtener todos los usuarios con sus ubicaciones, hobby y categoría
SELECT * FROM cypher('red_usuarios', $$
    MATCH (u:Usuario)-[:TIENE_HOBBY]->(h:Hobby)-[:PERTENECE_A]->(c:CategoriaHobby)
    RETURN 
        u.id_usuario AS id_usuario,
        u.nombre AS nombre,
        u.apellidos AS apellidos,
        u.edad AS edad,
        u.latitud AS latitud,
        u.longitud AS longitud,
        h.id_hobby AS id_hobby,
        h.nombre AS hobby,
        c.id_categoria_hobby AS id_categoria,
        c.nombre AS categoria
    ORDER BY u.nombre ASC, u.apellidos ASC
$$) AS (id_usuario int, nombre text, apellidos text, edad int, latitud float, longitud float, id_hobby int, hobby text, id_categoria int, categoria text);

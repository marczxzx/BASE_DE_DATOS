// Tipos TypeScript para usuarios y respuestas del backend

export interface CategoriaHobby {
  id_categoria_hobby: number;
  nombre: string;
}

export interface Hobby {
  id_hobby: number;
  nombre: string;
  categoria: CategoriaHobby;
}

export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  edad: number;
  latitud: number;
  longitud: number;
  hobby: Hobby | null;
}

export interface PaginationMetadata {
  total: number;
  skip: number;
  limit: number;
  pages: number;
  current_page: number;
}

export interface UsuariosResponse {
  status_code: number;
  message: string;
  usuarios: Usuario[];
  pagination: PaginationMetadata;
}

// Tipos para conexiones entre usuarios
export interface UsuarioConexiones {
  id_usuario: number;
  conexiones: number[];
}

export interface ConexionesStats {
  total_usuarios_con_conexiones: number;
  total_conexiones: number;
}

export interface ConexionesResponse {
  status_code: number;
  message: string;
  conexiones: UsuarioConexiones[];
  stats: ConexionesStats;
}

// Servicio API para comunicación con el backend

import type { UsuariosResponse, Hobby, ConexionesResponse } from '@/types/usuario';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';

export interface CreateUsuarioData {
  nombre: string;
  apellidos: string;
  edad: number;
  latitud: number;
  longitud: number;
  id_hobby?: number;
}

export interface CreateUsuarioResponse {
  status_code: number;
  message: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    apellidos: string;
    edad: number;
    latitud: number;
    longitud: number;
    hobby: Hobby | null;
    conexiones: number[];
  };
}

export interface UpdateUsuarioData {
  nombre: string;
  apellidos: string;
  edad: number;
  latitud: number;
  longitud: number;
  id_hobby?: number | null;
}

export interface UpdateUsuarioResponse {
  status_code: number;
  message: string;
  usuario: {
    id_usuario: number;
    nombre: string;
    apellidos: string;
    edad: number;
    latitud: number;
    longitud: number;
    hobby: Hobby | null;
    conexiones: number[];
  };
}

export interface DeleteUsuarioResponse {
  status_code: number;
  message: string;
  id_usuario: number;
}

export interface CreateConexionData {
  id_usuario_origen: number;
  id_usuario_destino: number;
}

export interface CreateConexionResponse {
  status_code: number;
  message: string;
  conexion: {
    id_usuario_origen: number;
    id_usuario_destino: number;
  };
}

export interface UsuarioConexion {
  id_usuario: number;
  nombre: string;
  apellidos: string;
  edad: number;
  latitud: number;
  longitud: number;
  hobby: Hobby | null;
}

export interface GetUsuarioConexionesResponse {
  status_code: number;
  id_usuario: number;
  conexiones: UsuarioConexion[];
}

export interface DeleteConexionResponse {
  status_code: number;
  message: string;
  conexion_eliminada: {
    id_usuario_origen: number;
    id_usuario_destino: number;
  };
}

export interface ShortestPathNode {
  id_usuario: number;
  nombre_completo: string;
}

export interface ShortestPathResponse {
  status_code: number;
  message: string;
  path: ShortestPathNode[];
  length: number;
  exists: boolean;
}

export interface HobbiesResponse {
  status_code: number;
  message: string;
  hobbies: Hobby[];
  total: number;
}

export const api = {
  /**
   * Obtiene usuarios del backend con paginación
   * @param skip - Número de registros a saltar (default: 0)
   * @param limit - Número máximo de registros (default: 1000, max: 1000)
   * @returns Promise con la respuesta de usuarios
   */
  async getUsuarios(skip: number = 0, limit: number = 1000): Promise<UsuariosResponse> {
    // Validar límite máximo permitido por el backend
    const validLimit = Math.min(limit, 1000);

    const response = await fetch(
      `${API_BASE_URL}/api/v1/usuarios?skip=${skip}&limit=${validLimit}`
    );

    if (!response.ok) {
      throw new Error(`Error al obtener usuarios: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Crea un nuevo usuario
   * @param data - Datos del usuario a crear
   * @returns Promise con la respuesta del usuario creado
   */
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
  },

  /**
   * Actualiza un usuario existente
   * @param id_usuario - ID del usuario a actualizar
   * @param data - Datos del usuario a actualizar
   * @returns Promise con la respuesta del usuario actualizado
   */
  async updateUsuario(id_usuario: number, data: UpdateUsuarioData): Promise<UpdateUsuarioResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/usuarios/${id_usuario}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Error al actualizar usuario');
    }

    return response.json();
  },

  /**
   * Elimina un usuario existente
   * @param id_usuario - ID del usuario a eliminar
   * @returns Promise con la respuesta de confirmación
   */
  async deleteUsuario(id_usuario: number): Promise<DeleteUsuarioResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/usuarios/${id_usuario}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Error al eliminar usuario');
    }

    return response.json();
  },

  /**
   * Obtiene todas las conexiones del grafo
   * @returns Promise con la respuesta de conexiones
   */
  async getConexiones(): Promise<ConexionesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/graph/connections`);

    if (!response.ok) {
      throw new Error(`Error al obtener conexiones: ${response.statusText}`);
    }

    return response.json();
  },

  /**
   * Crea una nueva conexión entre dos usuarios
   * @param data - IDs del usuario origen y destino
   * @returns Promise con la respuesta de la conexión creada
   */
  async createConexion(data: CreateConexionData): Promise<CreateConexionResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/usuarios/conexiones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Error al crear conexión');
    }

    return response.json();
  },

  /**
   * Obtiene todas las conexiones de un usuario específico
   * @param id_usuario - ID del usuario
   * @returns Promise con la respuesta de las conexiones del usuario
   */
  async getUsuarioConexiones(id_usuario: number): Promise<GetUsuarioConexionesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/usuarios/${id_usuario}/conexiones`);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Error al obtener conexiones del usuario');
    }

    return response.json();
  },

  /**
   * Elimina una conexión entre dos usuarios
   * @param id_usuario_origen - ID del usuario origen
   * @param id_usuario_destino - ID del usuario destino
   * @returns Promise con la respuesta de confirmación
   */
  async deleteConexion(id_usuario_origen: number, id_usuario_destino: number): Promise<DeleteConexionResponse> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/usuarios/conexiones/${id_usuario_origen}/${id_usuario_destino}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Error al eliminar conexión');
    }

    return response.json();
  },

  /**
   * Obtiene el camino más corto entre dos usuarios
   * @param idOrigen - ID del usuario origen
   * @param idDestino - ID del usuario destino
   * @param maxDepth - Profundidad máxima de búsqueda (default: 3, range: 1-5)
   * @returns Promise con la respuesta del camino más corto
   */
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
  },

  /**
   * Obtiene todos los hobbies disponibles
   * @returns Promise con la respuesta de hobbies
   */
  async getHobbies(): Promise<HobbiesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/hobbies`);

    if (!response.ok) {
      throw new Error(`Error al obtener hobbies: ${response.statusText}`);
    }

    return response.json();
  },
};

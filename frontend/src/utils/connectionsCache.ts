import type { QueryClient } from '@tanstack/react-query';
import type { ConexionesResponse, Usuario } from '@/types/usuario';
import type { GetUsuarioConexionesResponse, UsuarioConexion } from '@/services/api';

const toUsuarioConexion = (usuario: Usuario): UsuarioConexion => ({
  id_usuario: usuario.id_usuario,
  nombre: usuario.nombre,
  apellidos: usuario.apellidos,
  edad: usuario.edad,
  latitud: usuario.latitud,
  longitud: usuario.longitud,
  hobby: usuario.hobby,
});

export const optimisticAddConnection = (
  queryClient: QueryClient,
  idUsuarioOrigen: number,
  destino: Usuario,
) => {
  queryClient.setQueryData<ConexionesResponse | undefined>(['conexiones'], (old) => {
    if (!old) return old;
    const conexiones = old.conexiones.map((entry) => ({ ...entry, conexiones: [...entry.conexiones] }));
    let entry = conexiones.find((c) => c.id_usuario === idUsuarioOrigen);
    let addedUserCount = 0;

    if (!entry) {
      entry = { id_usuario: idUsuarioOrigen, conexiones: [] };
      conexiones.push(entry);
      addedUserCount = 1;
    }

    if (!entry.conexiones.includes(destino.id_usuario)) {
      entry.conexiones.push(destino.id_usuario);
    }

    const stats = old.stats
      ? {
          ...old.stats,
          total_conexiones: old.stats.total_conexiones + 1,
          total_usuarios_con_conexiones:
            old.stats.total_usuarios_con_conexiones + (entry.conexiones.length === 1 ? addedUserCount || 1 : addedUserCount),
        }
      : old.stats;

    return { ...old, conexiones, stats };
  });

  queryClient.setQueryData<GetUsuarioConexionesResponse | undefined>(
    ['usuario-conexiones', idUsuarioOrigen],
    (old) => {
      if (!old) return old;
      const exists = old.conexiones.some((c) => c.id_usuario === destino.id_usuario);
      if (exists) return old;
      return {
        ...old,
        conexiones: [...old.conexiones, toUsuarioConexion(destino)],
      };
    },
  );
};

export const optimisticRemoveConnection = (
  queryClient: QueryClient,
  idUsuarioOrigen: number,
  idUsuarioDestino: number,
) => {
  queryClient.setQueryData<ConexionesResponse | undefined>(['conexiones'], (old) => {
    if (!old) return old;

    const conexiones = old.conexiones.map((entry) => ({
      ...entry,
      conexiones: entry.conexiones.filter((c) => c !== idUsuarioDestino),
    }));

    const entry = conexiones.find((c) => c.id_usuario === idUsuarioOrigen);
    const removedUserCount = entry && entry.conexiones.length === 0 ? 1 : 0;

    const stats = old.stats
      ? {
          ...old.stats,
          total_conexiones: Math.max(0, old.stats.total_conexiones - 1),
          total_usuarios_con_conexiones: Math.max(
            0,
            old.stats.total_usuarios_con_conexiones - removedUserCount,
          ),
        }
      : old.stats;

    return { ...old, conexiones, stats };
  });

  queryClient.setQueryData<GetUsuarioConexionesResponse | undefined>(
    ['usuario-conexiones', idUsuarioOrigen],
    (old) => {
      if (!old) return old;
      return {
        ...old,
        conexiones: old.conexiones.filter((c) => c.id_usuario !== idUsuarioDestino),
      };
    },
  );
};

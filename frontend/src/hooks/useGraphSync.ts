import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getPendingUsers, removePendingUser } from '@/utils/pendingUsers';
import type { UsuariosResponse } from '@/types/usuario';

/**
 * Hook personalizado para sincronización automática del grafo después de operaciones CRUD.
 *
 * Este hook proporciona funciones que automáticamente invalidan las queries de usuarios
 * y conexiones después de operaciones de creación, actualización o eliminación.
 *
 * Uso:
 * ```typescript
 * const { syncAfterUserCreate, syncAfterUserUpdate, syncAfterUserDelete, syncAfterConnectionUpdate } = useGraphSync();
 *
 * // Después de crear un usuario
 * await api.createUser(userData);
 * syncAfterUserCreate();
 * ```
 */
export const useGraphSync = () => {
  const queryClient = useQueryClient();

  const clearPersistedGraphCache = useCallback(() => {
    const keys = [
      'REACT_QUERY_OFFLINE_CACHE', // cache generado por PersistQueryClientProvider
      'social-graph-usuarios-v1',
      'social-graph-conexiones-v1',
    ];

    keys.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // Ignorar errores en entornos donde sessionStorage no esté disponible
      }
    });
  }, []);

  const mergePendingUsersIntoCache = useCallback(() => {
    const pendingUsers = getPendingUsers();
    if (pendingUsers.length === 0) return;

    queryClient.setQueryData<UsuariosResponse | undefined>(['usuarios'], (current) => {
      if (!current?.usuarios) return current;
      const existingIds = new Set(current.usuarios.map((u) => u.id_usuario));
      let mutated = false;

      const merged = [...current.usuarios];
      pendingUsers.forEach((user) => {
        if (!existingIds.has(user.id_usuario)) {
          merged.push(user);
          mutated = true;
        } else {
          removePendingUser(user.id_usuario);
        }
      });

      return mutated ? { ...current, usuarios: merged } : current;
    });
  }, [queryClient]);

  /**
   * Invalida y vuelve a obtener las queries principales del grafo.
   * Incluye usuarios, conexiones y cualquier cache de conexiones por usuario.
   */
  const syncAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['usuarios'], refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['conexiones'], refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['usuario-conexiones'], exact: false }),
    ]);

    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['usuarios'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['conexiones'], type: 'active' }),
    ]);

    mergePendingUsersIntoCache();
  }, [mergePendingUsersIntoCache, queryClient]);

  const syncConnectionsOnly = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['conexiones'], refetchType: 'active' }),
      queryClient.invalidateQueries({ queryKey: ['usuario-conexiones'], exact: false }),
      queryClient.invalidateQueries({ queryKey: ['usuarios'], refetchType: 'active' }),
    ]);

    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['conexiones'], type: 'active' }),
      queryClient.refetchQueries({ queryKey: ['usuarios'], type: 'active' }),
    ]);

    mergePendingUsersIntoCache();
  }, [mergePendingUsersIntoCache, queryClient]);

  /**
   * Sincronización después de CREAR un usuario.
   * Invalida ambas queries para que el grafo refleje inmediatamente el nuevo nodo.
   */
  const syncAfterUserCreate = useCallback(() => {
    clearPersistedGraphCache();
    void syncAll();
  }, [clearPersistedGraphCache, syncAll]);

  /**
   * Sincronización después de ACTUALIZAR un usuario.
   * Invalida ambas queries porque las conexiones pueden cambiar por datos derivados.
   */
  const syncAfterUserUpdate = useCallback(() => {
    clearPersistedGraphCache();
    void syncAll();
  }, [clearPersistedGraphCache, syncAll]);

  /**
   * Sincronización después de ELIMINAR un usuario.
   * Invalida AMBAS porque eliminar un usuario también elimina sus conexiones.
   */
  const syncAfterUserDelete = useCallback(() => {
    clearPersistedGraphCache();
    void syncAll();
  }, [clearPersistedGraphCache, syncAll]);

  /**
   * Sincronización después de CREAR/ELIMINAR conexiones.
   * Invalida ambas queries porque los contadores agregados y tooltips dependen de los dos datasets.
   */
  const syncAfterConnectionUpdate = useCallback(() => {
    void syncConnectionsOnly();
  }, [syncConnectionsOnly]);

  /**
   * Fuerza un refetch inmediato de ambas queries sin invalidar el caché.
   * Útil para actualizaciones en tiempo real o polling.
   */
  const forceRefresh = useCallback(async () => {
    clearPersistedGraphCache();
    await Promise.all([
      queryClient.refetchQueries({ queryKey: ['usuarios'] }),
      queryClient.refetchQueries({ queryKey: ['conexiones'] })
    ]);
  }, [clearPersistedGraphCache, queryClient]);

  /**
   * Limpia el caché de sessionStorage y fuerza una carga fresca desde el servidor.
   * Útil cuando se detecta inconsistencia de datos.
   */
  const resetCache = useCallback(() => {
    clearPersistedGraphCache();

    // Resetear queries (elimina del caché)
    queryClient.resetQueries({ queryKey: ['usuarios'] });
    queryClient.resetQueries({ queryKey: ['conexiones'] });
  }, [clearPersistedGraphCache, queryClient]);

  return {
    // Sincronizaciones específicas por operación
    syncAfterUserCreate,
    syncAfterUserUpdate,
    syncAfterUserDelete,
    syncAfterConnectionUpdate,
    syncAfterConnectionCreate: syncAfterConnectionUpdate, // Alias para crear conexión

    // Sincronización completa
    syncAll,
    syncConnectionsOnly,

    // Utilidades avanzadas
    forceRefresh,
    resetCache,
  };
};

export default useGraphSync;

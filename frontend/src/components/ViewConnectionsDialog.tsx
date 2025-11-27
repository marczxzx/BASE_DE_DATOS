import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type UsuarioConexion } from '@/services/api';
import { capitalizeWords } from '@/utils/textTransform';
import { getHobbyColor } from '@/utils/hobbyColors';
import { DeleteConnectionDialog } from './DeleteConnectionDialog';
import { SearchBar } from './SearchBar';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import type { Usuario } from '@/types/usuario';
import { optimisticAddConnection, optimisticRemoveConnection } from '@/utils/connectionsCache';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Trash2, Plus, X } from 'lucide-react';

interface ViewConnectionsDialogProps {
  idUsuario: number;
  nombreUsuario: string;
  apellidoUsuario: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewConnectionsDialog({
  idUsuario,
  nombreUsuario,
  apellidoUsuario,
  open,
  onOpenChange,
}: ViewConnectionsDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConnection, setSelectedConnection] = useState<UsuarioConexion | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Estados para añadir conexión
  const [isAddingConnection, setIsAddingConnection] = useState(false);
  const [selectedDestino, setSelectedDestino] = useState<Usuario | null>(null);

  const { syncAfterConnectionCreate } = useGraphSync();
  const queryClient = useQueryClient();

  // Query para obtener las conexiones del usuario
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['usuario-conexiones', idUsuario],
    queryFn: () => api.getUsuarioConexiones(idUsuario),
    enabled: open, // Solo hacer la petición cuando el diálogo está abierto
  });

  // Filtrar conexiones por el término de búsqueda (nombre, apellidos o ID)
  const filteredConexiones = useMemo(() => {
    if (!data?.conexiones) return [];

    if (!searchTerm.trim()) return data.conexiones;

    const term = searchTerm.toLowerCase();
    return data.conexiones.filter((conexion) => {
      const nombreCompleto = `${conexion.nombre} ${conexion.apellidos}`.toLowerCase();
      return (
        nombreCompleto.includes(term) ||
        conexion.id_usuario.toString().includes(term)
      );
    });
  }, [data?.conexiones, searchTerm]);

  // IDs a excluir del buscador: usuario actual + usuarios ya conectados
  const excludeIds = useMemo(() => {
    const ids = [idUsuario]; // Excluir usuario actual
    if (data?.conexiones) {
      const connectedIds = data.conexiones.map((c) => c.id_usuario);
      ids.push(...connectedIds); // Excluir usuarios ya conectados
    }
    return ids;
  }, [idUsuario, data?.conexiones]);

  // Verificar si la conexión ya existe
  const connectionExists = useMemo(() => {
    if (!selectedDestino || !data?.conexiones) return false;
    return data.conexiones.some((c) => c.id_usuario === selectedDestino.id_usuario);
  }, [selectedDestino, data?.conexiones]);

  const handleDeleteClick = (conexion: UsuarioConexion) => {
    setSelectedConnection(conexion);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    if (selectedConnection) {
      optimisticRemoveConnection(queryClient, idUsuario, selectedConnection.id_usuario);
    }
    // Refrescar la lista de conexiones despu?s de eliminar
    refetch();
  };

  // Mutation para crear conexión
  const createMutation = useMutation({
    mutationFn: api.createConexion,
    onSuccess: () => {
      toast.success(`Conexión creada exitosamente`, {
        description: `${capitalizeWords(nombreUsuario)} → ${capitalizeWords(selectedDestino!.nombre)}`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });
      optimisticAddConnection(queryClient, idUsuario, selectedDestino!);

      // Sincronizar grafo automáticamente
      syncAfterConnectionCreate();

      // Refrescar lista de conexiones
      refetch();

      // Reset form
      resetAddConnectionForm();
    },
    onError: (error: Error) => {
      toast.error(`Error al crear conexión`, {
        description: error.message,
        duration: 4000,
        style: {
          background: '#dc2626',
          color: 'white',
          border: '1px solid #b91c1c',
        },
        className: '[&_*]:!text-white',
      });
    },
  });

  const handleAddConnection = () => {
    setIsAddingConnection(true);
    setSearchTerm(''); // Limpiar búsqueda de conexiones
  };

  const resetAddConnectionForm = () => {
    setIsAddingConnection(false);
    setSelectedDestino(null);
  };

  const handleSelectDestino = (usuario: Usuario) => {
    setSelectedDestino(usuario);
  };

  const handleSubmitConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestino || connectionExists) return;

    createMutation.mutate({
      id_usuario_origen: idUsuario,
      id_usuario_destino: selectedDestino.id_usuario,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="pr-12">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-black">
                  Conexiones de {capitalizeWords(nombreUsuario)} {capitalizeWords(apellidoUsuario)}
                </DialogTitle>
              </div>
              {!isAddingConnection && (
                <Button
                  onClick={handleAddConnection}
                  className="gap-2 shrink-0"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Añadir Conexión
                </Button>
              )}
            </div>
            <DialogDescription className="text-black">
              {isAddingConnection ? (
                'Selecciona el usuario destino para crear una nueva conexión'
              ) : data?.conexiones.length === 0 ? (
                'Este usuario no tiene conexiones'
              ) : data?.conexiones.length === 1 ? (
                '1 conexión encontrada'
              ) : (
                `${data?.conexiones.length || 0} conexiones encontradas`
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Mini-formulario para añadir conexión */}
          {isAddingConnection ? (
            <form onSubmit={handleSubmitConnection} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-black">Usuario Destino <span className="text-red-500">*</span></Label>

                {selectedDestino ? (
                  <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => setSelectedDestino(null)}
                      className="absolute right-2 top-2 hover:bg-white/50 rounded p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Deseleccionar usuario destino</span>
                    </button>
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600">Usuario seleccionado:</span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-semibold text-black">
                        {capitalizeWords(selectedDestino.nombre)} {capitalizeWords(selectedDestino.apellidos)}
                      </p>
                      <p className="text-sm text-gray-600">ID: {selectedDestino.id_usuario}</p>
                      <p className="text-sm text-gray-600">
                        {selectedDestino.edad} años • {selectedDestino.hobby?.nombre || 'Sin hobby'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <SearchBar
                    onSelectUser={handleSelectDestino}
                    excludeIds={excludeIds}
                    placeholder="Buscar usuario para conectar..."
                    className="max-w-full"
                  />
                )}
              </div>

              {/* Mensaje de validación si ya existe la conexión */}
              {connectionExists && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-700">
                    Esta conexión ya existe en el grafo
                  </p>
                </div>
              )}

              {/* Botones */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={resetAddConnectionForm}
                  disabled={createMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedDestino || connectionExists || createMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {createMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Crear Conexión
                </Button>
              </div>
            </form>
          ) : (
            <>
              {/* Buscador */}
              {data && data.conexiones.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por nombre, apellido o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10 text-black placeholder:text-gray-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-gray-600">Cargando conexiones...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600">Error al cargar conexiones</p>
                <p className="text-xs text-gray-500">{(error as Error).message}</p>
              </div>
            ) : !data || data.conexiones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">No hay conexiones</p>
                <p className="text-xs text-gray-500">Este usuario no tiene conexiones registradas</p>
              </div>
            ) : filteredConexiones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600">No se encontraron resultados</p>
                <p className="text-xs text-gray-500">Intenta con otro término de búsqueda</p>
              </div>
            ) : (
              /* Tabla de conexiones */
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden sm:table-cell">
                        Hobby
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-20">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredConexiones.map((conexion) => (
                      <tr key={conexion.id_usuario} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900 font-mono">
                            {conexion.id_usuario}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900">
                            {capitalizeWords(conexion.nombre)} {capitalizeWords(conexion.apellidos)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {conexion.edad} años
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <div className="text-sm text-gray-900 capitalize">
                            <span
                              className="inline-block px-3 py-1 rounded-full text-xs font-semibold text-white"
                              style={{
                                backgroundColor: conexion.hobby
                                  ? getHobbyColor(conexion.hobby.categoria?.nombre)
                                  : '#868e96', // Gris para sin hobby
                                boxShadow: conexion.hobby
                                  ? `0 2px 4px ${getHobbyColor(conexion.hobby.categoria?.nombre)}40`
                                  : '0 2px 4px #868e9640'
                              }}
                            >
                              {conexion.hobby ? capitalizeWords(conexion.hobby.nombre) : 'Sin hobby'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(conexion)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                            title="Eliminar conexión"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
              </div>

              {/* Footer con información adicional */}
              {filteredConexiones.length > 0 && (
                <div className="text-xs text-gray-500 text-center pt-2 border-t">
                  Mostrando {filteredConexiones.length} de {data?.conexiones.length || 0} conexiones
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de eliminación */}
      {selectedConnection && (
        <DeleteConnectionDialog
          idUsuarioOrigen={idUsuario}
          nombreUsuarioOrigen={`${capitalizeWords(nombreUsuario)} ${capitalizeWords(apellidoUsuario)}`}
          conexion={selectedConnection}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
}
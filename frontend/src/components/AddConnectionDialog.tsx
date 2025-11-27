import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import { capitalizeWords } from '@/utils/textTransform';
import { SearchBar } from './SearchBar';
import type { Usuario } from '@/types/usuario';

import { optimisticAddConnection } from '@/utils/connectionsCache';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link2, Loader2, X } from 'lucide-react';

export function AddConnectionDialog() {
  const [open, setOpen] = useState(false);
  const [selectedOrigen, setSelectedOrigen] = useState<Usuario | null>(null);
  const [selectedDestino, setSelectedDestino] = useState<Usuario | null>(null);

  const { syncAfterConnectionCreate } = useGraphSync();
  const queryClient = useQueryClient();

  // Obtener conexiones para verificar duplicados
  const { data: conexionesData } = useQuery({
    queryKey: ['conexiones'],
    queryFn: () => api.getConexiones(),
  });

  // IDs a excluir en el buscador de origen (excluir el destino si ya está seleccionado)
  const excludeOrigenIds = useMemo(() => {
    return selectedDestino ? [selectedDestino.id_usuario] : [];
  }, [selectedDestino]);

  // IDs a excluir en el buscador de destino (excluir el origen si ya está seleccionado)
  const excludeDestinoIds = useMemo(() => {
    return selectedOrigen ? [selectedOrigen.id_usuario] : [];
  }, [selectedOrigen]);

  // Handlers para seleccionar usuarios desde SearchBar
  const handleSelectOrigen = (usuario: Usuario) => {
    setSelectedOrigen(usuario);
  };

  const handleSelectDestino = (usuario: Usuario) => {
    setSelectedDestino(usuario);
  };

  // Verificar si la conexión ya existe
  const connectionExists = useMemo(() => {
    if (!selectedOrigen || !selectedDestino || !conexionesData) return false;

    const conexion = conexionesData.conexiones.find(
      (c) => c.id_usuario === selectedOrigen.id_usuario
    );

    return conexion?.conexiones.includes(selectedDestino.id_usuario) || false;
  }, [selectedOrigen, selectedDestino, conexionesData]);

  // Validar si se puede crear la conexión
  const canCreate = useMemo(() => {
    if (!selectedOrigen || !selectedDestino) return false;
    if (selectedOrigen.id_usuario === selectedDestino.id_usuario) return false;
    if (connectionExists) return false;
    return true;
  }, [selectedOrigen, selectedDestino, connectionExists]);

  const createMutation = useMutation({
    mutationFn: api.createConexion,
    onSuccess: () => {
      toast.success(`Conexión creada exitosamente`, {
        description: `${capitalizeWords(selectedOrigen!.nombre)} → ${capitalizeWords(selectedDestino!.nombre)}`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });

      optimisticAddConnection(queryClient, selectedOrigen!.id_usuario, selectedDestino!);

      // Sincronizar grafo automáticamente
      syncAfterConnectionCreate();

      // Reset form
      setSelectedOrigen(null);
      setSelectedDestino(null);
      setOpen(false);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) return;

    createMutation.mutate({
      id_usuario_origen: selectedOrigen!.id_usuario,
      id_usuario_destino: selectedDestino!.id_usuario,
    });
  };

  const resetForm = () => {
    setSelectedOrigen(null);
    setSelectedDestino(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Link2 className="h-4 w-4" />
          Añadir Conexión
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[500px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">Crear Nueva Conexión</DialogTitle>
          <DialogDescription className="text-black">
            Selecciona el usuario origen y el usuario destino para crear una conexión.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Usuario Origen */}
          <div className="space-y-2">
            <Label className="text-black">Usuario Origen <span className="text-red-500">*</span></Label>

            {selectedOrigen ? (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg relative">
                <button
                  type="button"
                  onClick={() => setSelectedOrigen(null)}
                  className="absolute right-2 top-2 mapboxgl-popup-close-button focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Deseleccionar usuario origen</span>
                </button>
                <div className="mb-2">
                  <span className="text-sm font-medium text-gray-600">Usuario seleccionado:</span>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-black">
                    {capitalizeWords(selectedOrigen.nombre)} {capitalizeWords(selectedOrigen.apellidos)}
                  </p>
                  <p className="text-sm text-gray-600">ID: {selectedOrigen.id_usuario}</p>
                  <p className="text-sm text-gray-600">
                    {selectedOrigen.edad} años • {selectedOrigen.hobby?.nombre || 'Sin hobby'}
                  </p>
                </div>
              </div>
            ) : (
              <SearchBar
                onSelectUser={handleSelectOrigen}
                excludeIds={excludeOrigenIds}
                placeholder="Buscar usuario origen..."
                className="max-w-full"
              />
            )}
          </div>

          {/* Usuario Destino */}
          <div className="space-y-2">
            <Label className="text-black">Usuario Destino <span className="text-red-500">*</span></Label>

            {selectedDestino ? (
              <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg relative">
                <button
                  type="button"
                  onClick={() => setSelectedDestino(null)}
                  className="absolute right-2 top-2 mapboxgl-popup-close-button focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                excludeIds={excludeDestinoIds}
                placeholder="Buscar usuario destino..."
                className="max-w-full"
              />
            )}
          </div>

          {/* Mensajes de validación */}
          {selectedOrigen && selectedDestino && selectedOrigen.id_usuario === selectedDestino.id_usuario && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                El usuario origen y destino no pueden ser el mismo
              </p>
            </div>
          )}

          {connectionExists && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-700">
                Esta conexión ya existe en el grafo
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!canCreate || createMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Crear Conexión
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
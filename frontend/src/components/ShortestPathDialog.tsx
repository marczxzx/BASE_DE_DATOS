import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { capitalizeWords } from '@/utils/textTransform';
import { useShortestPath } from '@/contexts/ShortestPathContext';
import { SearchBar } from './SearchBar';
import type { Usuario } from '@/types/usuario';

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
import { Route, Loader2, X } from 'lucide-react';

export function ShortestPathDialog() {
  const { visualizeShortestPath } = useShortestPath();
  const [open, setOpen] = useState(false);
  const [selectedOrigen, setSelectedOrigen] = useState<Usuario | null>(null);
  const [selectedDestino, setSelectedDestino] = useState<Usuario | null>(null);

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

  // Mutation para obtener el shortest path
  const shortestPathMutation = useMutation({
    mutationFn: ({ idOrigen, idDestino }: { idOrigen: number; idDestino: number }) =>
      api.getShortestPath(idOrigen, idDestino, 5),
    onSuccess: (data) => {
      if (data.exists && data.path.length > 0) {
        // Visualizar automáticamente en el mapa
        const pathIds = data.path.map((node) => node.id_usuario);
        visualizeShortestPath(pathIds);

        // Cerrar el modal
        setOpen(false);

        // Resetear formulario
        resetForm();
      } else {
        // Solo mostrar error si no existe camino
        toast.error('No existe camino', {
          description: 'No se encontró una ruta entre estos usuarios',
          duration: 3000,
          style: {
            background: '#dc2626',
            color: 'white',
            border: '1px solid #b91c1c',
          },
          className: '[&_*]:!text-white',
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Error al buscar camino', {
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

  const handleSearch = () => {
    if (!selectedOrigen || !selectedDestino) return;

    shortestPathMutation.mutate({
      idOrigen: selectedOrigen.id_usuario,
      idDestino: selectedDestino.id_usuario,
    });
  };

  const resetForm = () => {
    setSelectedOrigen(null);
    setSelectedDestino(null);
  };

  const canSearch = selectedOrigen && selectedDestino && selectedOrigen.id_usuario !== selectedDestino.id_usuario;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Route className="h-4 w-4" />
          Camino Más Corto
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[90vw] max-w-[600px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">Buscar Camino Más Corto</DialogTitle>
          <DialogDescription className="text-black">
            Encuentra la ruta más corta entre dos usuarios en el grafo social.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Usuario Origen */}
          <div className="space-y-2">
            <Label className="text-black">
              Usuario Origen <span className="text-red-500">*</span>
            </Label>

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
            <Label className="text-black">
              Usuario Destino <span className="text-red-500">*</span>
            </Label>

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

          {/* Validación: usuarios iguales */}
          {selectedOrigen && selectedDestino && selectedOrigen.id_usuario === selectedDestino.id_usuario && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">El usuario origen y destino no pueden ser el mismo</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setOpen(false)}
              disabled={shortestPathMutation.isPending}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch || shortestPathMutation.isPending}
              className="w-full sm:w-auto"
            >
              {shortestPathMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Buscar Camino
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

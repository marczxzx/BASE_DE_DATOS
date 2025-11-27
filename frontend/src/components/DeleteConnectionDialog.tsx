import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import { optimisticRemoveConnection } from '@/utils/connectionsCache';
import { capitalizeWords } from '@/utils/textTransform';
import type { UsuarioConexion } from '@/services/api';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface DeleteConnectionDialogProps {
  idUsuarioOrigen: number;
  nombreUsuarioOrigen: string;
  conexion: UsuarioConexion;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DeleteConnectionDialog({
  idUsuarioOrigen,
  nombreUsuarioOrigen,
  conexion,
  open,
  onOpenChange,
  onSuccess
}: DeleteConnectionDialogProps) {
  const { syncAfterConnectionUpdate } = useGraphSync();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteConexion(idUsuarioOrigen, conexion.id_usuario),
    onSuccess: (data) => {
      toast.success(`Conexión eliminada exitosamente`, {
        description: `La conexión entre ${nombreUsuarioOrigen} y ${capitalizeWords(conexion.nombre)} ${capitalizeWords(conexion.apellidos)} ha sido eliminada`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });
      optimisticRemoveConnection(queryClient, idUsuarioOrigen, conexion.id_usuario);

      // Sincronizar grafo después de eliminar conexión
      syncAfterConnectionUpdate();

      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar conexión`, {
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

  const handleConfirm = () => {
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-[350px] sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-black">
            Confirmar Eliminación de Conexión
          </AlertDialogTitle>
          <AlertDialogDescription className="text-black">
            Esta acción no se puede deshacer. Se eliminará permanentemente la conexión:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Información de la conexión a eliminar */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-red-700 font-semibold text-sm">De:</span>
            <span className="text-red-900 text-sm flex-1">
              <strong>{nombreUsuarioOrigen}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-700 font-semibold text-sm">Hacia:</span>
            <span className="text-red-900 text-sm flex-1">
              <strong>{capitalizeWords(conexion.nombre)} {capitalizeWords(conexion.apellidos)}</strong> (ID: {conexion.id_usuario})
            </span>
          </div>
        </div>

        {/* Advertencia adicional */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-amber-900 text-xs">
            Esta conexión se eliminará del grafo social.
          </p>
        </div>

        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
            className="w-full sm:w-auto order-1 sm:order-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="w-full sm:w-auto order-2 sm:order-2"
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar Eliminación
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
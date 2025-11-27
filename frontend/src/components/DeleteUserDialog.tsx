import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import { capitalizeWords } from '@/utils/textTransform';
import type { Usuario } from '@/types/usuario';

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

interface DeleteUserDialogProps {
  usuario: Usuario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({ usuario, open, onOpenChange }: DeleteUserDialogProps) {
  const { syncAfterUserDelete } = useGraphSync();

  const deleteMutation = useMutation({
    mutationFn: (id_usuario: number) => api.deleteUsuario(id_usuario),
    onSuccess: (data) => {
      toast.success(`Usuario eliminado exitosamente`, {
        description: `${capitalizeWords(usuario.nombre)} ${capitalizeWords(usuario.apellidos)} (ID: ${usuario.id_usuario}) ha sido eliminado del grafo`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });

      // Sincronizar grafo automáticamente después de eliminar usuario
      // Invalida usuarios Y conexiones (porque sus conexiones también se eliminan)
      syncAfterUserDelete();

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Error al eliminar usuario`, {
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
    deleteMutation.mutate(usuario.id_usuario);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[90vw] max-w-[350px] sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-black">
            Confirmar Eliminación
          </AlertDialogTitle>
          <AlertDialogDescription className="text-black">
            Esta acción no se puede deshacer. Se eliminará permanentemente:
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Información del usuario a eliminar */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-red-700 font-semibold text-sm">Usuario:</span>
            <span className="text-red-900 text-sm flex-1">
              <strong>{capitalizeWords(usuario.nombre)} {capitalizeWords(usuario.apellidos)}</strong>
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-red-700 font-semibold text-sm">ID:</span>
            <span className="text-red-900 text-sm">{usuario.id_usuario}</span>
          </div>
          {usuario.hobby && (
            <div className="flex items-start gap-2">
              <span className="text-red-700 font-semibold text-sm">Hobby:</span>
              <span className="text-red-900 text-sm">{capitalizeWords(usuario.hobby.nombre)}</span>
            </div>
          )}
        </div>

        {/* Advertencia adicional */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-amber-900 text-xs">
            También se eliminarán todas las conexiones asociadas a este usuario en el grafo.
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

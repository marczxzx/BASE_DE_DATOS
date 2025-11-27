import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { UpdateUsuarioData, UpdateUsuarioResponse } from '@/services/api';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import { capitalizeWords } from '@/utils/textTransform';
import type { Usuario, Hobby } from '@/types/usuario';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shuffle } from 'lucide-react';

// Schema de validación con Zod (igual que CreateUserDialog)
const formSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es requerido')
    .max(100, 'Máximo 100 caracteres'),
  apellidos: z.string()
    .min(1, 'Los apellidos son requeridos')
    .max(100, 'Máximo 100 caracteres'),
  edad: z.coerce.number()
    .int('Debe ser un número entero')
    .min(12, 'Edad mínima: 12 años')
    .max(150, 'Edad máxima: 150 años'),
  latitud: z.coerce.number()
    .min(-90, 'Latitud mínima: -90°')
    .max(90, 'Latitud máxima: 90°'),
  longitud: z.coerce.number()
    .min(-180, 'Longitud mínima: -180°')
    .max(180, 'Longitud máxima: 180°'),
  hobby: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  usuario: Usuario;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated?: (updatedUser: Usuario) => void;
}

export function EditUserDialog({ usuario, open, onOpenChange, onUserUpdated }: EditUserDialogProps) {
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [, setLoadingHobbies] = useState(true);
  const { syncAfterUserUpdate } = useGraphSync();
  const queryClient = useQueryClient();

  // Cargar hobbies desde la API
  useEffect(() => {
    const fetchHobbies = async () => {
      try {
        const response = await api.getHobbies();
        setHobbies(response.hobbies);
      } catch (error) {
        console.error('Error al cargar hobbies:', error);
        toast.error('Error al cargar hobbies');
      } finally {
        setLoadingHobbies(false);
      }
    };

    fetchHobbies();
  }, []);

  // Inicializar form siempre (evita hooks condicionados). Usar valores por defecto si usuario está disponible.
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: usuario?.nombre || '',
      apellidos: usuario?.apellidos || '',
      edad: usuario?.edad || 18,
      latitud: usuario?.latitud || 0,
      longitud: usuario?.longitud || 0,
      hobby: usuario?.hobby?.nombre || "none",
    },
  });

  // Actualizar form values cuando el usuario cambie
  useEffect(() => {
    if (usuario && usuario.nombre && usuario.apellidos) {
      form.reset({
        nombre: capitalizeWords(usuario.nombre),
        apellidos: capitalizeWords(usuario.apellidos),
        edad: usuario.edad,
        latitud: usuario.latitud,
        longitud: usuario.longitud,
        hobby: usuario.hobby?.nombre || "none",
      });
    }
  }, [usuario, form]);

  const updateMutation = useMutation<UpdateUsuarioResponse, Error, { id: number; values: UpdateUsuarioData }>({
    mutationFn: (data) => api.updateUsuario(data.id, data.values),
    onSuccess: (data) => {
      // Manejar diferentes formatos de respuesta del backend
      const usuarioActualizado = ((data as UpdateUsuarioResponse).usuario) ?? (data as unknown as Usuario);

      // Verificar que la respuesta del backend sea válida
      if (!usuarioActualizado || !usuarioActualizado.nombre || !usuarioActualizado.apellidos || !usuarioActualizado.id_usuario) {
        toast.error('Error: Respuesta inválida del servidor', {
          description: 'La actualización se realizó pero la respuesta no es válida.',
          duration: 4000,
        });
        return;
      }

      toast.success(`Usuario actualizado exitosamente`, {
        description: `${capitalizeWords(usuarioActualizado.nombre)} ${capitalizeWords(usuarioActualizado.apellidos)} (ID: ${usuarioActualizado.id_usuario})`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });

      // Sincronizar grafo automáticamente después de actualizar usuario
      syncAfterUserUpdate();

      // Refrescar la lista de usuarios para actualizar el estado local
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });

      // Actualizar el usuario seleccionado con los datos nuevos
      if (onUserUpdated && usuarioActualizado.nombre) {
        onUserUpdated(usuarioActualizado);
      }

      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Error al actualizar usuario`, {
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

  const generateRandomCoordinates = () => {
    const lat = (Math.random() - 0.5) * 180; // -90 to 90
    const lng = (Math.random() - 0.5) * 360; // -180 to 180
    form.setValue('latitud', Number(lat.toFixed(6)));
    form.setValue('longitud', Number(lng.toFixed(6)));
  };

  const onSubmit = (values: FormValues) => {
    if (!usuario || !usuario.id_usuario) {
      toast.error('Error: Usuario no válido');
      return;
    }

    const data = {
      nombre: values.nombre,
      apellidos: values.apellidos,
      edad: values.edad,
      latitud: values.latitud,
      longitud: values.longitud,
      id_hobby: values.hobby && values.hobby !== "none"
        ? hobbies.find(h => h.nombre === values.hobby)?.id_hobby
        : null,
    };
    updateMutation.mutate({ id: usuario.id_usuario, values: data });
  };

  // Si no hay usuario válido, no renderizamos el diálogo (hooks ya fueron inicializados de forma segura)
  if (!usuario || !usuario.id_usuario || !usuario.nombre) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[350px] sm:max-w-[500px] rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">
            Editar Usuario
          </DialogTitle>
          <DialogDescription className="text-black">
            Modifica los datos de <strong>{usuario.nombre && usuario.apellidos ? `${capitalizeWords(usuario.nombre)} ${capitalizeWords(usuario.apellidos)}` : 'usuario'}</strong> (ID: {usuario.id_usuario})
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Nombre <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Coloca el nombre" className="text-black placeholder:text-gray-500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Apellidos */}
            <FormField
              control={form.control}
              name="apellidos"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Apellidos <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Coloca los apellidos" className="text-black placeholder:text-gray-500" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Edad */}
            <FormField
              control={form.control}
              name="edad"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Edad <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="18" className="text-black placeholder:text-gray-500" {...field} />
                  </FormControl>
                  <FormDescription className="text-black">Mínimo 12 años</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Coordenadas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="latitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Latitud <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="40.4168"
                        className="text-black placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-black">-90 a 90</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="longitud"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-black">Longitud <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        placeholder="-3.7038"
                        className="text-black placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-black">-180 a 180</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botón para generar coordenadas aleatorias */}
            <div className="flex justify-center">
              <Button
                type="button"
                onClick={generateRandomCoordinates}
                className="gap-2 w-full sm:w-auto"
              >
                <Shuffle className="h-4 w-4" />
                Generar coordenadas aleatorias
              </Button>
            </div>

            {/* Hobby */}
            <FormField
              control={form.control}
              name="hobby"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-black">Hobby</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} defaultValue={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger className="text-black placeholder:text-gray-500">
                        <SelectValue placeholder="Ningún hobby" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="no-shadow-select">
                      <SelectItem value="none" className="text-black hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground">Ningún hobby</SelectItem>
                      {hobbies.map((hobby) => (
                        <SelectItem key={hobby.id_hobby} value={hobby.nombre} className="text-black hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground">
                          {hobby.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-black">
                    Selecciona un hobby (opcional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botones */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

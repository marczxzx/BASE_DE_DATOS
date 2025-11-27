import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { useGraphSync } from '@/hooks/useGraphSync';
import { capitalizeWords } from '@/utils/textTransform';
import type { Hobby } from '@/types/usuario';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { UserPlus, Loader2, Shuffle } from 'lucide-react';

// Schema de validación con Zod
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

export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const { syncAfterUserCreate } = useGraphSync();
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
      }
    };

    fetchHobbies();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      nombre: '',
      apellidos: '',
      edad: 18,
      latitud: 0,
      longitud: 0,
      hobby: "none",
    },
  });

  const createMutation = useMutation({
    mutationFn: api.createUsuario,
    onSuccess: async (data) => {
      const nuevoUsuario = data.usuario;

      toast.success(`Usuario creado exitosamente`, {
        description: `${capitalizeWords(nuevoUsuario.nombre)} ${capitalizeWords(nuevoUsuario.apellidos)} (ID: ${nuevoUsuario.id_usuario})`,
        duration: 3000,
        style: {
          background: '#22c55e',
          color: 'white',
          border: '1px solid #16a34a',
        },
        className: '[&_*]:!text-white',
      });

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['conexiones'] });

      // Refetchear de forma síncrona ANTES de cerrar el modal
      await Promise.all([
        queryClient.refetchQueries({ queryKey: ['usuarios'], type: 'active' }),
        queryClient.refetchQueries({ queryKey: ['conexiones'], type: 'active' })
      ]);

      // Sincronizar el grafo
      syncAfterUserCreate();

      form.reset();
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Error al crear usuario`, {
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
    // Evitar zonas polares extremas: latitud entre -60° y 75°
    const lat = -60 + Math.random() * 135; // -60 a 75 (evita Antártida y Ártico extremo)
    const lng = (Math.random() - 0.5) * 360; // -180 a 180
    form.setValue('latitud', Number(lat.toFixed(6)));
    form.setValue('longitud', Number(lng.toFixed(6)));
  };

  const onSubmit = (values: FormValues) => {
    const data = {
      nombre: values.nombre,
      apellidos: values.apellidos,
      edad: values.edad,
      latitud: values.latitud,
      longitud: values.longitud,
      id_hobby: values.hobby && values.hobby !== "none" ? hobbies.find(h => h.nombre === values.hobby)?.id_hobby : undefined,
    };
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nuevo Usuario
        </Button>
      </DialogTrigger>
        <DialogContent className="w-[90vw] max-w-[350px] sm:max-w-[500px] max-h-[90vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-black">Crear Nuevo Usuario</DialogTitle>
          <DialogDescription className="text-black">
            Completa los datos del usuario. Los campos con <span className="text-red-500">*</span> son obligatorios.
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
                onClick={() => setOpen(false)}
                disabled={createMutation.isPending}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={!form.formState.isValid || createMutation.isPending} className="w-full sm:w-auto">
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Crear Usuario
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { z } from 'zod';

// Esquema para crear un usuario (POST)
// Definimos exactamente qué queremos y los mensajes de error personalizados
export const createUserSchema = z.object({
  email: z.email('El formato del email no es válido'),
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  surname: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
  userTypeId: z.uuid('El tipo de usuario debe ser un UUID válido'),
});

// Esquema para actualizar un usuario (PUT)
// El método .partial() hace magia: coge el esquema de arriba pero hace que
// todos los campos sean opcionales (por si el usuario solo quiere cambiar su nombre)
export const updateUserSchema = createUserSchema.partial();

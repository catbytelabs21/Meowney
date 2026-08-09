import { z } from 'zod';

export const requiredTextSchema = z.string().trim().min(1, 'Este campo es requerido');

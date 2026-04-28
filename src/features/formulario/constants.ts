import type { FormState } from './types';

export const initialForm: FormState = {
  nombre: '',
  primerApellido: '',
  segundoApellido: '',
  email: '',
  usuario: '',
  genero: '',
  nacimiento: '',
  salud: '',
  experiencia: '',
  condicion: '',
  habilidades: '',
};

export const textFields = [
  { name: 'nombre', label: 'Nombre', maxLength: 100, required: true },
  { name: 'primerApellido', label: 'Primer apellido', maxLength: 100, required: true },
  { name: 'segundoApellido', label: 'Segundo apellido', maxLength: 100, required: false },
] as const;

export const healthFields = [
  {
    name: 'salud',
    label: 'Nivel de salud declarado',
    placeholder: 'Sin enfermedades conocidas',
  },
  {
    name: 'experiencia',
    label: 'Experiencia previa',
    placeholder: '10 años en expediciones',
  },
  {
    name: 'condicion',
    label: 'Condición física',
    placeholder: 'Buen estado físico',
  },
  {
    name: 'habilidades',
    label: 'Habilidades',
    placeholder: 'Navegación GPS, primeros auxilios, cocina',
  },
] as const;

export const genderOptions = ['MALE', 'FEMALE', 'OTHER'];

export const monthNames = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export const weekDays = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];

export type FormState = {
  nombre: string;
  primerApellido: string;
  segundoApellido: string;
  email: string;
  usuario: string;
  genero: string;
  nacimiento: string;
  salud: string;
  experiencia: string;
  condicion: string;
  habilidades: string;
};

export type CalendarDay = {
  date: Date;
  inMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  value: string;
};

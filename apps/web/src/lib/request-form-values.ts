export type RequestFormValues = {
  readonly nombre: string;
  readonly identificacion: string;
  readonly correo: string;
  readonly telefono: string;
  readonly carrera: string;
  readonly nivel: string;
  readonly temas: readonly string[];
  readonly otroTema: string;
};

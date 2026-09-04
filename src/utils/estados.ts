/* Etapas del pipeline de ventas.

   El orden del arreglo es el orden de las columnas del tablero y el que se
   asume como avance natural de la venta. */

import type { EstadoCliente } from '../types';

export interface EtapaPipeline {
  id: EstadoCliente;
  etiqueta: string;
  /** Frase corta que explica qué significa estar en esta columna. */
  ayuda: string;
  /** Clase de color del sistema visual (badge/columna). */
  clase: string;
  /** Etapas de las que no se sale hacia adelante: cierre bueno o malo. */
  terminal?: boolean;
}

export const ETAPAS: EtapaPipeline[] = [
  {
    id: 'contactado',
    etiqueta: 'Contactado',
    ayuda: 'Escribió o le escribiste. Todavía sin datos.',
    clase: 'blue',
  },
  {
    id: 'esperandoInfo',
    etiqueta: 'Esperando información',
    ayuda: 'Falta que mande dirección, RUT o algún dato.',
    clase: 'amber',
  },
  {
    id: 'factible',
    etiqueta: 'Factible',
    ayuda: 'Hay cobertura y se le puede vender.',
    clase: 'violet',
  },
  {
    id: 'noFactible',
    etiqueta: 'No factible',
    ayuda: 'Sin cobertura o no califica.',
    clase: 'red',
    terminal: true,
  },
  {
    id: 'aprobado',
    etiqueta: 'Aprobado',
    ayuda: 'La compañía aprobó la contratación.',
    clase: 'violet',
  },
  {
    id: 'esperaInstalacion',
    etiqueta: 'En espera de instalación',
    ayuda: 'Con fecha asignada o esperando al técnico.',
    clase: 'amber',
  },
  {
    id: 'instalado',
    etiqueta: 'Instalado',
    ayuda: 'El servicio quedó funcionando.',
    clase: 'green',
  },
  {
    id: 'pagado',
    etiqueta: 'Pagado',
    ayuda: 'Comisión cobrada. Cierre completo.',
    clase: 'green',
    terminal: true,
  },
];

const POR_ID = new Map(ETAPAS.map((e) => [e.id, e]));

/* Equivalencias con los estados anteriores a la introducción del pipeline.
   Sin esto, los clientes viejos quedarían fuera de todas las columnas. */
const HEREDADOS: Record<string, EstadoCliente> = {
  nuevo: 'contactado',
  agendado: 'esperaInstalacion',
  perdido: 'noFactible',
};

export function normalizarEstado(valor: string): EstadoCliente {
  if (POR_ID.has(valor as EstadoCliente)) return valor as EstadoCliente;
  return HEREDADOS[valor] ?? 'contactado';
}

export function etapaDe(valor: string): EtapaPipeline {
  return POR_ID.get(normalizarEstado(valor)) ?? ETAPAS[0];
}

/** Etapas que cuentan como venta concretada. */
export const CERRADAS: EstadoCliente[] = ['instalado', 'pagado'];

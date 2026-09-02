/* Comunas de Chile agrupadas por región. Lista acotada a las zonas con
   cobertura urbana de Claro/VTR, que son las que se venden en la práctica.
   Agregar más es solo sumar strings acá. */

export interface RegionComunas {
  region: string;
  comunas: string[];
}

export const REGIONES: RegionComunas[] = [
  {
    region: 'Región Metropolitana',
    comunas: [
      'Cerrillos', 'Cerro Navia', 'Conchalí', 'El Bosque', 'Estación Central',
      'Huechuraba', 'Independencia', 'La Cisterna', 'La Florida', 'La Granja',
      'La Pintana', 'La Reina', 'Las Condes', 'Lo Barnechea', 'Lo Espejo',
      'Lo Prado', 'Macul', 'Maipú', 'Ñuñoa', 'Pedro Aguirre Cerda',
      'Peñalolén', 'Providencia', 'Pudahuel', 'Quilicura', 'Quinta Normal',
      'Recoleta', 'Renca', 'San Joaquín', 'San Miguel', 'San Ramón',
      'Santiago', 'Vitacura', 'Puente Alto', 'Pirque', 'San José de Maipo',
      'Colina', 'Lampa', 'Til Til', 'San Bernardo', 'Buin', 'Calera de Tango',
      'Paine', 'Melipilla', 'Talagante', 'El Monte', 'Isla de Maipo',
      'Padre Hurtado', 'Peñaflor',
    ],
  },
  {
    region: 'Valparaíso',
    comunas: [
      'Valparaíso', 'Viña del Mar', 'Concón', 'Quilpué', 'Villa Alemana',
      'Quillota', 'La Calera', 'San Antonio', 'Cartagena', 'El Quisco',
      'Algarrobo', 'San Felipe', 'Los Andes', 'Limache', 'Olmué', 'Casablanca',
    ],
  },
  {
    region: "Libertador B. O'Higgins",
    comunas: ['Rancagua', 'Machalí', 'Graneros', 'San Fernando', 'Santa Cruz', 'Rengo', 'San Vicente'],
  },
  {
    region: 'Maule',
    comunas: ['Talca', 'Curicó', 'Linares', 'Constitución', 'Molina', 'San Javier', 'Cauquenes'],
  },
  {
    region: 'Ñuble',
    comunas: ['Chillán', 'Chillán Viejo', 'San Carlos', 'Bulnes', 'Quillón'],
  },
  {
    region: 'Biobío',
    comunas: [
      'Concepción', 'Talcahuano', 'Hualpén', 'San Pedro de la Paz', 'Chiguayante',
      'Coronel', 'Lota', 'Penco', 'Tomé', 'Los Ángeles', 'Nacimiento',
    ],
  },
  {
    region: 'La Araucanía',
    comunas: ['Temuco', 'Padre Las Casas', 'Villarrica', 'Pucón', 'Angol', 'Victoria', 'Nueva Imperial'],
  },
  {
    region: 'Los Ríos',
    comunas: ['Valdivia', 'La Unión', 'Río Bueno', 'Panguipulli'],
  },
  {
    region: 'Los Lagos',
    comunas: ['Puerto Montt', 'Puerto Varas', 'Osorno', 'Castro', 'Ancud', 'Llanquihue'],
  },
  {
    region: 'Antofagasta',
    comunas: ['Antofagasta', 'Calama', 'Tocopilla', 'Mejillones'],
  },
  {
    region: 'Atacama',
    comunas: ['Copiapó', 'Vallenar', 'Caldera'],
  },
  {
    region: 'Coquimbo',
    comunas: ['La Serena', 'Coquimbo', 'Ovalle', 'Illapel', 'Vicuña'],
  },
  {
    region: 'Tarapacá',
    comunas: ['Iquique', 'Alto Hospicio', 'Pozo Almonte'],
  },
  {
    region: 'Arica y Parinacota',
    comunas: ['Arica'],
  },
  {
    region: 'Aysén',
    comunas: ['Coyhaique', 'Puerto Aysén'],
  },
  {
    region: 'Magallanes',
    comunas: ['Punta Arenas', 'Puerto Natales'],
  },
];

export const COMUNAS: string[] = REGIONES.flatMap((r) => r.comunas).sort((a, b) =>
  a.localeCompare(b, 'es')
);

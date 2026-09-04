import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarraInferior, BarraLateral, vistasPermitidas, type Vista } from './components/Navegacion';
import BarraSuperior from './components/BarraSuperior';
import { useAvisos } from './components/Avisos';
import { useSesion } from './context/Sesion';
import { useTema } from './hooks/useTema';
import {
  AJUSTES_INICIALES,
  escucharClientes,
  escucharGrupos,
  escucharMembresias,
  escucharPlantillas,
  escucharPublicaciones,
  escucharRutaDelDia,
  escucharUsuarios,
  guardarRuta,
  guardarAjustes,
  leerAjustes,
} from './services/datos';
import type {
  Ajustes,
  Cliente,
  Grupo,
  Membresia,
  Plantilla,
  Publicacion,
  RutaDia,
  Usuario,
} from './types';
import { MAX_RUTA } from './types';
import { claveMenos, fechaRuta, hoy } from './utils/fecha';
import { armarRutaAutomatica } from './utils/puntajeGrupo';
import VistaLogin from './views/VistaLogin';
import VistaPanel from './views/VistaPanel';
import VistaPublicar from './views/VistaPublicar';
import VistaClientes from './views/VistaClientes';
import VistaGrupos from './views/VistaGrupos';
import VistaMensajes from './views/VistaMensajes';
import VistaUsuarios from './views/VistaUsuarios';
import VistaAjustes from './views/VistaAjustes';
import './App.css';

/* Ventana de historial que necesita el motor de rotación y los gráficos.
   Más allá de 45 días ninguna decisión cambia, así que no se descarga. */
const DIAS_HISTORIAL = 45;

const TITULOS: Record<Vista, string> = {
  panel: 'Panel',
  publicar: 'Ruta de hoy',
  clientes: 'Clientes',
  grupos: 'Grupos',
  mensajes: 'Mensajes',
  equipo: 'Equipo',
  ajustes: 'Ajustes',
};

export default function App() {
  const { tema, alternar } = useTema();
  const { avisar } = useAvisos();
  const sesion = useSesion();
  const {
    perfil,
    rol,
    roles,
    puede,
    cargando: cargandoSesion,
    rechazo,
    esInvitado,
    cerrarSesion,
  } = sesion;

  const [vista, setVista] = useState<Vista>('panel');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [rutaDia, setRutaDia] = useState<RutaDia | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_INICIALES);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(!navigator.onLine);

  /* Listeners globales en un solo lugar: las vistas reciben los datos por
     props y nunca vuelven a consultar la misma colección (si lo hicieran,
     los datos quedarían congelados al montar). Solo se abren con sesión. */
  useEffect(() => {
    if (!perfil) return;

    const fallar = (e: Error) => {
      setCargando(false);
      avisar(`No se pudieron cargar los datos: ${e.message}`, 'error');
    };
    const desde = claveMenos(DIAS_HISTORIAL);

    const bajas = [
      escucharClientes((filas) => {
        setClientes(filas);
        setCargando(false);
      }, fallar),
      escucharGrupos(setGrupos, fallar),
      escucharPlantillas(setPlantillas, fallar),
      escucharPublicaciones(desde, setPublicaciones, fallar),
      escucharUsuarios(setUsuarios, fallar),
      escucharMembresias(setMembresias, fallar),
    ];

    return () => bajas.forEach((baja) => baja());
  }, [avisar, perfil]);

  /* La ruta se guarda por vendedor y por fecha de Venezuela. Al pasar la
     medianoche de Caracas el id cambia y la ruta aparece vacía sola. */
  useEffect(() => {
    if (!perfil) return;
    return escucharRutaDelDia(perfil.id, fechaRuta(), setRutaDia, () => setRutaDia(null));
  }, [perfil]);

  const cambiarRuta = useCallback(
    async (grupoIds: string[]) => {
      if (!perfil) return;
      await guardarRuta(perfil.id, fechaRuta(), grupoIds);
    },
    [perfil]
  );

  useEffect(() => {
    if (!perfil) return;
    leerAjustes()
      .then(setAjustes)
      .catch(() => avisar('No se pudieron leer los ajustes.', 'error'));
  }, [avisar, perfil]);

  useEffect(() => {
    const conectado = () => setSinConexion(false);
    const desconectado = () => setSinConexion(true);
    window.addEventListener('online', conectado);
    window.addEventListener('offline', desconectado);
    return () => {
      window.removeEventListener('online', conectado);
      window.removeEventListener('offline', desconectado);
    };
  }, []);

  /* Si el rol cambia y la vista actual deja de estar permitida, se cae a la
     primera disponible en vez de mostrar una pantalla vacía. */
  const permitidas = useMemo(() => (perfil ? vistasPermitidas(puede) : []), [perfil, puede]);

  useEffect(() => {
    if (permitidas.length > 0 && !permitidas.includes(vista)) setVista(permitidas[0]);
  }, [permitidas, vista]);

  const actualizarAjustes = useCallback(
    async (nuevos: Ajustes) => {
      setAjustes(nuevos);
      await guardarAjustes(nuevos);
      avisar('Ajustes guardados.');
    },
    [avisar]
  );

  const fecha = hoy();

  /* La rotación es individual: cada vendedor tiene su propio historial. */
  const misPublicaciones = useMemo(
    () => (perfil ? publicaciones.filter((p) => p.uid === perfil.id) : []),
    [publicaciones, perfil]
  );

  const publicadasHoy = useMemo(
    () => misPublicaciones.filter((p) => p.fecha === fecha).length,
    [misPublicaciones, fecha]
  );

  /* Grupos y mensajes son de cada vendedor. Los que tienen `uid` vacío
     vienen de cuando el catálogo era compartido: siguen visibles para todos
     para no perderlos, y dejan de serlo en cuanto alguien los edita. */
  const gruposVisibles = useMemo(() => {
    if (!perfil) return [];
    return grupos.filter((g) => !g.uid || g.uid === perfil.id);
  }, [grupos, perfil]);

  const plantillasVisibles = useMemo(() => {
    if (!perfil) return [];
    return plantillas.filter((p) => !p.uid || p.uid === perfil.id);
  }, [plantillas, perfil]);

  /* La ruta de publicación solo considera los grupos donde el vendedor ya
     entró. Estar en el catálogo no significa poder publicar. */
  const misGrupos = useMemo(() => {
    if (!perfil) return [];
    const ids = new Set(membresias.filter((m) => m.uid === perfil.id).map((m) => m.grupoId));
    return gruposVisibles.filter((g) => ids.has(g.id));
  }, [gruposVisibles, membresias, perfil]);

  /* Grupos de la ruta de hoy: son los que se recorren en Publicar. */
  const gruposRuta = useMemo(() => {
    const ids = new Set(rutaDia?.grupoIds ?? []);
    return misGrupos.filter((g) => ids.has(g.id));
  }, [misGrupos, rutaDia]);

  /* Armado automático de la ruta.

     Se dispara una sola vez por jornada: cuando el documento del día todavía
     no existe y ya hay datos cargados. Después de eso la ruta es editable a
     mano sin que el sistema la vuelva a tocar — si se regenerara sola, cada
     grupo que el vendedor quita reaparecería al recargar. */
  const rutaGenerada = useRef<string>('');

  useEffect(() => {
    if (!perfil || cargando || rutaDia !== null) return;

    const clave = `${perfil.id}_${fechaRuta()}`;
    if (rutaGenerada.current === clave) return;
    if (misGrupos.length === 0) return;

    rutaGenerada.current = clave;
    const ids = armarRutaAutomatica(misGrupos, misPublicaciones, hoy(), MAX_RUTA);
    if (ids.length > 0) void guardarRuta(perfil.id, fechaRuta(), ids);
  }, [perfil, cargando, rutaDia, misGrupos, misPublicaciones]);

  const regenerarRuta = useCallback(async () => {
    if (!perfil) return;
    const ids = armarRutaAutomatica(misGrupos, misPublicaciones, hoy(), MAX_RUTA);
    await guardarRuta(perfil.id, fechaRuta(), ids);
  }, [perfil, misGrupos, misPublicaciones]);

  const verEquipo = puede('panel.verEquipo');
  const verTodosClientes = puede('clientes.verTodos');

  /* Un cliente es visible si lo registré yo, si me lo compartieron, o si mi
     rol puede ver los de todo el equipo. */
  const clientesVisibles = useMemo(() => {
    if (!perfil) return [];
    if (verTodosClientes) return clientes;
    return clientes.filter(
      (c) => c.uid === perfil.id || (c.compartidoCon ?? []).includes(perfil.id)
    );
  }, [clientes, verTodosClientes, perfil]);

  /* El panel mide producción, no acceso: cuentan los que registré yo. */
  const clientesPanel = useMemo(
    () => (verEquipo || !perfil ? clientes : clientes.filter((c) => c.uid === perfil.id)),
    [clientes, verEquipo, perfil]
  );

  const publicacionesPanel = verEquipo ? publicaciones : misPublicaciones;

  const clientesPorUsuario = useMemo(() => {
    const mapa = new Map<string, number>();
    clientes.forEach((c) => mapa.set(c.uid, (mapa.get(c.uid) ?? 0) + 1));
    return mapa;
  }, [clientes]);

  const publicacionesPorUsuario = useMemo(() => {
    const mapa = new Map<string, number>();
    publicaciones.forEach((p) => mapa.set(p.uid, (mapa.get(p.uid) ?? 0) + 1));
    return mapa;
  }, [publicaciones]);

  if (cargandoSesion) return <div className="arranque" />;
  if (!perfil) return <VistaLogin rechazo={rechazo} />;

  return (
    <div className="app">
      <BarraLateral
        vista={vista}
        alCambiar={setVista}
        publicadasHoy={publicadasHoy}
        meta={ajustes.metaDiaria}
        puede={puede}
      />

      <main className="lienzo">
        <BarraSuperior
          titulo={TITULOS[vista]}
          vendedor={perfil.nombre}
          rol={rol?.nombre ?? 'Sin rol'}
          tema={tema}
          alAlternarTema={alternar}
          sinConexion={sinConexion}
          esInvitado={esInvitado}
          alSalir={() => void cerrarSesion()}
        />

        {vista === 'panel' && (
          <VistaPanel
            clientes={clientesPanel}
            grupos={gruposVisibles}
            publicaciones={publicacionesPanel}
            ajustes={ajustes}
            cargando={cargando}
            alcance={verEquipo ? 'equipo' : 'propio'}
            alIrA={setVista}
          />
        )}

        {vista === 'publicar' && (
          <VistaPublicar
            clientes={clientesVisibles}
            grupos={gruposRuta}
            misGrupos={misGrupos}
            plantillas={plantillasVisibles}
            alRegenerarRuta={regenerarRuta}
            publicaciones={misPublicaciones}
            ajustes={ajustes}
            alIrA={setVista}
          />
        )}

        {vista === 'clientes' && (
          <VistaClientes
            clientes={clientesVisibles}
            grupos={gruposVisibles}
            usuarios={usuarios}
            cargando={cargando}
          />
        )}

        {vista === 'grupos' && (
          <VistaGrupos
            clientes={clientesVisibles}
            grupos={gruposVisibles}
            publicaciones={misPublicaciones}
            membresias={membresias}
            plantillas={plantillasVisibles}
            ajustes={ajustes}
            ruta={rutaDia?.grupoIds ?? []}
            alCambiarRuta={cambiarRuta}
            alRegenerarRuta={regenerarRuta}
          />
        )}

        {vista === 'mensajes' && (
          <VistaMensajes
            grupos={gruposVisibles}
            plantillas={plantillasVisibles}
            publicaciones={misPublicaciones}
            clientes={clientesVisibles}
          />
        )}

        {vista === 'equipo' && (
          <VistaUsuarios
            usuarios={usuarios}
            roles={roles}
            clientesPorUsuario={clientesPorUsuario}
            publicacionesPorUsuario={publicacionesPorUsuario}
          />
        )}

        {vista === 'ajustes' && (
          <VistaAjustes
            ajustes={ajustes}
            plantillas={plantillasVisibles}
            alGuardar={actualizarAjustes}
          />
        )}
      </main>

      <BarraInferior vista={vista} alCambiar={setVista} puede={puede} />
    </div>
  );
}

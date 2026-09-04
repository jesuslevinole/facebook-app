import { useEffect, useState } from 'react';
import { Download, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { PLANTILLAS_BASE } from '../data/plantillasBase';
import { crearPlantilla, editarUsuario } from '../services/datos';
import type { Ajustes, Plantilla } from '../types';
import './VistaAjustes.css';

interface Props {
  ajustes: Ajustes;
  plantillas: Plantilla[];
  alGuardar: (ajustes: Ajustes) => Promise<void>;
}

export default function VistaAjustes({ ajustes, plantillas, alGuardar }: Props) {
  const { avisar } = useAvisos();
  const { perfil, rol, puede, cerrarSesion, refrescarPerfil } = useSesion();

  const [nombre, setNombre] = useState(perfil?.nombre ?? '');
  const [telefono, setTelefono] = useState(perfil?.telefono ?? '');
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);

  const [borrador, setBorrador] = useState<Ajustes>(ajustes);
  const [guardando, setGuardando] = useState(false);
  const [cargandoBase, setCargandoBase] = useState(false);

  const puedeReglas = puede('ajustes.editar');
  const puedeMensajes = puede('mensajes.editar');
  const activas = plantillas.filter((p) => p.activo).length;

  /* Los ajustes llegan desde Firestore después del primer render. */
  useEffect(() => setBorrador(ajustes), [ajustes]);

  useEffect(() => {
    setNombre(perfil?.nombre ?? '');
    setTelefono(perfil?.telefono ?? '');
  }, [perfil]);

  const cambiar = <K extends keyof Ajustes>(campo: K, valor: Ajustes[K]) =>
    setBorrador((previos) => ({ ...previos, [campo]: valor }));

  const guardarPerfil = async () => {
    if (!perfil) return;
    if (!nombre.trim()) {
      avisar('Escribe tu nombre.', 'error');
      return;
    }
    setGuardandoPerfil(true);
    try {
      await editarUsuario(perfil.id, { nombre: nombre.trim(), telefono });
      await refrescarPerfil();
      avisar('Perfil actualizado.');
    } catch {
      avisar('No se pudo guardar tu perfil.', 'error');
    }
    setGuardandoPerfil(false);
  };

  const guardarReglas = async () => {
    setGuardando(true);
    await alGuardar(borrador);
    setGuardando(false);
  };

  const cargarEjemplos = async () => {
    setCargandoBase(true);
    try {
      const ahora = new Date().toISOString();
      await Promise.all(
        PLANTILLAS_BASE.map((p) =>
          crearPlantilla({ ...p, uid: perfil?.id ?? '', createdAt: ahora })
        )
      );
      avisar(`${PLANTILLAS_BASE.length} mensajes agregados. Edítalos con tus datos.`);
    } catch {
      avisar('No se pudieron cargar los mensajes de ejemplo.', 'error');
    }
    setCargandoBase(false);
  };

  const perfilSinCambios = nombre === (perfil?.nombre ?? '') && telefono === (perfil?.telefono ?? '');
  const reglasSinCambios = JSON.stringify(borrador) === JSON.stringify(ajustes);

  return (
    <section className="ajustes">
      <article className="card">
        <header className="card-head">
          <div>
            <h3 className="title-card">Tu perfil</h3>
            <p className="text-sm muted">
              Se insertan en tus mensajes con {'{vendedor}'} y {'{telefono}'}.
            </p>
          </div>
          <span className="kpi-icon">
            <UserRound size={17} />
          </span>
        </header>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">Nombre que ven los clientes</span>
            <input
              className="input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Jesús · Asesor Claro y VTR"
            />
          </label>

          <label className="field">
            <span className="field-label">Teléfono de contacto</span>
            <input
              className="input"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="+56 9 1234 5678"
              inputMode="tel"
            />
          </label>
        </div>

        <dl className="ajustes-cuenta">
          <div>
            <dt className="eyebrow">Correo</dt>
            <dd className="text-sm">{perfil?.email}</dd>
          </div>
          <div>
            <dt className="eyebrow">Rol</dt>
            <dd className="text-sm">{rol?.nombre ?? 'Sin rol'}</dd>
          </div>
        </dl>

        <div className="ajustes-pie">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void guardarPerfil()}
            disabled={guardandoPerfil || perfilSinCambios}
          >
            {guardandoPerfil ? 'Guardando…' : 'Guardar perfil'}
          </button>
          <button type="button" className="btn btn-outline" onClick={() => void cerrarSesion()}>
            <LogOut size={15} />
            Cerrar sesión
          </button>
        </div>
      </article>

      {puedeReglas && (
        <article className="card">
          <header className="card-head">
            <div>
              <h3 className="title-card">Ritmo de publicación del equipo</h3>
              <p className="text-sm muted">
                Estos tres números son los que evitan que Facebook lea la actividad como spam.
              </p>
            </div>
            <span className="kpi-icon">
              <ShieldCheck size={17} />
            </span>
          </header>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">Publicaciones por día</span>
              <input
                className="input"
                type="number"
                min={1}
                max={40}
                value={borrador.metaDiaria}
                onChange={(e) => cambiar('metaDiaria', Number(e.target.value) || 1)}
                inputMode="numeric"
              />
              <span className="field-hint">
                Entre 6 y 12 es un ritmo sostenible para una cuenta personal.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Días antes de repetir un mensaje</span>
              <input
                className="input"
                type="number"
                min={1}
                max={60}
                value={borrador.diasSinRepetir}
                onChange={(e) => cambiar('diasSinRepetir', Number(e.target.value) || 1)}
                inputMode="numeric"
              />
              <span className="field-hint">
                En el mismo grupo. Con {activas} mensajes activos puedes cubrir {activas} días sin
                repetir.
              </span>
            </label>

            <label className="field">
              <span className="field-label">Horas de descanso por grupo</span>
              <input
                className="input"
                type="number"
                min={0}
                max={168}
                value={borrador.cooldownHorasDefault}
                onChange={(e) => cambiar('cooldownHorasDefault', Number(e.target.value) || 0)}
                inputMode="numeric"
              />
              <span className="field-hint">Valor por defecto. Cada grupo puede tener el suyo.</span>
            </label>
          </div>

          <div className="ajustes-pie">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void guardarReglas()}
              disabled={guardando || reglasSinCambios}
            >
              {guardando ? 'Guardando…' : 'Guardar reglas'}
            </button>
            {reglasSinCambios && <span className="text-sm muted-soft">No hay cambios por guardar.</span>}
          </div>
        </article>
      )}

      {puedeMensajes && (
        <article className="card">
          <header className="card-head">
            <div>
              <h3 className="title-card">Mensajes de ejemplo</h3>
              <p className="text-sm muted">
                Cinco mensajes con variantes listas, escritos para grupos de compraventa chilenos.
              </p>
            </div>
          </header>

          <p className="text-sm muted">
            Se agregan como mensajes nuevos, no reemplazan los que ya existan. Después edítalos con
            tus precios y tu forma de hablar: mientras más propios, mejor funcionan.
          </p>

          <div className="ajustes-pie">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => void cargarEjemplos()}
              disabled={cargandoBase}
            >
              <Download size={15} />
              {cargandoBase ? 'Cargando…' : 'Cargar 5 mensajes de ejemplo'}
            </button>
          </div>
        </article>
      )}

      <article className="card ajustes-nota">
        <h3 className="title-card">Cómo se arma tu ruta</h3>
        <ol className="ajustes-lista">
          <li>
            <span className="ajustes-paso num">1</span>
            <p className="text-sm">
              Cada día los grupos se ordenan solos: primero los que llevan más tiempo sin recibir
              una publicación tuya. La rotación es individual, no compartida con el equipo.
            </p>
          </li>
          <li>
            <span className="ajustes-paso num">2</span>
            <p className="text-sm">
              A cada grupo se le asigna un mensaje distinto del que usaste la vez anterior, y nunca
              el mismo que acabas de publicar en otro grupo.
            </p>
          </li>
          <li>
            <span className="ajustes-paso num">3</span>
            <p className="text-sm">
              Dentro del mensaje, las alternativas entre llaves cambian el texto palabra por
              palabra, así que dos publicaciones nunca son idénticas.
            </p>
          </li>
          <li>
            <span className="ajustes-paso num">4</span>
            <p className="text-sm">
              Al abrir un grupo queda registrado el día y la hora a tu nombre. Eso alimenta el
              conteo de publicaciones y el descanso del grupo.
            </p>
          </li>
        </ol>
      </article>
    </section>
  );
}

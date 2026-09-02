import { useEffect, useState } from 'react';
import { Eye, EyeOff, LogIn, Unlock } from 'lucide-react';
import { useAvisos } from '../components/Avisos';
import { useSesion } from '../context/Sesion';
import { ACCESO_INVITADO } from '../config/acceso';
import { ID_ADMIN, ROLES_BASE } from '../data/rolesBase';
import {
  crearCuentaSinCambiarSesion,
  entrar,
  mensajeDeError,
  recuperarClave,
} from '../services/auth';
import { crearRolConId, crearUsuario, hayUsuarios } from '../services/datos';
import './VistaLogin.css';

/* La primera cuenta se crea desde acá porque no hay nadie que pueda darla de
   alta todavía. En cuanto existe un usuario, el registro desaparece y las
   cuentas nuevas salen solo de Usuarios → Nuevo usuario. */

interface Props {
  rechazo: string;
}

export default function VistaLogin({ rechazo }: Props) {
  const { avisar } = useAvisos();
  const { entrarComoInvitado } = useSesion();
  const [modo, setModo] = useState<'acceso' | 'registro'>('acceso');
  const [permiteRegistro, setPermiteRegistro] = useState(false);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);

  /* Si la colección de usuarios está vacía, el equipo aún no existe. */
  useEffect(() => {
    hayUsuarios()
      .then((existen) => setPermiteRegistro(!existen))
      .catch(() => setPermiteRegistro(false));
  }, []);

  const acceder = async () => {
    setError('');
    if (!email.trim() || !clave) {
      setError('Escribe tu correo y tu clave.');
      return;
    }
    setOcupado(true);
    try {
      await entrar(email, clave);
    } catch (e) {
      setError(mensajeDeError(e));
    }
    setOcupado(false);
  };

  const registrar = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('Escribe tu nombre.');
      return;
    }
    if (clave.length < 6) {
      setError('La clave debe tener al menos 6 caracteres.');
      return;
    }
    setOcupado(true);
    try {
      /* Doble verificación: entre que cargó la pantalla y este click alguien
         más pudo haber creado la primera cuenta. */
      if (await hayUsuarios()) {
        setError('El equipo ya tiene cuentas. Pídele a un administrador que te dé de alta.');
        setPermiteRegistro(false);
        setModo('acceso');
        setOcupado(false);
        return;
      }

      await Promise.all(
        ROLES_BASE.map((r) => crearRolConId(r.id, { ...r.datos, createdAt: new Date().toISOString() }))
      );

      const uid = await crearCuentaSinCambiarSesion(email, clave);
      await crearUsuario(uid, {
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: '',
        rolId: ID_ADMIN,
        activo: true,
        createdAt: new Date().toISOString(),
      });

      await entrar(email, clave);
      avisar('Cuenta de administrador creada. Bienvenido.');
    } catch (e) {
      setError(mensajeDeError(e));
    }
    setOcupado(false);
  };

  const restablecer = async () => {
    if (!email.trim()) {
      setError('Escribe tu correo para enviarte el enlace.');
      return;
    }
    try {
      await recuperarClave(email);
      avisar('Te enviamos un correo para cambiar la clave.');
    } catch (e) {
      setError(mensajeDeError(e));
    }
  };

  const esRegistro = modo === 'registro';

  return (
    <main className="acceso">
      <section className="acceso-panel">
        <div className="marca acceso-marca">
          <span className="marca-signo" aria-hidden="true" />
          <span className="marca-nombre">RedLink</span>
        </div>

        <h1 className="acceso-lema">
          Publica en el grupo correcto,
          <br />
          con el mensaje correcto.
        </h1>
        <p className="acceso-bajada">
          Rotación diaria de grupos, mensajes que nunca se repiten y el registro de qué grupo trae
          cada cliente.
        </p>

        <ul className="acceso-puntos">
          <li>Ruta de publicación armada sola cada mañana</li>
          <li>Clientes atribuidos al grupo del que llegaron</li>
          <li>Cada vendedor con su propia rotación y sus cifras</li>
        </ul>
      </section>

      <section className="acceso-formulario">
        <div className="acceso-caja card">
          <header className="stack-sm">
            <h2 className="title-page">{esRegistro ? 'Crea tu cuenta' : 'Entra a tu cuenta'}</h2>
            <p className="text-sm muted">
              {esRegistro
                ? 'Serás el administrador del equipo: podrás dar de alta al resto.'
                : 'Usa el correo con el que te dieron de alta.'}
            </p>
          </header>

          {rechazo && <p className="acceso-alerta">{rechazo}</p>}

          {esRegistro && (
            <label className="field">
              <span className="field-label">Tu nombre</span>
              <input
                className="input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Jesús Reyes"
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span className="field-label">Correo</span>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.cl"
              autoComplete="email"
              inputMode="email"
            />
          </label>

          <label className="field">
            <span className="field-label">Clave</span>
            <span className="acceso-clave">
              <input
                className="input"
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void (esRegistro ? registrar() : acceder());
                }}
                placeholder={esRegistro ? 'Mínimo 6 caracteres' : '••••••••'}
                autoComplete={esRegistro ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                className="icon-btn acceso-ojo"
                onClick={() => setVerClave((v) => !v)}
                aria-label={verClave ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {verClave ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          {error && <p className="field-error">{error}</p>}

          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={() => void (esRegistro ? registrar() : acceder())}
            disabled={ocupado}
          >
            <LogIn size={16} />
            {ocupado ? 'Un momento…' : esRegistro ? 'Crear cuenta y entrar' : 'Entrar'}
          </button>

          {!esRegistro && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void restablecer()}>
              Olvidé mi clave
            </button>
          )}

          {ACCESO_INVITADO && (
            <>
              <span className="acceso-separador">o</span>
              <button
                type="button"
                className="btn btn-outline btn-block"
                onClick={() => void entrarComoInvitado()}
              >
                <Unlock size={16} />
                Entrar sin sesión
              </button>
              <p className="acceso-nota">
                Entra con una sesión anónima y permisos totales. Lo que registres queda
                a nombre de «Invitado», no de un vendedor del equipo.
              </p>
            </>
          )}

          {permiteRegistro && (
            <p className="acceso-cambio text-sm muted">
              {esRegistro ? '¿Ya tienes cuenta?' : 'Nadie ha configurado el equipo todavía.'}{' '}
              <button
                type="button"
                className="acceso-enlace"
                onClick={() => {
                  setModo(esRegistro ? 'acceso' : 'registro');
                  setError('');
                }}
              >
                {esRegistro ? 'Entrar' : 'Crear la primera cuenta'}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

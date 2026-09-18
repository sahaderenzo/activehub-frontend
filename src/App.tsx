import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import RequireArea from "./components/RequireArea";
import RequireEmailVerificado from "./components/RequireEmailVerificado";
import RequirePerfilCompleto from "./components/RequirePerfilCompleto";
import RequirePermiso from "./components/RequirePermiso";
import { permisosDePantalla } from "./lib/areas";

import Landing from "./pages/public/Landing";
import Ayuda from "./pages/public/Ayuda";
import Errores from "./pages/public/Errores";
import Login from "./pages/auth/Login";
import Registro from "./pages/auth/Registro";
import VerificarEmail from "./pages/auth/VerificarEmail";
import CompletarRegistro from "./pages/auth/CompletarRegistro";

import AlumnoHome from "./pages/alumno/Home";
import AlumnoExplorar from "./pages/alumno/Explorar";
import AlumnoDetalle from "./pages/alumno/Detalle";
import AlumnoCalendario from "./pages/alumno/Calendario";
import AlumnoFavoritos from "./pages/alumno/Favoritos";
import AlumnoMisClases from "./pages/alumno/MisClases";
import AlumnoPreInscripcion from "./pages/alumno/PreInscripcion";
import AlumnoInscripcion from "./pages/alumno/Inscripcion";
import AlumnoMisPagos from "./pages/alumno/MisPagos";
import AlumnoMisResenas from "./pages/alumno/MisResenas";
import AlumnoMisDenuncias from "./pages/alumno/MisDenuncias";
import AlumnoPerfil from "./pages/alumno/Perfil";

import InstructorPanel from "./pages/instructor/Panel";
import InstructorMisActividades from "./pages/instructor/MisActividades";
import InstructorCrearActividad from "./pages/instructor/CrearActividad";
import InstructorActividadDetalle from "./pages/instructor/ActividadDetalle";
import InstructorGestionClase from "./pages/instructor/GestionClase";
import InstructorProximasClases from "./pages/instructor/ProximasClases";
import InstructorHistorialClases from "./pages/instructor/HistorialClases";
import InstructorMetricas from "./pages/instructor/Metricas";
import InstructorResenas from "./pages/instructor/Resenas";
import InstructorSolicitud from "./pages/instructor/Solicitud";
import InstructorPerfil from "./pages/instructor/Perfil";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminGestion from "./pages/admin/Gestion";
import AdminValidarInstructor from "./pages/admin/ValidarInstructor";
import AdminReportes from "./pages/admin/Reportes";
import AdminTaxonomia from "./pages/admin/Taxonomia";
import AdminRoles from "./pages/admin/Roles";
import AdminPenalizaciones from "./pages/admin/Penalizaciones";
import AdminAuditoria from "./pages/admin/Auditoria";
import AdminTrazabilidad from "./pages/admin/Trazabilidad";
import AdminPerfil from "./pages/admin/Perfil";

function AppRoutes() {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#65788C" }}>
        Cargando…
      </div>
    );
  }

  return (
    <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          {/* Fuera de RequireArea: se llega con sesion pero sin el correo confirmado, y la
              pantalla tiene que ser alcanzable por cualquier rol. */}
          <Route path="/verificar-email" element={<VerificarEmail />} />
          {/* Fuera de las guardas por la misma razon que la anterior: se llega con sesion
              pero con el perfil a medias, y aplica a cualquier rol. */}
          <Route path="/completar-registro" element={<CompletarRegistro />} />
          <Route path="/ayuda" element={<Ayuda />} />

          {/* Envuelve a las TRES areas: sin el correo confirmado no se navega a ningun lado.
              El backend hace lo mismo por su cuenta (`EmailVerificadoFilter`); esto evita
              que el usuario vea pantallas llenandose de 403. */}
          <Route element={<RequireEmailVerificado />}>
          {/* Despues de verificar el correo: primero se confirma quien es, despues se
              completan los datos que Google no da. */}
          <Route element={<RequirePerfilCompleto />}>
          <Route element={<RequireArea area="alumno" />}>
            <Route path="/alumno" element={<AlumnoHome />} />
            <Route path="/alumno/explorar" element={<AlumnoExplorar />} />
            <Route path="/alumno/actividad/:id" element={<AlumnoDetalle />} />
            <Route path="/alumno/favoritos" element={<AlumnoFavoritos />} />
            {/*
              Estas pantallas no son "el area de alumno": son modulos con permiso propio. El
              area se abre con ALGUNO de sus permisos, asi que a un alumno sin
              "inscripciones.gestionar" le quedaban resenias/denuncias y seguia entrando a
              /alumno — y desde ahi a /alumno/inscripcion/:id, que el backend rechaza con 403.
            */}
            <Route element={<RequirePermiso clave="inscripciones.gestionar" />}>
              <Route path="/alumno/calendario" element={<AlumnoCalendario />} />
              <Route path="/alumno/mis-clases" element={<AlumnoMisClases />} />
              <Route path="/alumno/preinscripcion/:id" element={<AlumnoPreInscripcion />} />
              <Route path="/alumno/inscripcion/:id" element={<AlumnoInscripcion />} />
              <Route path="/alumno/mis-pagos" element={<AlumnoMisPagos />} />
            </Route>
            <Route element={<RequirePermiso clave="resenias.escribir" />}>
              <Route path="/alumno/mis-resenas" element={<AlumnoMisResenas />} />
            </Route>
            <Route element={<RequirePermiso clave="denuncias.crear" />}>
              <Route path="/alumno/mis-denuncias" element={<AlumnoMisDenuncias />} />
            </Route>
            <Route path="/alumno/perfil" element={<AlumnoPerfil />} />
          </Route>

          <Route element={<RequireArea area="instructor" />}>
            <Route path="/instructor" element={<InstructorPanel />} />
            {/* "Mis datos" (solicitud) es identidad, no un módulo: no lleva permiso, igual
                que en el backend — RN-16 le deja esa única pantalla al no verificado. */}
            <Route path="/instructor/solicitud" element={<InstructorSolicitud />} />
            <Route path="/instructor/perfil" element={<InstructorPerfil />} />
            <Route element={<RequirePermiso clave="actividades.publicar" />}>
              <Route path="/instructor/actividades" element={<InstructorMisActividades />} />
              <Route path="/instructor/actividades/nueva" element={<InstructorCrearActividad />} />
              <Route path="/instructor/actividades/:id/editar" element={<InstructorCrearActividad />} />
              <Route path="/instructor/actividades/:id" element={<InstructorActividadDetalle />} />
            </Route>
            <Route element={<RequirePermiso clave="clases.gestionar" />}>
              <Route path="/instructor/clases/:id" element={<InstructorGestionClase />} />
              <Route path="/instructor/proximas-clases" element={<InstructorProximasClases />} />
              <Route path="/instructor/historial" element={<InstructorHistorialClases />} />
              <Route path="/instructor/metricas" element={<InstructorMetricas />} />
            </Route>
            <Route element={<RequirePermiso clave="resenias.responder" />}>
              <Route path="/instructor/resenas" element={<InstructorResenas />} />
            </Route>
          </Route>

          <Route element={<RequireArea area="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            {/* "Mi perfil" no lleva permiso: son los datos de la propia cuenta, no un módulo
                de administración. Misma regla que en el panel del instructor. */}
            <Route path="/admin/perfil" element={<AdminPerfil />} />
            {/* Cada pantalla de administración detrás de SU permiso, el mismo que exige el
                `@PreAuthorize` del endpoint que consume. Sin esto alcanzaba con tener uno
                cualquiera de los permisos de admin para entrar por URL a todas las demás y
                comerse un 403 en cada consulta. */}
            {/* Gestión tiene una pestaña por módulo: la abre cualquiera de sus permisos y
                adentro se filtran las pestañas (ver `permisosDePantalla` en lib/areas.ts). */}
            <Route element={<RequirePermiso clave={permisosDePantalla("gestionadmin")} />}>
              <Route path="/admin/gestion" element={<AdminGestion />} />
              <Route path="/admin/gestion/:tab" element={<AdminGestion />} />
            </Route>
            <Route element={<RequirePermiso clave="instructores.validar" />}>
              <Route path="/admin/validar-instructor/:id" element={<AdminValidarInstructor />} />
            </Route>
            <Route element={<RequirePermiso clave="reportes.ver" />}>
              <Route path="/admin/reportes" element={<AdminReportes />} />
            </Route>
            <Route element={<RequirePermiso clave="taxonomia.gestionar" />}>
              <Route path="/admin/taxonomia" element={<AdminTaxonomia />} />
              <Route path="/admin/taxonomia/:tab" element={<AdminTaxonomia />} />
            </Route>
            <Route element={<RequirePermiso clave="roles.configurar" />}>
              <Route path="/admin/roles" element={<AdminRoles />} />
            </Route>
            <Route element={<RequirePermiso clave="penalizaciones.gestionar" />}>
              <Route path="/admin/penalizaciones" element={<AdminPenalizaciones />} />
            </Route>
            <Route element={<RequirePermiso clave="auditoria.ver" />}>
              <Route path="/admin/auditoria" element={<AdminAuditoria />} />
              <Route path="/admin/trazabilidad" element={<AdminTrazabilidad />} />
            </Route>
          </Route>
          </Route>
          </Route>

          <Route path="/404" element={<Errores />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

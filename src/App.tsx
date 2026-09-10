import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DataProvider } from "./context/DataContext";
import RequireArea from "./components/RequireArea";

import Landing from "./pages/public/Landing";
import Ayuda from "./pages/public/Ayuda";
import Errores from "./pages/public/Errores";
import Login from "./pages/auth/Login";
import Registro from "./pages/auth/Registro";

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

import AdminDashboard from "./pages/admin/Dashboard";
import AdminGestion from "./pages/admin/Gestion";
import AdminValidarInstructor from "./pages/admin/ValidarInstructor";
import AdminReportes from "./pages/admin/Reportes";
import AdminTaxonomia from "./pages/admin/Taxonomia";
import AdminRoles from "./pages/admin/Roles";
import AdminPenalizaciones from "./pages/admin/Penalizaciones";
import AdminAuditoria from "./pages/admin/Auditoria";
import AdminTrazabilidad from "./pages/admin/Trazabilidad";

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
          <Route path="/ayuda" element={<Ayuda />} />

          <Route element={<RequireArea area="alumno" />}>
            <Route path="/alumno" element={<AlumnoHome />} />
            <Route path="/alumno/explorar" element={<AlumnoExplorar />} />
            <Route path="/alumno/actividad/:id" element={<AlumnoDetalle />} />
            <Route path="/alumno/calendario" element={<AlumnoCalendario />} />
            <Route path="/alumno/favoritos" element={<AlumnoFavoritos />} />
            <Route path="/alumno/mis-clases" element={<AlumnoMisClases />} />
            <Route path="/alumno/preinscripcion/:id" element={<AlumnoPreInscripcion />} />
            <Route path="/alumno/inscripcion/:id" element={<AlumnoInscripcion />} />
            <Route path="/alumno/mis-pagos" element={<AlumnoMisPagos />} />
            <Route path="/alumno/mis-resenas" element={<AlumnoMisResenas />} />
            <Route path="/alumno/mis-denuncias" element={<AlumnoMisDenuncias />} />
            <Route path="/alumno/perfil" element={<AlumnoPerfil />} />
          </Route>

          <Route element={<RequireArea area="instructor" />}>
            <Route path="/instructor" element={<InstructorPanel />} />
            <Route path="/instructor/actividades" element={<InstructorMisActividades />} />
            <Route path="/instructor/actividades/nueva" element={<InstructorCrearActividad />} />
            <Route path="/instructor/actividades/:id/editar" element={<InstructorCrearActividad />} />
            <Route path="/instructor/actividades/:id" element={<InstructorActividadDetalle />} />
            <Route path="/instructor/clases/:id" element={<InstructorGestionClase />} />
            <Route path="/instructor/proximas-clases" element={<InstructorProximasClases />} />
            <Route path="/instructor/historial" element={<InstructorHistorialClases />} />
            <Route path="/instructor/metricas" element={<InstructorMetricas />} />
            <Route path="/instructor/resenas" element={<InstructorResenas />} />
            <Route path="/instructor/solicitud" element={<InstructorSolicitud />} />
          </Route>

          <Route element={<RequireArea area="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/gestion" element={<AdminGestion />} />
            <Route path="/admin/gestion/:tab" element={<AdminGestion />} />
            <Route path="/admin/validar-instructor/:id" element={<AdminValidarInstructor />} />
            <Route path="/admin/reportes" element={<AdminReportes />} />
            <Route path="/admin/taxonomia" element={<AdminTaxonomia />} />
            <Route path="/admin/taxonomia/:tab" element={<AdminTaxonomia />} />
            <Route path="/admin/roles" element={<AdminRoles />} />
            <Route path="/admin/penalizaciones" element={<AdminPenalizaciones />} />
            <Route path="/admin/auditoria" element={<AdminAuditoria />} />
            <Route path="/admin/trazabilidad" element={<AdminTrazabilidad />} />
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

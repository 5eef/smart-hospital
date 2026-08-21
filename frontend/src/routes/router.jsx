import { createBrowserRouter } from 'react-router-dom'
import { LandingPage } from '../features/landing/LandingPage'
import { LoginPage } from '../features/auth/LoginPage'
import { RegisterPage } from '../features/auth/RegisterPage'
import { AdminDashboard } from '../features/admin/pages/AdminDashboard'
import { AdminDoctorsPage } from '../features/admin/pages/AdminDoctorsPage'
import { AdminPatientsPage } from '../features/admin/pages/AdminPatientsPage'
import { AdminSpecialtiesPage } from '../features/admin/pages/AdminSpecialtiesPage'
import { AdminAppointmentsPage } from '../features/admin/pages/AdminAppointmentsPage'
import { AdminStatisticsPage } from '../features/admin/pages/AdminStatisticsPage'
import { DoctorDashboard } from '../features/doctor/pages/DoctorDashboard'
import { DoctorConsultationsPage } from '../features/doctor/pages/DoctorConsultationsPage'
import { DoctorPatientsPage } from '../features/doctor/pages/DoctorPatientsPage'
import { DoctorAppointmentsPage } from '../features/doctor/pages/DoctorAppointmentsPage'
import { PatientDashboard } from '../features/patient/pages/PatientDashboard'
import { PatientAppointmentPage } from '../features/patient/pages/PatientAppointmentPage'
import { PatientAppointmentsPage } from '../features/patient/pages/PatientAppointmentsPage'
import { PatientMedicalRecordPage } from '../features/patient/pages/PatientMedicalRecordPage'
import { PatientProfilePage } from '../features/patient/pages/PatientProfilePage'
import { AppLayout } from '../components/layout/AppLayout'
import { ProtectedRoute } from './ProtectedRoute'

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <ProtectedRoute allowedRoles={['admin']} />,
    children: [
      {
        path: '/admin',
        element: <AppLayout role="admin" />,
        children: [
          { index: true, element: <AdminDashboard /> },
          { path: 'doctors', element: <AdminDoctorsPage /> },
          { path: 'patients', element: <AdminPatientsPage /> },
          { path: 'specialties', element: <AdminSpecialtiesPage /> },
          { path: 'appointments', element: <AdminAppointmentsPage /> },
          { path: 'statistics', element: <AdminStatisticsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['doctor']} />,
    children: [
      {
        path: '/doctor',
        element: <AppLayout role="doctor" />,
        children: [
          { index: true, element: <DoctorDashboard /> },
          { path: 'consultations', element: <DoctorConsultationsPage /> },
          { path: 'patients', element: <DoctorPatientsPage /> },
          { path: 'appointments', element: <DoctorAppointmentsPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute allowedRoles={['patient']} />,
    children: [
      {
        path: '/patient',
        element: <AppLayout role="patient" />,
        children: [
          { index: true, element: <PatientDashboard /> },
          { path: 'appointments', element: <PatientAppointmentsPage /> },
          { path: 'appointments/new', element: <PatientAppointmentPage /> },
          { path: 'medical-record', element: <PatientMedicalRecordPage /> },
          { path: 'profile', element: <PatientProfilePage /> },
        ],
      },
    ],
  },
])

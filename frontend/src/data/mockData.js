import {
  Activity,
  CalendarCheck,
  CircleDollarSign,
  ClipboardPlus,
  HeartPulse,
  Stethoscope,
  Users,
} from 'lucide-react'

export const adminStats = [
  { label: 'Total patients', value: '2,845', change: '+12%', icon: Users, tone: 'blue' },
  { label: 'Total médecins', value: '142', change: '+3%', icon: ClipboardPlus, tone: 'violet' },
  { label: 'Total rendez-vous', value: '640', change: '-2%', icon: CalendarCheck, tone: 'amber' },
  { label: 'Revenus mensuels', value: '€84,200', change: '+18%', icon: CircleDollarSign, tone: 'emerald' },
]

export const doctors = [
  { id: 'DOC-12903', name: 'Dr. Jean Dupont', specialty: 'Cardiologie', email: 'jean.dupont@smarthospital.fr', phone: '+33 1 23 45 67 89', status: 'Actif' },
  { id: 'DOC-12945', name: 'Dr. Marie Lefebvre', specialty: 'Neurologie', email: 'marie.l@smarthospital.fr', phone: '+33 1 98 76 54 32', status: 'Actif' },
  { id: 'DOC-13012', name: 'Dr. Thomas Martin', specialty: 'Pédiatrie', email: 't.martin@smarthospital.fr', phone: '+33 1 44 55 66 77', status: 'Inactif' },
  { id: 'DOC-13056', name: 'Dr. Sophie Morel', specialty: 'Oncologie', email: 's.morel@smarthospital.fr', phone: '+33 1 11 22 33 44', status: 'Actif' },
]

export const patients = [
  { id: 'PT-9021', name: 'Jean Dupont', birthDate: '12/05/1985', department: 'Cardiologie', lastVisit: '24 Oct 2023', status: 'stable' },
  { id: 'PT-8442', name: 'Marie Lefebvre', birthDate: '03/11/1992', department: 'Pédiatrie', lastVisit: 'Il y a 2 jours', status: 'stable' },
  { id: 'PT-7784', name: 'Robert Bernard', birthDate: '22/07/1964', department: 'Urgences', lastVisit: 'En cours...', status: 'critique' },
  { id: 'PT-1102', name: 'Sophie Durand', birthDate: '15/09/2001', department: 'Neurologie', lastVisit: '05 Nov 2023', status: 'stable' },
]

export const appointments = [
  { id: 1, patient: 'Elena Rodriguez', doctor: 'Dr. Sarah Connor', date: 'Oct 24, 2023', time: '09:00', department: 'Cardiology', status: 'Confirmed' },
  { id: 2, patient: 'James Wilson', doctor: 'Dr. Michael Chen', date: 'Oct 24, 2023', time: '10:30', department: 'Orthopedics', status: 'Pending' },
  { id: 3, patient: 'Robert Fox', doctor: 'Dr. Lisa Ray', date: 'Oct 24, 2023', time: '13:15', department: 'Neurology', status: 'Cancelled' },
  { id: 4, patient: 'Maria Montgomery', doctor: 'Dr. Sarah Connor', date: 'Oct 24, 2023', time: '15:45', department: 'Cardiology', status: 'Confirmed' },
]

export const specialties = [
  { name: 'Cardiology', description: 'Comprehensive cardiovascular care including diagnostics and surgery.', doctors: 15, icon: HeartPulse },
  { name: 'Pediatrics', description: 'Specialized healthcare for infants, children, and adolescents.', doctors: 21, icon: Users },
  { name: 'Neurology', description: 'Diagnosis and treatment for nervous system conditions.', doctors: 8, icon: Activity },
  { name: 'Oncology', description: 'Cancer treatment including chemotherapy and immunotherapy.', doctors: 12, icon: Stethoscope },
]

export const doctorQueue = [
  { patient: 'Jean Dupont', time: '09:15', status: 'En attente', action: 'Voir dossier' },
  { patient: 'Marie Laurent', time: '10:00', status: 'En cours', action: 'Consultation' },
  { patient: 'Pierre Bernard', time: '10:45', status: 'Prévu', action: 'Voir dossier' },
]

export const doctorAppointments = [
  { time: '09:00', patient: 'Sarah Lemoine', reason: 'Suivi post-opératoire', status: 'Stable' },
  { time: '09:45', patient: 'Jean-Pierre Dubois', reason: 'Consultation de routine', status: 'Urgent' },
  { time: '10:30', patient: 'Clara Martinez', reason: "Résultats d'analyses", status: 'Checkup' },
]

export const patientActions = [
  { title: 'Prendre Rendez-vous', description: 'Trouver un spécialiste ou un généraliste', path: '/patient/appointments/new', icon: CalendarCheck },
  { title: 'Mes Rendez-vous', description: 'Gérer vos consultations passées et futures', path: '/patient', icon: ClipboardPlus },
  { title: 'Mon Dossier Médical', description: "Résultats d'analyses, ordonnances et historique", path: '/patient', icon: HeartPulse },
]

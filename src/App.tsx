import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import HomePage from './pages/HomePage'
import StudentAttendancePage from './pages/StudentAttendancePage'
import FacultyAttendancePage from './pages/FacultyAttendancePage'
import ProjectManagementPage from './pages/ProjectManagementPage'
import ProjectAttendancePage from './pages/ProjectAttendancePage'
import QRGeneratorPage from './pages/QRGeneratorPage'

import VacationRequestPage from './pages/VacationRequestPage'
import FacultyVacationApprovalPage from './pages/FacultyVacationApprovalPage'
import WorkTimeSettingsPage from './pages/WorkTimeSettingsPage'
import PasswordChangePage from './pages/PasswordChangePage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<HomePage />} />
            <Route path="/student-attendance" element={<StudentAttendancePage />} />
            <Route path="/faculty-attendance" element={<FacultyAttendancePage />} />
            <Route path="/project-management" element={<ProjectManagementPage />} />
            <Route path="/group-management" element={<ProjectManagementPage />} />
            <Route path="/project-attendance/:groupId" element={<ProjectAttendancePage />} />
            <Route path="/group-attendance/:groupId" element={<ProjectAttendancePage />} />
            <Route path="/qr-generator" element={<QRGeneratorPage />} />
            <Route path="/qr_generator" element={<QRGeneratorPage />} />

                                <Route path="/vacation" element={<VacationRequestPage />} />
                    <Route path="/faculty-vacation-approval" element={<FacultyVacationApprovalPage />} />
                    <Route path="/work-time-settings" element={<WorkTimeSettingsPage />} />
                    <Route path="/password-change" element={<PasswordChangePage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App 
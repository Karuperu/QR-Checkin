import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AttendancePage from './pages/AttendancePage'
import FacultyAttendancePage from './pages/FacultyAttendancePage'
import ProjectManagementPage from './pages/ProjectManagementPage'
import ProjectAttendancePage from './pages/ProjectAttendancePage'
import QRGeneratorPage from './pages/QRGeneratorPage'
import StatsPage from './pages/StatsPage'
import VacationRequestPage from './pages/VacationRequestPage'
import WorkTimeSettingsPage from './pages/WorkTimeSettingsPage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/faculty-attendance" element={<FacultyAttendancePage />} />
          <Route path="/project-management" element={<ProjectManagementPage />} />
          <Route path="/project-attendance/:groupId" element={<ProjectAttendancePage />} />
          <Route path="/qr-generator" element={<QRGeneratorPage />} />
          <Route path="/qr_generator" element={<QRGeneratorPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/vacation" element={<VacationRequestPage />} />
          <Route path="/work-time-settings" element={<WorkTimeSettingsPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App 
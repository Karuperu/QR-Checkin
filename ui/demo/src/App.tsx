import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from '../../HomePage'
import StudentAttendancePage from '../../StudentAttendancePage'
import FacultyAttendancePage from '../../FacultyAttendancePage'
import QRGeneratorPage from '../../QRGeneratorPage'
import VacationRequestPage from '../../VacationRequestPage'
import FacultyVacationApprovalPage from '../../FacultyVacationApprovalPage'
import WorkTimeSettingsPage from '../../WorkTimeSettingsPage'
import StatsPage from '../../StatsPage'
import StudentStatsPage from '../../StudentStatsPage'
import GroupManagementPage from '../../ProjectManagementPage'
import GroupAttendancePage from '../../ProjectAttendancePage'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<HomePage />} />
          <Route path="/student-attendance" element={<StudentAttendancePage />} />
          <Route path="/faculty-attendance" element={<FacultyAttendancePage />} />
          <Route path="/qr_generator" element={<QRGeneratorPage />} />
          <Route path="/vacation" element={<VacationRequestPage />} />
          <Route path="/faculty-vacation-approval" element={<FacultyVacationApprovalPage />} />
          <Route path="/work_time_settings" element={<WorkTimeSettingsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/student-stats" element={<StudentStatsPage />} />
          <Route path="/group-management" element={<GroupManagementPage />} />
          <Route path="/group-attendance/:groupId" element={<GroupAttendancePage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App 
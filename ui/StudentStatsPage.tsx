import React, { useState } from 'react'
import { ArrowLeft, Calendar, User, PieChart, TrendingUp } from 'lucide-react'

// 원형 진행률 컴포넌트
const CircularProgress = ({ percentage, size = 120, strokeWidth = 12, color = "#3b82f6" }: {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-bold text-gray-800">{percentage}%</span>
      </div>
    </div>
  )
}

const StudentStatsPage = () => {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedWeek, setSelectedWeek] = useState('current')

  // 개인 출석 데이터
  const personalStats = {
    name: '김학생',
    id: '2024001',
    dept: '컴퓨터공학과',
    totalDays: 15,
    attendedDays: 13,
    lateDays: 2,
    earlyLeaveDays: 1,
    absentDays: 0,
    vacationDays: 2,
    attendanceRate: 87
  }

  // 주차별 개인 출석 데이터
  const weeklyPersonalData = {
    current: {
      label: '3주차',
      attendance: ['출근', '출근', '출근', '지각', '출근'],
      days: ['월', '화', '수', '목', '금'],
      summary: { 출근: 4, 지각: 1, 조기퇴근: 0, 결근: 0, 휴가: 0 }
    },
    last: {
      label: '2주차', 
      attendance: ['출근', '출근', '지각', '출근', '출근'],
      days: ['월', '화', '수', '목', '금'],
      summary: { 출근: 4, 지각: 1, 조기퇴근: 0, 결근: 0, 휴가: 0 }
    },
    before: {
      label: '1주차',
      attendance: ['휴가', '출근', '출근', '출근', '출근'],
      days: ['월', '화', '수', '목', '금'],
      summary: { 출근: 4, 지각: 0, 조기퇴근: 0, 결근: 0, 휴가: 1 }
    }
  }

  const currentWeekData = weeklyPersonalData[selectedWeek as keyof typeof weeklyPersonalData]

  // 출석 상태 텍스트 및 색상 (신호등 방식)
  const getAttendanceInfo = (status: string) => {
    switch (status) {
      case '출근': return { text: '출근', color: 'bg-green-50 text-green-700 border-green-200', bgColor: 'bg-green-500' }
      case '지각': return { text: '지각', color: 'bg-yellow-50 text-yellow-600 border-yellow-200', bgColor: 'bg-yellow-500' }
      case '조기퇴근': return { text: '조기', color: 'bg-orange-50 text-orange-600 border-orange-200', bgColor: 'bg-orange-600' }
      case '결근': return { text: '결근', color: 'bg-red-50 text-red-700 border-red-200', bgColor: 'bg-red-500' }
      case '휴가': return { text: '휴가', color: 'bg-purple-50 text-purple-700 border-purple-200', bgColor: 'bg-purple-500' }
      default: return { text: '-', color: 'bg-gray-50 text-gray-700 border-gray-200', bgColor: 'bg-gray-500' }
    }
  }

  const tabs = [
    { id: 'overview', label: '현황', icon: PieChart },
    { id: 'trends', label: '추이', icon: TrendingUp }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">
              내 출석 현황
            </h1>
          </div>
          
          <div className="flex items-center space-x-3 text-sm text-gray-600">
            <User className="w-4 h-4" />
            <span>{personalStats.name} ({personalStats.id})</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 현황 탭 */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* 전체 출석률 - 더 깔끔한 디자인 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-8">전체 출석률</h3>
                <CircularProgress percentage={personalStats.attendanceRate} size={140} color="#16a34a" />
                <div className="mt-6 space-y-1">
                  <p className="text-2xl font-bold text-gray-800">{personalStats.attendanceRate}%</p>
                  <p className="text-sm text-gray-500">총 {personalStats.totalDays}일 중 {personalStats.attendedDays}일 출석</p>
                </div>
              </div>
            </div>

            {/* 출석 상세 현황 - 더 모던한 카드 스타일 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">출석 상세</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">정상출석</p>
                  <p className="text-2xl font-bold text-green-600">{personalStats.attendedDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">지각</p>
                  <p className="text-2xl font-bold text-yellow-500">{personalStats.lateDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">조기퇴근</p>
                  <p className="text-2xl font-bold text-orange-500">{personalStats.earlyLeaveDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">결근</p>
                  <p className="text-2xl font-bold text-red-600">{personalStats.absentDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">휴가</p>
                  <p className="text-2xl font-bold text-purple-600">{personalStats.vacationDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추이 탭 */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            {/* 주차 선택 - 더 깔끔한 디자인 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">기간 선택</h3>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
                >
                  <option value="current">3주차</option>
                  <option value="last">2주차</option>
                  <option value="before">1주차</option>
                </select>
              </div>
            </div>

            {/* 주간 개인 출석 현황 - 더 모던한 디자인 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-8">{currentWeekData.label} 출석 기록</h3>
              
              {/* 달력 형태 출석 표시 - 텍스트 기반 */}
              <div className="grid grid-cols-5 gap-3 mb-8">
                {currentWeekData.days.map((day, index) => {
                  const status = currentWeekData.attendance[index]
                  const statusInfo = getAttendanceInfo(status)
                  return (
                    <div key={day} className="text-center">
                      <div className="text-sm font-medium text-gray-500 mb-3">{day}</div>
                      <div className={`w-14 h-14 rounded-lg flex items-center justify-center mx-auto border ${statusInfo.color} transition-all hover:scale-105`}>
                        <span className="text-xs font-bold">{statusInfo.text}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-2">{status}</div>
                    </div>
                  )
                })}
              </div>

              {/* 주간 요약 - 통일된 색상 */}
              <div className="border-t border-gray-100 pt-6">
                <h4 className="text-md font-semibold text-gray-700 mb-4">{currentWeekData.label} 요약</h4>
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                    <div className="text-lg font-bold text-green-600">{currentWeekData.summary.출근}</div>
                    <div className="text-xs text-gray-500">정상출석</div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                    <div className="text-lg font-bold text-yellow-500">{currentWeekData.summary.지각}</div>
                    <div className="text-xs text-gray-500">지각</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                    <div className="text-lg font-bold text-orange-500">{currentWeekData.summary.조기퇴근}</div>
                    <div className="text-xs text-gray-500">조기퇴근</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                    <div className="text-lg font-bold text-red-600">{currentWeekData.summary.결근}</div>
                    <div className="text-xs text-gray-500">결근</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                    <div className="text-lg font-bold text-purple-600">{currentWeekData.summary.휴가}</div>
                    <div className="text-xs text-gray-500">휴가</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StudentStatsPage 
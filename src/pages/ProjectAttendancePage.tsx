import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, Users, Clock, Calendar, Settings, Bell, UserPlus, BarChart3, TrendingUp, User,
  Download, Filter, Plane, Eye, Award, Target, Zap, Star, Activity, PieChart, LineChart,
  AlertCircle, CheckCircle, Save, X
} from 'lucide-react'

const ProjectAttendancePage = () => {
  const navigate = useNavigate()
  const { groupId } = useParams()
  
  // 그룹 정보 (실제로는 API에서 가져올 데이터)
  const groupInfo = {
    '1': { name: '웹 개발 그룹', memberCount: 28 },
    '2': { name: '모바일 앱 개발', memberCount: 15 },
    '3': { name: 'UI/UX 디자인', memberCount: 8 }
  }

  const currentGroup = groupInfo[groupId as keyof typeof groupInfo] || { name: '그룹', memberCount: 0 }

  const [selectedTab, setSelectedTab] = useState('dashboard')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/project-management')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentGroup.name}</h1>
                <p className="text-sm text-gray-500">{currentGroup.memberCount}명 참여</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => navigate('/work-time-settings')}
                className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setSelectedTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setSelectedTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              구성원
            </button>
            <button
              onClick={() => setSelectedTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              설정
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {selectedTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 오늘 출석 현황 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">오늘 출석 현황</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">23</div>
                  <div className="text-sm text-gray-500">출석</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600">3</div>
                  <div className="text-sm text-gray-500">지각</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">2</div>
                  <div className="text-sm text-gray-500">결근</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">1</div>
                  <div className="text-sm text-gray-500">휴가</div>
                </div>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-medium text-gray-900 mb-4">빠른 액션</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <UserPlus className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium">구성원 추가</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <Download className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium">출석 내보내기</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <Plane className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium">휴가 관리</span>
                </button>
                <button className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50">
                  <Settings className="w-8 h-8 text-gray-600 mb-2" />
                  <span className="text-sm font-medium">설정</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTab === 'stats' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">출석 통계</h2>
            <p className="text-gray-600">통계 차트가 여기에 표시됩니다.</p>
          </div>
        )}

        {selectedTab === 'members' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">구성원 관리</h2>
            <p className="text-gray-600">구성원 목록이 여기에 표시됩니다.</p>
          </div>
        )}

        {selectedTab === 'settings' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">그룹 설정</h2>
            <p className="text-gray-600">그룹 설정이 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectAttendancePage
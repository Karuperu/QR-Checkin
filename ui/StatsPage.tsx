import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Users, Calendar, Clock, UserCheck, UserX, BarChart3,
  Download, Filter, Plane, TrendingUp, Eye, Award, Target,
  Zap, Star, Activity, PieChart, LineChart
} from 'lucide-react'

interface ChartData {
  name: string
  value: number
  color: string
  icon: React.ReactNode
}

export default function StatsPage() {
  const navigate = useNavigate()
  const [selectedTab, setSelectedTab] = useState<'overview' | 'trends' | 'details'>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedWeek, setSelectedWeek] = useState('current')

  // 주차별 데이터
  const weeklyData = {
    current: {
      label: '3주차',
      dateRange: '1월 15일 ~ 1월 19일',
      stackData: [
        { day: '월요일', 출근: 20, 지각: 3, 조기퇴근: 1, 정상퇴근: 4, 결근: 2, 휴가: 1 },
        { day: '화요일', 출근: 18, 지각: 4, 조기퇴근: 2, 정상퇴근: 3, 결근: 2, 휴가: 2 },
        { day: '수요일', 출근: 22, 지각: 2, 조기퇴근: 1, 정상퇴근: 4, 결근: 1, 휴가: 1 },
        { day: '목요일', 출근: 19, 지각: 4, 조기퇴근: 2, 정상퇴근: 3, 결근: 2, 휴가: 1 },
        { day: '금요일', 출근: 21, 지각: 3, 조기퇴근: 1, 정상퇴근: 4, 결근: 1, 휴가: 1 }
      ],
      studentData: [
        { name: '김학생', id: '2024001', dept: '컴공과', attendance: ['출근', '정상퇴근', '출근', '지각', '출근'], rate: '100%' },
        { name: '이영희', id: '2024002', dept: '전자과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '박철수', id: '2024003', dept: '기계과', attendance: ['지각', '출근', '조기퇴근', '출근', '출근'], rate: '100%' },
        { name: '최민수', id: '2024004', dept: '컴공과', attendance: ['출근', '출근', '출근', '결근', '출근'], rate: '80%' },
        { name: '정수연', id: '2024005', dept: '전자과', attendance: ['출근', '휴가', '출근', '출근', '출근'], rate: '100%' },
        { name: '서영진', id: '2024006', dept: '기계과', attendance: ['출근', '출근', '출근', '조기퇴근', '정상퇴근'], rate: '100%' },
        { name: '황기철', id: '2024007', dept: '컴공과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' }
      ]
    },
    last: {
      label: '2주차',
      dateRange: '1월 8일 ~ 1월 12일',
      stackData: [
        { day: '월요일', 출근: 17, 지각: 4, 조기퇴근: 2, 정상퇴근: 4, 결근: 3, 휴가: 1 },
        { day: '화요일', 출근: 20, 지각: 2, 조기퇴근: 1, 정상퇴근: 5, 결근: 1, 휴가: 2 },
        { day: '수요일', 출근: 18, 지각: 6, 조기퇴근: 2, 정상퇴근: 2, 결근: 2, 휴가: 1 },
        { day: '목요일', 출근: 22, 지각: 1, 조기퇴근: 1, 정상퇴근: 5, 결근: 0, 휴가: 2 },
        { day: '금요일', 출근: 19, 지각: 3, 조기퇴근: 2, 정상퇴근: 4, 결근: 1, 휴가: 2 }
      ],
      studentData: [
        { name: '김학생', id: '2024001', dept: '컴공과', attendance: ['출근', '출근', '지각', '출근', '출근'], rate: '100%' },
        { name: '이영희', id: '2024002', dept: '전자과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '박철수', id: '2024003', dept: '기계과', attendance: ['지각', '출근', '출근', '출근', '지각'], rate: '100%' },
        { name: '최민수', id: '2024004', dept: '컴공과', attendance: ['결근', '출근', '지각', '출근', '출근'], rate: '80%' },
        { name: '정수연', id: '2024005', dept: '전자과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '서영진', id: '2024006', dept: '기계과', attendance: ['출근', '지각', '결근', '출근', '출근'], rate: '80%' },
        { name: '황기철', id: '2024007', dept: '컴공과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' }
      ]
    },
    before: {
      label: '1주차',
      dateRange: '1월 1일 ~ 1월 5일',
      stackData: [
        { day: '월요일', 출근: 21, 지각: 2, 조기퇴근: 1, 정상퇴근: 5, 결근: 1, 휴가: 1 },
        { day: '화요일', 출근: 19, 지각: 4, 조기퇴근: 2, 정상퇴근: 3, 결근: 2, 휴가: 1 },
        { day: '수요일', 출근: 22, 지각: 1, 조기퇴근: 1, 정상퇴근: 5, 결근: 0, 휴가: 2 },
        { day: '목요일', 출근: 20, 지각: 3, 조기퇴근: 2, 정상퇴근: 4, 결근: 1, 휴가: 1 },
        { day: '금요일', 출근: 18, 지각: 5, 조기퇴근: 2, 정상퇴근: 3, 결근: 2, 휴가: 1 }
      ],
      studentData: [
        { name: '김학생', id: '2024001', dept: '컴공과', attendance: ['출근', '출근', '출근', '출근', '지각'], rate: '100%' },
        { name: '이영희', id: '2024002', dept: '전자과', attendance: ['출근', '지각', '출근', '출근', '출근'], rate: '100%' },
        { name: '박철수', id: '2024003', dept: '기계과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '최민수', id: '2024004', dept: '컴공과', attendance: ['출근', '결근', '출근', '지각', '출근'], rate: '80%' },
        { name: '정수연', id: '2024005', dept: '전자과', attendance: ['지각', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '서영진', id: '2024006', dept: '기계과', attendance: ['출근', '출근', '출근', '출근', '지각'], rate: '100%' },
        { name: '황기철', id: '2024007', dept: '컴공과', attendance: ['출근', '지각', '출근', '출근', '결근'], rate: '80%' }
      ]
    }
  }

  // 차트에 사용할 데이터
  const chartData: ChartData[] = [
    { name: '출근', value: 25, color: '#10b981', icon: <UserCheck className="w-6 h-6" /> },
    { name: '지각', value: 3, color: '#f59e0b', icon: <Clock className="w-6 h-6" /> },
    { name: '결근', value: 2, color: '#ef4444', icon: <UserX className="w-6 h-6" /> },
    { name: '휴가', value: 2, color: '#9333ea', icon: <Plane className="w-6 h-6" /> }
  ]

  // 그룹화된 차트 데이터 (신호등 방식)
  const groupedStats = [
    {
      title: '출근 현황',
      icon: <UserCheck className="w-5 h-5" />,
              data: [
          { name: '출근', value: 25, count: 25, color: '#16a34a' },
          { name: '지각', value: 3, count: 3, color: '#facc15' }
        ],
      total: 28
    },
          {
        title: '퇴근 현황',
        icon: <Clock className="w-5 h-5" />,
        data: [
          { name: '정상퇴근', value: 20, count: 20, color: '#2563eb' },
          { name: '조기퇴근', value: 2, count: 2, color: '#f97316' }
        ],
        total: 22
      },
    {
      title: '결근',
      icon: <UserX className="w-5 h-5" />,
      data: [
        { name: '결근', value: 100, count: 2, color: '#dc2626' }
      ],
      total: 2
    },
          {
        title: '휴가',
        icon: <Plane className="w-5 h-5" />,
        data: [
          { name: '휴가', value: 100, count: 1, color: '#9333ea' }
        ],
        total: 1
      }
  ]

  const DualCircularProgress = ({ data, size = 120, strokeWidth = 12 }: {
    data: { name: string; value: number; count: number; color: string }[]
    size?: number
    strokeWidth?: number
  }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    
    let currentOffset = 0

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* 배경 원 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* 데이터별 원호 */}
          {data.map((item, index) => {
            const strokeDasharray = circumference
            const percentage = data.length === 1 ? 100 : (item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100
            const strokeDashoffset = circumference - (percentage / 100) * circumference
            
            const segment = (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  transform: `rotate(${currentOffset}deg)`,
                  transformOrigin: `${size / 2}px ${size / 2}px`
                }}
              />
            )
            
            currentOffset += percentage * 3.6 // 360도를 100%로 변환
            return segment
          })}
        </svg>
        
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
                {data.reduce((sum, item) => sum + item.count, 0)}명
              </span>
              <span className="text-xs text-gray-500">총합</span>
        </div>
      </div>
    )
  }

  // 스택 바 차트 컴포넌트 (세로형)
  const StackedBarChart = ({ data }: { data: any[] }) => {
    const maxTotal = Math.max(...data.map(d => d.출근 + d.지각 + d.조기퇴근 + d.정상퇴근 + d.결근 + d.휴가))
    
    return (
      <div className="flex justify-center items-end space-x-4 h-80">
        {data.map((day, index) => {
          const total = day.출근 + day.지각 + day.조기퇴근 + day.정상퇴근 + day.결근 + day.휴가
          const barHeight = 250 // 최대 높이
          
          // 각 섹션의 높이 계산
          const heights = {
            출근: (day.출근 / maxTotal) * barHeight,
            지각: (day.지각 / maxTotal) * barHeight,
            조기퇴근: (day.조기퇴근 / maxTotal) * barHeight,
            정상퇴근: (day.정상퇴근 / maxTotal) * barHeight,
            결근: (day.결근 / maxTotal) * barHeight,
            휴가: (day.휴가 / maxTotal) * barHeight
          }
          
          return (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="text-sm text-gray-500">총 {total}명</div>
              
              <div 
                className="relative w-16 bg-transparent rounded-lg overflow-hidden flex flex-col justify-end"
                style={{ height: `${barHeight}px` }}
              >
                {/* 결근 (맨 위) */}
                <div 
                  className="w-full bg-red-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.결근}px` }}
                >
                  {day.결근 > 0 && heights.결근 > 20 && day.결근}
                </div>
                
                {/* 휴가 */}
                <div 
                  className="w-full bg-purple-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.휴가}px` }}
                >
                  {day.휴가 > 0 && heights.휴가 > 20 && day.휴가}
                </div>
                
                {/* 조기퇴근 */}
                <div 
                  className="w-full bg-orange-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.조기퇴근}px` }}
                >
                  {day.조기퇴근 > 0 && heights.조기퇴근 > 20 && day.조기퇴근}
                </div>
                
                {/* 정상퇴근 */}
                <div 
                  className="w-full bg-blue-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.정상퇴근}px` }}
                >
                  {day.정상퇴근 > 0 && heights.정상퇴근 > 20 && day.정상퇴근}
                </div>
                
                {/* 지각 */}
                <div 
                  className="w-full bg-yellow-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.지각}px` }}
                >
                  {day.지각 > 0 && heights.지각 > 20 && day.지각}
                </div>
                
                {/* 출근 (맨 아래) */}
                <div 
                  className="w-full bg-green-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.출근}px` }}
                >
                  {day.출근 > 0 && heights.출근 > 20 && day.출근}
                </div>
              </div>
              
              <span className="text-sm font-medium text-gray-700">{day.day}</span>
            </div>
          )
        })}
      </div>
    )
  }

  // 개별 학생 출석 현황
  const StudentAttendanceGrid = ({ students }: { students: any[] }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case '출근': return 'bg-green-500'
        case '지각': return 'bg-yellow-400'
        case '정상퇴근': return 'bg-green-500'
        case '조기퇴근': return 'bg-blue-500'
        case '휴가': return 'bg-purple-500'
        case '결근': return 'bg-red-500'
        default: return 'bg-gray-300'
      }
    }

    const getStatusEmoji = (status: string) => {
      switch (status) {
        case '출근': return '✓'
        case '지각': return '!'
        case '정상퇴근': return '✓'
        case '조기퇴근': return '↗'
        case '휴가': return 'V'
        case '결근': return '✗'
        default: return '?'
      }
    }

    const days = ['월', '화', '수', '목', '금']

    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 헤더 (학생 정보, 요일, 출석률) */}
        <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
            <div className="col-span-4 sm:col-span-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700">학생 정보</span>
            </div>
            <div className="col-span-6 sm:col-span-7 grid grid-cols-5 gap-1 sm:gap-2">
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">월</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">화</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">수</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">목</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">금</span>
              </div>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs sm:text-sm font-medium text-gray-700">출석률</span>
            </div>
          </div>
        </div>

        {/* 학생 목록 */}
        <div className="divide-y divide-gray-100">
          {students.map((student, index) => (
            <div key={index} className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
                {/* 학생 정보 */}
                <div className="col-span-4 sm:col-span-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{student.name}</h4>
                      <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
                        <span className="truncate">{student.id}</span>
                        <span>•</span>
                        <span className="truncate">{student.dept}</span>
                      </div>
                    </div>
                    <div className="sm:hidden">
                      <p className="text-xs text-gray-500 truncate">{student.id} • {student.dept}</p>
                    </div>
                  </div>
                </div>

                {/* 출석 상태 (5일) - 아이콘만 */}
                <div className="col-span-6 sm:col-span-7 grid grid-cols-5 gap-1 sm:gap-2">
                  {student.attendance.map((status: string, dayIndex: number) => (
                    <div key={dayIndex} className="flex justify-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg ${getStatusColor(status)} flex items-center justify-center text-white text-xs font-medium shadow-sm`}>
                        <span className="hidden sm:inline">{getStatusEmoji(status)}</span>
                        <span className="sm:hidden text-xs">
                          {status === '출근' ? '✓' : status === '지각' ? '!' : status === '결근' ? '✗' : status === '휴가' ? 'V' : status === '조기퇴근' ? '↗' : status === '정상퇴근' ? '✓' : '?'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 출석률 */}
                <div className="col-span-2 text-center">
                  <span className={`text-xs sm:text-sm font-bold ${
                    parseFloat(student.rate.replace('%', '')) >= 90 
                      ? 'text-green-600' 
                      : parseFloat(student.rate.replace('%', '')) >= 80 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {student.rate}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 범례 */}
        <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">출근</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span className="text-gray-600">지각</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">조기퇴근</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-gray-600">휴가</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">결근</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentData = weeklyData[selectedWeek as keyof typeof weeklyData]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
              <h1 className="text-xl font-bold text-gray-900">출석 현황</h1>
            </div>
            
          <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Download className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Filter className="w-5 h-5 text-gray-600" />
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-2xl shadow-sm">
          <div className="flex">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                selectedTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <PieChart className="w-5 h-5" />
              <span className="font-medium">현황</span>
            </button>
            <button
              onClick={() => setSelectedTab('trends')}
              className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                selectedTab === 'trends'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">추이</span>
            </button>
            <button
              onClick={() => setSelectedTab('details')}
              className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                selectedTab === 'details'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Eye className="w-5 h-5" />
              <span className="font-medium">상세</span>
            </button>
          </div>
        </div>

        {/* 현황 탭 */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 전체 출석률 - 통합 차트 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                전체 출석률
              </h3>
              
              <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-8 px-4">
                {/* 통합 원형 게이지 */}
                <div className="relative flex-shrink-0">
                  <svg width="180" height="180" className="transform -rotate-90">
                    {/* 배경 원 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#e5e7eb"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    
                    {/* 출근 (정상 출근) */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#86efac"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(25 / 53) * 471.2} 471.2`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* 지각 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#fde047"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(3 / 53) * 471.2} 471.2`}
                      strokeDashoffset={`-${(25 / 53) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* 정상퇴근 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#93c5fd"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(20 / 53) * 471.2} 471.2`}
                      strokeDashoffset={`-${((25 + 3) / 53) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* 조기퇴근 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#fdba74"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(2 / 53) * 471.2} 471.2`}
                      strokeDashoffset={`-${((25 + 3 + 20) / 53) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* 결근 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#fca5a5"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(2 / 53) * 471.2} 471.2`}
                      strokeDashoffset={`-${((25 + 3 + 20 + 2) / 53) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                    
                    {/* 휴가 */}
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#c4b5fd"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${(1 / 53) * 471.2} 471.2`}
                      strokeDashoffset={`-${((25 + 3 + 20 + 2 + 2) / 53) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  
                  {/* 중앙 텍스트 */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">53명</span>
                    <span className="text-sm text-gray-600">전체 학생</span>
                  </div>
                        </div>
                
                {/* 범례 */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">출근</p>
                      <p className="text-sm font-bold text-green-600">25명</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">지각</p>
                      <p className="text-sm font-bold text-yellow-600">3명</p>
              </div>
            </div>

                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">정상퇴근</p>
                      <p className="text-sm font-bold text-blue-600">20명</p>
                </div>
              </div>
              
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">조기퇴근</p>
                      <p className="text-sm font-bold text-orange-600">2명</p>
                </div>
                </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">결근</p>
                      <p className="text-sm font-bold text-red-600">2명</p>
                </div>
              </div>
              
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-300 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-700">휴가</p>
                      <p className="text-sm font-bold text-purple-600">1명</p>
                    </div>
                </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 추이 탭 */}
        {selectedTab === 'trends' && (
          <div className="space-y-6">
            {/* 주차 선택 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  기간 선택
                </h3>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="current">3주차</option>
                  <option value="last">2주차</option>
                  <option value="before">1주차</option>
                </select>
              </div>
            </div>

            {/* 주간 상태별 출석 현황 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-6">
                {currentData.label} 출석 현황 (명 단위)
              </h3>
              
              {/* 범례 */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-300 rounded"></div>
                  <span>출근</span>
                  </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                  <span>지각</span>
              </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-300 rounded"></div>
                  <span>정상퇴근</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-orange-300 rounded"></div>
                  <span>조기퇴근</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-300 rounded"></div>
                  <span>휴가</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-300 rounded"></div>
                  <span>결근</span>
                </div>
              </div>
              
              <StackedBarChart data={currentData.stackData} />
            </div>
          </div>
        )}

        {/* 상세 탭 */}
        {selectedTab === 'details' && (
          <div className="space-y-4 sm:space-y-6">
            {/* 주차 선택 */}
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4">
              <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    학생별 출석 현황
                  </h3>
                </div>
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value)}
                    className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 sm:px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="current">3주차 (1월 15일 ~ 1월 19일)</option>
                    <option value="last">2주차 (1월 8일 ~ 1월 12일)</option>
                    <option value="before">1주차 (1월 1일 ~ 1월 5일)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 학생별 상세 현황 */}
            <StudentAttendanceGrid students={currentData.studentData} />
          </div>
        )}
      </div>
    </div>
  )
} 
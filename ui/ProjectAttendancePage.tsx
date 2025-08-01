import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, Users, Clock, Calendar, Settings, Bell, UserPlus, BarChart3, TrendingUp, User,
  Download, Filter, Plane, Eye, Award, Target, Zap, Star, Activity, PieChart, LineChart,
  AlertCircle, CheckCircle, Save, X
} from 'lucide-react'

// 원형 진행률 컴포넌트
const CircularProgress = ({ percentage, size = 80, strokeWidth = 8, color = "#059669" }: {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
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
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}

const GroupAttendancePage = () => {
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
  const [selectedStatsTab, setSelectedStatsTab] = useState<'overview' | 'trends' | 'details'>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedWeek, setSelectedWeek] = useState('current')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showDayDetail, setShowDayDetail] = useState(false)

  // 출퇴근 설정 관련 state
  const [settings, setSettings] = useState({
    checkin_deadline_hour: 10,
    checkout_start_hour: 18
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // StatsPage.tsx에서 가져온 데이터
  const statsWeeklyData = {
    current: {
      label: '3주차',
      dateRange: '1월 15일 ~ 1월 19일',
      stackData: [
        { day: '월요일', 출근: 24, 지각: 3, 결근: 2, 기타: 2 },
        { day: '화요일', 출근: 22, 지각: 4, 결근: 2, 기타: 3 },
        { day: '수요일', 출근: 26, 지각: 2, 결근: 1, 기타: 2 },
        { day: '목요일', 출근: 23, 지각: 4, 결근: 2, 기타: 2 },
        { day: '금요일', 출근: 25, 지각: 3, 결근: 1, 기타: 2 }
      ],
      dayDetails: {
        '월요일': [
          { name: '김학생', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이영희', dept: '전자과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '박철수', dept: '기계과', checkin: '09:45', checkout: '18:00', note: '교통체증으로 지각' },
          { name: '최민수', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '정수연', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '서영진', dept: '기계과', checkin: '09:00', checkout: '18:00', note: '' },
          { name: '황기철', dept: '컴공과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '김민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '이철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '알람을 못들어서 지각' },
          { name: '박영희', dept: '기계과', checkin: '09:30', checkout: '18:00', note: '버스 지연으로 지각' },
          { name: '최수연', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '정기철', dept: '전자과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '서학생', dept: '기계과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '황민수', dept: '컴공과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '김철수', dept: '전자과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '이영희2', dept: '기계과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '박수연', dept: '컴공과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '최기철', dept: '전자과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '정학생', dept: '기계과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '서민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '황철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지하철 지연으로 지각' },
          { name: '김영희2', dept: '기계과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이수연', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '박기철', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '최학생', dept: '기계과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '정민수', dept: '컴공과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '서철수', dept: '전자과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '황영희2', dept: '기계과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '김수연', dept: '컴공과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '이기철', dept: '전자과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '박학생', dept: '기계과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '최민수2', dept: '컴공과', checkin: '', checkout: '', note: '개인사정으로 결근' },
          { name: '정철수2', dept: '전자과', checkin: '09:15', checkout: '17:00', note: '병원진료로 조기퇴근' },
          { name: '서영희3', dept: '기계과', checkin: '', checkout: '', note: '연차휴가 사용' },
          { name: '황수연2', dept: '컴공과', checkin: '09:15', checkout: '17:30', note: '개인사정으로 조기퇴근' }
        ],
        '화요일': [
          { name: '김학생', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이영희', dept: '전자과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '박철수', dept: '기계과', checkin: '09:45', checkout: '18:00', note: '교통체증으로 지각' },
          { name: '최민수', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '정수연', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '서영진', dept: '기계과', checkin: '09:00', checkout: '18:00', note: '' },
          { name: '황기철', dept: '컴공과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '김민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '이철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '알람을 못들어서 지각' },
          { name: '박영희', dept: '기계과', checkin: '09:30', checkout: '18:00', note: '버스 지연으로 지각' },
          { name: '최수연', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '정기철', dept: '전자과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '서학생', dept: '기계과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '황민수', dept: '컴공과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '김철수', dept: '전자과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '이영희2', dept: '기계과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '박수연', dept: '컴공과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '최기철', dept: '전자과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '정학생', dept: '기계과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '서민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '황철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지하철 지연으로 지각' },
          { name: '김영희2', dept: '기계과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이수연', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '박기철', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '최학생', dept: '기계과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '정민수', dept: '컴공과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '서철수', dept: '전자과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '황영희2', dept: '기계과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '김수연', dept: '컴공과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '이기철', dept: '전자과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '박학생', dept: '기계과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '최민수2', dept: '컴공과', checkin: '', checkout: '', note: '개인사정으로 결근' },
          { name: '정철수2', dept: '전자과', checkin: '', checkout: '', note: '병원진료로 결근' },
          { name: '서영희3', dept: '기계과', checkin: '09:15', checkout: '16:30', note: '개인사정으로 조기퇴근' },
          { name: '황수연2', dept: '컴공과', checkin: '', checkout: '', note: '연차휴가 사용' },
          { name: '김기철2', dept: '전자과', checkin: '09:15', checkout: '17:00', note: '병원진료로 조기퇴근' }
        ]
      },
      studentData: [
        { name: '김학생', id: '2024001', dept: '컴공과', attendance: ['출근', '출근', '출근', '지각', '출근'], rate: '100%' },
        { name: '이영희', id: '2024002', dept: '전자과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '박철수', id: '2024003', dept: '기계과', attendance: ['지각', '출근', '출근', '출근', '지각'], rate: '100%' },
        { name: '최민수', id: '2024004', dept: '컴공과', attendance: ['출근', '출근', '출근', '결근', '출근'], rate: '80%' },
        { name: '정수연', id: '2024005', dept: '전자과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '서영진', id: '2024006', dept: '기계과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' },
        { name: '황기철', id: '2024007', dept: '컴공과', attendance: ['출근', '출근', '출근', '출근', '출근'], rate: '100%' }
      ]
    },
    last: {
      label: '2주차',
      dateRange: '1월 8일 ~ 1월 12일',
      stackData: [
        { day: '월요일', 출근: 21, 지각: 4, 결근: 3, 기타: 3 },
        { day: '화요일', 출근: 23, 지각: 2, 결근: 1, 기타: 5 },
        { day: '수요일', 출근: 20, 지각: 6, 결근: 2, 기타: 3 },
        { day: '목요일', 출근: 25, 지각: 1, 결근: 0, 기타: 5 },
        { day: '금요일', 출근: 22, 지각: 3, 결근: 1, 기타: 5 }
      ],
      dayDetails: {
        '월요일': [
          { name: '김학생', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이영희', dept: '전자과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '박철수', dept: '기계과', checkin: '09:45', checkout: '18:00', note: '지각' },
          { name: '최민수', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '정수연', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '서영진', dept: '기계과', checkin: '09:00', checkout: '18:00', note: '' },
          { name: '황기철', dept: '컴공과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '김민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '이철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지각' },
          { name: '박영희', dept: '기계과', checkin: '09:30', checkout: '18:00', note: '지각' },
          { name: '최수연', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '정기철', dept: '전자과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '서학생', dept: '기계과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '황민수', dept: '컴공과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '김철수', dept: '전자과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '이영희2', dept: '기계과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '박수연', dept: '컴공과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '최기철', dept: '전자과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '정학생', dept: '기계과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '서민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '황철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지각' },
          { name: '김영희2', dept: '기계과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이수연', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '박기철', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '최학생', dept: '기계과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '정민수', dept: '컴공과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '서철수', dept: '전자과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '황영희2', dept: '기계과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '김수연', dept: '컴공과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '이기철', dept: '전자과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '박학생', dept: '기계과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '최민수2', dept: '컴공과', checkin: '', checkout: '', note: '결근' },
          { name: '정철수2', dept: '전자과', checkin: '', checkout: '', note: '결근' },
          { name: '서영희3', dept: '기계과', checkin: '09:15', checkout: '16:30', note: '조기퇴근 - 개인사정' },
          { name: '황수연2', dept: '컴공과', checkin: '', checkout: '', note: '휴가' },
          { name: '김기철2', dept: '전자과', checkin: '09:15', checkout: '17:00', note: '조기퇴근 - 병원' }
        ]
      },
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
        { day: '월요일', 출근: 26, 지각: 2, 결근: 1, 기타: 2 },
        { day: '화요일', 출근: 22, 지각: 4, 결근: 2, 기타: 3 },
        { day: '수요일', 출근: 25, 지각: 1, 결근: 0, 기타: 5 },
        { day: '목요일', 출근: 24, 지각: 3, 결근: 1, 기타: 3 },
        { day: '금요일', 출근: 21, 지각: 5, 결근: 2, 기타: 3 }
      ],
      dayDetails: {
        '월요일': [
          { name: '김학생', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이영희', dept: '전자과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '박철수', dept: '기계과', checkin: '09:45', checkout: '18:00', note: '지각' },
          { name: '최민수', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '정수연', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '서영진', dept: '기계과', checkin: '09:00', checkout: '18:00', note: '' },
          { name: '황기철', dept: '컴공과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '김민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '이철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지각' },
          { name: '박영희', dept: '기계과', checkin: '09:30', checkout: '18:00', note: '지각' },
          { name: '최수연', dept: '컴공과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '정기철', dept: '전자과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '서학생', dept: '기계과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '황민수', dept: '컴공과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '김철수', dept: '전자과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '이영희2', dept: '기계과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '박수연', dept: '컴공과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '최기철', dept: '전자과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '정학생', dept: '기계과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '서민수', dept: '컴공과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '황철수', dept: '전자과', checkin: '09:25', checkout: '18:00', note: '지각' },
          { name: '김영희2', dept: '기계과', checkin: '09:15', checkout: '18:00', note: '' },
          { name: '이수연', dept: '컴공과', checkin: '09:10', checkout: '18:00', note: '' },
          { name: '박기철', dept: '전자과', checkin: '09:05', checkout: '18:00', note: '' },
          { name: '최학생', dept: '기계과', checkin: '09:20', checkout: '18:00', note: '' },
          { name: '정민수', dept: '컴공과', checkin: '09:18', checkout: '18:00', note: '' },
          { name: '서철수', dept: '전자과', checkin: '09:22', checkout: '18:00', note: '' },
          { name: '황영희2', dept: '기계과', checkin: '09:14', checkout: '18:00', note: '' },
          { name: '김수연', dept: '컴공과', checkin: '09:16', checkout: '18:00', note: '' },
          { name: '이기철', dept: '전자과', checkin: '09:12', checkout: '18:00', note: '' },
          { name: '박학생', dept: '기계과', checkin: '09:08', checkout: '18:00', note: '' },
          { name: '최민수2', dept: '컴공과', checkin: '', checkout: '', note: '결근' },
          { name: '정철수2', dept: '전자과', checkin: '09:15', checkout: '17:00', note: '조기퇴근 - 병원' },
          { name: '서영희3', dept: '기계과', checkin: '', checkout: '', note: '휴가' },
          { name: '황수연2', dept: '컴공과', checkin: '09:15', checkout: '17:30', note: '조기퇴근 - 약속' }
        ]
      },
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

  // 그룹화된 차트 데이터 (신호등 방식)
  const groupedStats = [
    {
      title: '출근 현황',
      icon: <User className="w-5 h-5" />,
      data: [
        { name: '출근', value: 25, count: 25, color: '#16a34a' },
        { name: '지각', value: 3, count: 3, color: '#facc15' }
      ],
      total: 28
    },
    {
      title: '결근',
      icon: <User className="w-5 h-5" />,
      data: [
        { name: '결근', value: 100, count: 2, color: '#dc2626' }
      ],
      total: 2
    },
    {
      title: '기타',
      icon: <Plane className="w-5 h-5" />,
      data: [
        { name: '기타', value: 100, count: 1, color: '#9333ea' }
      ],
      total: 1
    }
  ]

  // 오늘 출석 현황 데이터
  const [todayStats] = useState({
    present: 23,
    late: 3,
    absent: 0,
    vacation: 2,
    attendanceRate: 92.9,
    totalStudents: currentGroup.memberCount
  })

  // 실시간 활동 데이터
  const [realtimeActivities] = useState([
    { time: '09:15', name: '김학생', action: '출근', type: 'checkin', dept: '개발팀' },
    { time: '09:20', name: '이영희', action: '출근', type: 'checkin', dept: 'UI팀' },
    { time: '09:25', name: '박철수', action: '지각', type: 'late', dept: '개발팀' },
    { time: '18:00', name: '정수연', action: '퇴근', type: 'checkout', dept: 'UI팀' },
    { time: '08:30', name: '최민수', action: '휴가 신청', type: 'vacation', dept: '개발팀' }
  ])

  // 주간 출석 추이 데이터
  const [weeklyData] = useState([
    { day: '월', present: 22, late: 4, absent: 2 },
    { day: '화', present: 25, late: 2, absent: 1 },
    { day: '수', present: 23, late: 3, absent: 2 },
    { day: '목', present: 26, late: 1, absent: 1 },
    { day: '금', present: 24, late: 3, absent: 1 }
  ])

  const currentData = statsWeeklyData[selectedWeek as keyof typeof statsWeeklyData]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'checkin': return '🟢'
      case 'checkout': return '🔵'
      case 'late': return '🟡'
      case 'vacation': return '🟣'
      default: return '⚪'
    }
  }

  // StatsPage.tsx에서 가져온 차트 컴포넌트들
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
    const maxTotal = Math.max(...data.map(d => d.출근 + d.지각 + d.결근 + d.기타))
    
    return (
      <div className="flex justify-center items-end space-x-4 h-80">
        {data.map((day, index) => {
          const total = day.출근 + day.지각 + day.결근 + day.기타
          const barHeight = 250 // 최대 높이
          
          // 각 섹션의 높이 계산
          const heights = {
            출근: (day.출근 / maxTotal) * barHeight,
            지각: (day.지각 / maxTotal) * barHeight,
            결근: (day.결근 / maxTotal) * barHeight,
            기타: (day.기타 / maxTotal) * barHeight
          }
          
          return (
            <div key={index} className="flex flex-col items-center space-y-2">
              <div className="text-sm text-gray-500">총 {total}명</div>
              
              <button
                onClick={() => {
                  setSelectedDay(day.day)
                  setShowDayDetail(true)
                }}
                className="relative w-16 bg-transparent rounded-lg overflow-hidden flex flex-col justify-end hover:shadow-lg transition-shadow cursor-pointer"
                style={{ height: `${barHeight}px` }}
              >
                {/* 결근 (맨 위) */}
                <div 
                  className="w-full bg-red-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.결근}px` }}
                >
                  {day.결근 > 0 && heights.결근 > 20 && day.결근}
                </div>
                
                {/* 기타 */}
                <div 
                  className="w-full bg-purple-300 flex items-center justify-center text-xs font-medium text-gray-700 transition-all duration-300"
                  style={{ height: `${heights.기타}px` }}
                >
                  {day.기타 > 0 && heights.기타 > 20 && day.기타}
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
              </button>
              
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
        case '결근': return 'bg-red-500'
        case '기타': return 'bg-purple-500'
        default: return 'bg-gray-300'
      }
    }

    const getStatusEmoji = (status: string) => {
      switch (status) {
        case '출근': return '✓'
        case '지각': return '!'
        case '결근': return '✗'
        case '기타': return 'V'
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
                          {status === '출근' ? '✓' : status === '지각' ? '!' : status === '결근' ? '✗' : status === '기타' ? 'V' : '?'}
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

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 오늘 현황 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘 현황</h2>
        
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">출석</p>
                <p className="text-2xl font-bold text-green-600">{todayStats.present}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">지각</p>
                <p className="text-2xl font-bold text-yellow-600">{todayStats.late}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">결근</p>
                <p className="text-2xl font-bold text-red-600">{todayStats.absent}</p>
              </div>
              <Users className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">휴가</p>
                <p className="text-2xl font-bold text-purple-600">{todayStats.vacation}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* 출석률 및 진행 바 */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <CircularProgress percentage={todayStats.attendanceRate} />
            <div>
              <p className="text-sm text-gray-600">전체 출석률</p>
              <p className="text-xl font-bold text-gray-900">{todayStats.attendanceRate}%</p>
              <p className="text-sm text-gray-500">
                {todayStats.present + todayStats.late}/{todayStats.totalStudents}명 출석
              </p>
            </div>
          </div>
          
          <div className="flex-1 ml-8">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(todayStats.present + todayStats.late) / todayStats.totalStudents * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              실시간 출석률: {Math.round((todayStats.present + todayStats.late) / todayStats.totalStudents * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* 실시간 활동 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">실시간 활동</h2>
        <div className="space-y-3">
          {realtimeActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <div>
                  <p className="font-medium text-gray-900">{activity.name}</p>
                  <p className="text-sm text-gray-600">{activity.dept}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 주간 추이 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">주간 출석 추이</h2>
        <div className="flex items-end justify-between h-40 space-x-4">
          {weeklyData.map((day, index) => (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full max-w-12 space-y-1">
                <div 
                  className="w-full bg-green-500 rounded-t"
                  style={{ height: `${(day.present / 30) * 120}px` }}
                ></div>
                <div 
                  className="w-full bg-yellow-500"
                  style={{ height: `${(day.late / 30) * 120}px` }}
                ></div>
                <div 
                  className="w-full bg-red-500 rounded-b"
                  style={{ height: `${(day.absent / 30) * 120}px` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 mt-2">{day.day}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>출석</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded"></div>
            <span>지각</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>결근</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStats = () => (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex min-w-0">
          <button
            onClick={() => setSelectedStatsTab('overview')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <PieChart className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">전체 현황</span>
          </button>
          <button
            onClick={() => setSelectedStatsTab('trends')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'trends'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">주간 추이</span>
          </button>
          <button
            onClick={() => setSelectedStatsTab('details')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">학생별 상세</span>
          </button>
        </div>
      </div>

      {/* 현황 탭 */}
      {selectedStatsTab === 'overview' && (
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
      {selectedStatsTab === 'trends' && (
        <div className="space-y-6">
          {/* 죰차 선택 */}
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
                <option value="current">3주차 (1월 15일 ~ 1월 19일)</option>
                <option value="last">2주차 (1월 8일 ~ 1월 12일)</option>
                <option value="before">1주차 (1월 1일 ~ 1월 5일)</option>
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
                <div className="w-4 h-4 bg-red-300 rounded"></div>
                <span>결근</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-300 rounded"></div>
                <span>기타</span>
              </div>
            </div>
            
            <StackedBarChart data={currentData.stackData} />
          </div>
        </div>
      )}

      {/* 상세 탭 */}
      {selectedStatsTab === 'details' && (
        <div className="space-y-4 sm:space-y-6">
          {/* 죰차 선택 */}
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
  )

  const renderMembers = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">구성원 관리</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <UserPlus className="w-4 h-4" />
          <span>구성원 추가</span>
        </button>
      </div>
      <p className="text-gray-600">구성원 관리 기능이 여기에 표시됩니다.</p>
    </div>
  )

  const handleTimeChange = (field: 'checkin_deadline_hour' | 'checkout_start_hour', value: string) => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0 || numValue > 23) return

    setSettings(prev => ({
      ...prev,
      [field]: numValue
    }))
    
    setErrors([])
    setSuccessMessage('')
  }

  const validateSettings = () => {
    const newErrors: string[] = []
    
    if (settings.checkin_deadline_hour >= settings.checkout_start_hour) {
      newErrors.push('출근 마감 시간은 퇴근 시작 시간보다 빨라야 합니다.')
    }
    
    if (settings.checkin_deadline_hour < 6 || settings.checkin_deadline_hour > 12) {
      newErrors.push('출근 마감 시간은 06:00~12:00 사이여야 합니다.')
    }
    
    if (settings.checkout_start_hour < 14 || settings.checkout_start_hour > 22) {
      newErrors.push('퇴근 시작 시간은 14:00~22:00 사이여야 합니다.')
    }
    
    return newErrors
  }

  const handleSave = async () => {
    setIsLoading(true)
    setErrors([])
    setSuccessMessage('')

    const validationErrors = validateSettings()
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setIsLoading(false)
      return
    }

    // 저장 시뮬레이션
    setTimeout(() => {
      setSuccessMessage('출퇴근 시간 설정이 저장되었습니다.')
      setIsLoading(false)
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    }, 1000)
  }

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const renderSettings = () => (
    <div className="space-y-6">
      {/* 안내 카드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 flex-1">
            <h3 className="font-semibold mb-3">출퇴근 시간 설정 안내</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">출근 마감 시간 전까지는 <strong>'출근'</strong>으로 처리됩니다</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">출근 마감 시간 이후는 <strong>'지각'</strong>으로 처리됩니다</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">퇴근 시작 시간 이후로는 <strong>'퇴근'</strong>으로 처리됩니다</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <span className="font-semibold">설정 오류</span>
          </div>
          <ul className="text-sm space-y-2 ml-8">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="leading-relaxed break-words">{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 설정 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-blue-600" />
          근무 시간 설정
        </h2>

        <div className="space-y-8">
          {/* 출근 마감 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              출근 마감 시간
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <select
                value={settings.checkin_deadline_hour}
                onChange={(e) => handleTimeChange('checkin_deadline_hour', e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-green-50 px-4 py-3 rounded-xl min-w-0">
                <span className="text-green-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                  {formatHour(settings.checkin_deadline_hour)} 전까지는 정상 출근으로 처리됩니다
                </span>
              </div>
            </div>
          </div>

          {/* 퇴근 시작 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              퇴근 시작 시간
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <select
                value={settings.checkout_start_hour}
                onChange={(e) => handleTimeChange('checkout_start_hour', e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-blue-50 px-4 py-3 rounded-xl min-w-0">
                <span className="text-blue-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                  {formatHour(settings.checkout_start_hour)} 이후로는 퇴근으로 처리됩니다
                </span>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                저장 중...
              </>
            ) : (
              <>
                <Save size={20} />
                설정 저장
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // 일별 상세 모달 컴포넌트
  const DayDetailModal = () => {
    if (!showDayDetail || !selectedDay) return null
    
    const currentData = statsWeeklyData[selectedWeek as keyof typeof statsWeeklyData]
    const dayDetails = currentData.dayDetails?.[selectedDay] || []
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {selectedDay} 상세 정보
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentData.dateRange}
              </p>
            </div>
            <button
              onClick={() => setShowDayDetail(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 테이블 */}
          <div className="overflow-auto max-h-[calc(90vh-120px)]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    소속
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    퇴근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비고
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dayDetails.map((person, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.dept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.checkin || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.checkout || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {person.note ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          person.note.includes('지각') ? 'bg-yellow-100 text-yellow-800' :
                          person.note.includes('결근') ? 'bg-red-100 text-red-800' :
                          person.note.includes('휴가') ? 'bg-purple-100 text-purple-800' :
                          person.note.includes('조기퇴근') ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {person.note}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 푸터 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>총 {dayDetails.length}명</span>
              <button
                onClick={() => setShowDayDetail(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/group-management')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{currentGroup.name}</h1>
                <p className="text-xs sm:text-sm text-gray-600">{currentGroup.memberCount}명의 구성원</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setSelectedTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setSelectedTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              구성원
            </button>
            <button
              onClick={() => setSelectedTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              설정
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {selectedTab === 'dashboard' && renderDashboard()}
        {selectedTab === 'stats' && renderStats()}
        {selectedTab === 'members' && renderMembers()}
        {selectedTab === 'settings' && renderSettings()}
      </div>

      {/* 일별 상세 모달 */}
      <DayDetailModal />
    </div>
  )
}

export default GroupAttendancePage 
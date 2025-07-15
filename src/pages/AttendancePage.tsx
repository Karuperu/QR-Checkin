import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { 
  Camera, Clock, Calendar, Filter, Download, User as UserIcon, Users, 
  ArrowLeft, LogOut, TrendingUp, AlertCircle, CheckCircle, Edit3, Save, X, Trash2,
  UserCheck, UserX, BarChart3, Plane, Settings, QrCode, Bell, XCircle
} from 'lucide-react'
import jsQR from 'jsqr'
import { 
  getCurrentUser, logoutUser, saveAttendanceRecord,
  updateAttendanceRecord, deleteAttendanceRecord, refreshUserSession, canEditAttendance,
  getTodayAttendanceStatus, getWeeklyAttendanceStats, getDailyAttendanceStats,
  setStudentAttendanceStatus, getAttendanceStatusLabel, getAttendanceStatusColor,
  getPendingVacationRequestsCount, getVacationRequests,
  formatLocalTime, formatLocalDate, formatLocalDateTime, formatLocalDateRange, getTodayLocal,
  getLocalTime, loadWorkTimeSettings, determineAttendanceType,
  type User, type AttendanceStatus, validateQRLocation, getLocationNameByCoords, getAttendanceStatusByDate,
  type VacationRequest
} from '../lib/supabase'
import { supabase } from '../lib/supabase'
import { Line } from 'react-chartjs-2'
import { Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js'
Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend)

interface AttendanceRecord {
  id: string
  user_id: string
  scan_time: string
  scan_type: AttendanceStatus
  location: string | null
  absence_reason: string | null
  server_time: string
  is_edited: boolean
  edited_by: string | null
  edited_at: string | null
  created_at: string
  latitude?: number | null
  longitude?: number | null
  users: {
    user_id: string
    name: string
    department: string
    role: string
  }
}

interface EditingRecord {
  id: string
  scan_time: string
  scan_type: AttendanceStatus
  location: string
  absence_reason: string
}

interface QRSessionData {
  type: 'attendance_session'
  session_token: string
  location: string
  expires_at: string
}



interface ScanResult {
  success: boolean
  scanType?: AttendanceStatus
  user?: {
    name: string
    role: string
    user_id: string
    department: string
    id?: string
    is_active?: boolean
  }
  error?: string
  location?: string
}

// 통계 관련 인터페이스들
interface TodayAttendance {
  checkin: (User & { checkinTime?: string })[]
  checkout: (User & { checkinTime?: string, checkoutTime?: string })[]
  late: (User & { checkinTime?: string })[]
  early_leave: (User & { checkinTime?: string, checkoutTime?: string })[]
  absent: User[]
  vacation: (User & { vacationStartDate?: string, vacationEndDate?: string })[]
  totalStudents: number
  checkinCount: number
  checkoutCount: number
  lateCount: number
  earlyLeaveCount: number
  absentCount: number
  vacationCount: number
}

interface WeeklyStats {
  date: string
  status: AttendanceStatus | null
  checkinTime: string | null
  checkoutTime: string | null
  student: {
    name: string
    user_id: string
    department: string
  }
}

interface DailyStats {
  [date: string]: {
    checkin: number
    checkout: number
    absent: number
    vacation: number
    total: number
  }
}

interface EditingStudent {
  studentId: string
  currentStatus: AttendanceStatus
}

// 상세 팝업용 타입
interface StudentDetail {
  name: string
  user_id: string
  department: string
  checkinTime?: string
  checkoutTime?: string
  isLate?: boolean
  latitude?: number | null
  longitude?: number | null
  scanType?: AttendanceStatus
  location?: string | null
}

declare global {
  interface Window {
    kakao: any
  }
}

// 팝업 내 지도 + 역지오코딩 주소 표시
function StudentLocationMap({ latitude, longitude, onAddress }: { latitude?: number | null, longitude?: number | null, onAddress?: (addr: string) => void }) {
  const mapId = 'kakao-map-popup-container'
  useEffect(() => {
    if (!latitude || !longitude) return
    const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY || 'f81af0e933045defa1569ad7f5917046'
    function loadKakaoScript(): Promise<void> {
      return new Promise((resolve) => {
        if (window.kakao && window.kakao.maps) {
          resolve()
          return
        }
        let script = document.getElementById('kakao-map-script-popup') as HTMLScriptElement | null
        if (!script) {
          script = document.createElement('script')
          script.id = 'kakao-map-script-popup'
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`
          script.onload = () => {
            window.kakao.maps.load(() => resolve())
          }
          document.body.appendChild(script)
        } else {
          script.onload = () => {
            window.kakao.maps.load(() => resolve())
          }
        }
      })
    }
    async function renderMapAndAddress() {
      await loadKakaoScript()
      setTimeout(() => {
        const container = document.getElementById(mapId)
        if (container && window.kakao && window.kakao.maps) {
          container.innerHTML = ''
          const map = new window.kakao.maps.Map(container, {
            center: new window.kakao.maps.LatLng(latitude, longitude),
            level: 4
          })
          new window.kakao.maps.Marker({
            map,
            position: new window.kakao.maps.LatLng(latitude, longitude)
          })
          // 역지오코딩
          if (window.kakao.maps.services && onAddress) {
            const geocoder = new window.kakao.maps.services.Geocoder()
            geocoder.coord2Address(longitude, latitude, (result: any, status: any) => {
              if (status === window.kakao.maps.services.Status.OK && result && result.length > 0) {
                const addr = result[0].road_address?.address_name || result[0].address?.address_name || ''
                onAddress(addr)
              }
            })
          }
        }
      }, 0)
    }
    renderMapAndAddress()
    return () => {
      const container = document.getElementById(mapId)
      if (container) container.innerHTML = ''
    }
  }, [latitude, longitude, onAddress])
  return <div id={mapId} style={{ width: '100%', height: 280, borderRadius: 12, marginTop: 12, marginLeft: 0, marginRight: 0, boxShadow: '0 2px 8px #0001', boxSizing: 'border-box' }} />
}

// 학생 상세정보 팝업(지도+역지오코딩 주소 포함) 컴포넌트로 분리
function StudentDetailModal({ student, onClose }: { student: StudentDetail, onClose: () => void }) {
  const [address, setAddress] = useState('')
  const [facilityName, setFacilityName] = useState<string | undefined>(undefined)

  useEffect(() => {
    async function fetchFacilityName() {
      if (student.latitude && student.longitude) {
        const name = await getLocationNameByCoords(student.latitude, student.longitude)
        setFacilityName(name)
      }
    }
    fetchFacilityName()
  }, [student.latitude, student.longitude])

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose}>X</button>
        <h2 className="text-xl font-bold mb-4">학생 상세정보</h2>
        <div className="space-y-2 text-sm">
          <div><b>이름:</b> {student.name}</div>
          <div><b>학번:</b> {student.user_id}</div>
          <div><b>학과:</b> {student.department}</div>
          <div><b>출근시간:</b> {student.checkinTime ? formatLocalDateTime(student.checkinTime) : '-'}</div>
          <div><b>퇴근시간:</b> {student.checkoutTime ? formatLocalDateTime(student.checkoutTime) : '-'}</div>
          <div><b>지각여부:</b> <span className={student.isLate ? 'text-red-500' : ''}>{student.isLate ? '지각' : '-'}</span></div>
          <div><b>스캔 위치:</b> {facilityName ? facilityName : (address ? address : (student.latitude && student.longitude ? `${student.latitude}, ${student.longitude}` : '-'))}</div>
          {student.latitude && student.longitude && (
            <StudentLocationMap latitude={student.latitude} longitude={student.longitude} onAddress={setAddress} />
          )}
        </div>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState(getTodayLocal())
  const [selectedRole, setSelectedRole] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [editingRecord, setEditingRecord] = useState<EditingRecord | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  
  // QR 스캔 관련 상태
  function getInitialTab() {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab === 'records') return 'records'
    if (tab === 'stats') return 'stats'
    return 'scan'
  }
  const [activeTab, setActiveTab] = useState<'scan' | 'records' | 'stats'>(getInitialTab())
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [scanError, setScanError] = useState<string>('')
  
  // 통계 관련 state
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats>({})
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  const [editingStudent, setEditingStudent] = useState<EditingStudent | null>(null)
  const [selectedStatsTab, setSelectedStatsTab] = useState<'today' | 'weekly' | 'daily'>('today')
  const [pendingVacationCount, setPendingVacationCount] = useState(0)
  const [editingAbsenceReason, setEditingAbsenceReason] = useState<string | null>(null)
  const [absenceReasonInput, setAbsenceReasonInput] = useState('')

  // 출근/퇴근 선택 모달 상태 추가
  const [pendingScan, setPendingScan] = useState<{ location: string, latitude?: number, longitude?: number } | null>(null)
  const [selectScanTypeOpen, setSelectScanTypeOpen] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanningIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [showDailyDetail, setShowDailyDetail] = useState(false)
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null)
  const [selectedDailyDetail, setSelectedDailyDetail] = useState<TodayAttendance | null>(null)

  // useState 추가
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([])

  // 카메라 시작
  const startCamera = async () => {
    if (isScanning) return
    
    try {
      setIsScanning(true)
      setScanError('')
      setScanResult(null)

      // 기존 스트림이 있다면 정리
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }

      // 카메라 스트림 요청
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // 후면 카메라 우선
          width: { ideal: 300 },
          height: { ideal: 300 }
        }
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        
        // QR 코드 스캔 시작
        startQRScanning()
      }

    } catch (error) {
      console.error('카메라 시작 오류:', error)
      setScanError('카메라에 접근할 수 없습니다. 권한을 확인해주세요.')
      setIsScanning(false)
    }
  }

  // QR 코드 스캔 시작
  const startQRScanning = () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current)
    }

    scanningIntervalRef.current = setInterval(() => {
      scanQRCode()
    }, 100) // 100ms마다 스캔
  }

  // QR 코드 스캔 중지
  const stopQRScanning = () => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current)
      scanningIntervalRef.current = null
    }
  }

  // QR 코드 스캔 실행
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context || video.readyState !== video.HAVE_ENOUGH_DATA) return

    // 캔버스 크기를 비디오에 맞춤
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // 비디오 프레임을 캔버스에 그리기
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // 이미지 데이터 가져오기
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

    // QR 코드 인식
    const code = jsQR(imageData.data, imageData.width, imageData.height)

    if (code) {
      // QR 코드 발견!
      stopCamera()
      processQRCode(code.data)
    }
  }

  // 카메라 중지
  const stopCamera = () => {
    stopQRScanning()
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsScanning(false)
  }



  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopQRScanning()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  // 탭 변경 시 카메라 정리
  useEffect(() => {
    if (activeTab !== 'scan' && isScanning) {
      stopCamera()
    }
  }, [activeTab])

  useEffect(() => {
    const initializeUser = async () => {
      const user = getCurrentUser()
      if (!user) {
        navigate('/')
        return
      }

      // 로그인 시 날짜를 한국 표준시 기준 오늘로 설정
      const now = new Date()
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC + 9시간
      const todayFormatted = koreaTime.toISOString().split('T')[0]
      
      console.log('한국시간 기준 오늘 날짜:', todayFormatted)
      setSelectedDate(todayFormatted)

      // 사용자 세션을 새로 고침하여 최신 정보 가져오기
      const refreshedUser = await refreshUserSession()
      if (refreshedUser) {
        setCurrentUser(refreshedUser)
        console.log('사용자 세션 새로 고침 완료:', refreshedUser)
      } else {
        setCurrentUser(user)
      }
      
      loadUsers()
    }

    initializeUser()
  }, [navigate])

  useEffect(() => {
    if (currentUser && activeTab === 'records') {
      loadAttendanceRecords()
    }
    if (currentUser && activeTab === 'stats' && currentUser.role === 'faculty') {
      loadAllStats()
    }
  }, [currentUser, selectedDate, selectedRole, selectedUser, activeTab])

  useEffect(() => {
    filterRecords()
  }, [attendanceRecords, selectedRole, selectedUser, selectedLocation])

  const loadUsers = async () => {
    if (!currentUser) return

    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('name')

      // 권한별 사용자 목록 제한
      if (currentUser.role === 'student') {
        // 학생은 자신만 조회
        query = query.eq('id', currentUser.id)
      } else if (currentUser.role === 'faculty') {
        // 교직원은 학생들과 자신만 조회
        query = query.in('role', ['student', 'faculty'])
      }

      const { data, error } = await query

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('사용자 목록 로드 오류:', err)
    }
  }



  const loadAttendanceRecords = async () => {
    if (!currentUser) return

    setIsLoading(true)
    setError('')
    
    try {
      console.log('=== 출퇴근 기록 로드 시작 ===')
      console.log('현재 사용자:', currentUser)
      console.log('선택된 날짜:', selectedDate)
      
      // 1단계: attendance_logs 테이블에서 모든 데이터 조회
      console.log('1단계: attendance_logs 조회 중...')
      const { data: attendanceLogs, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .order('scan_time', { ascending: false })

      if (attendanceError) {
        console.error('attendance_logs 조회 오류:', attendanceError)
        throw attendanceError
      }

      console.log('attendance_logs 조회 결과:', attendanceLogs)
      console.log('총 기록 수:', attendanceLogs?.length || 0)

      // 2단계: users 테이블에서 모든 사용자 정보 조회
      console.log('2단계: users 조회 중...')
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')

      if (usersError) {
        console.error('users 조회 오류:', usersError)
        throw usersError
      }

      console.log('users 조회 결과:', users)
      console.log('총 사용자 수:', users?.length || 0)

      // 3단계: 데이터가 없는 경우 처리
      if (!attendanceLogs || attendanceLogs.length === 0) {
        console.log('출퇴근 기록이 없습니다.')
        setAttendanceRecords([])
        setIsLoading(false)
        return
      }

      if (!users || users.length === 0) {
        console.log('사용자 정보가 없습니다.')
        setAttendanceRecords([])
        setIsLoading(false)
        return
      }

      // 4단계: 사용자 정보를 ID로 매핑
      console.log('3단계: 사용자 정보 매핑 중...')
      const userMap = new Map()
      users.forEach(user => {
        userMap.set(user.id, user)
      })
      console.log('사용자 매핑 완료:', userMap)

      // 5단계: attendance_logs와 users 조인
      console.log('4단계: 데이터 조인 중...')
      const joinedData = attendanceLogs.map(log => {
        const user = userMap.get(log.user_id)
        return {
          id: log.id,
          user_id: log.user_id,
          scan_time: log.scan_time,
          scan_type: log.scan_type,
          location: log.location,
          absence_reason: log.absence_reason || null,
          server_time: log.server_time || log.created_at,
          is_edited: log.is_edited || false,
          edited_by: log.edited_by,
          edited_at: log.edited_at,
          created_at: log.created_at,
          latitude: log.latitude ?? null,
          longitude: log.longitude ?? null,
          users: user ? {
            user_id: user.user_id,
            name: user.name,
            department: user.department,
            role: user.role
          } : {
            user_id: 'unknown',
            name: '알 수 없음',
            department: '알 수 없음',
            role: 'unknown'
          }
        }
      })

      console.log('조인된 데이터:', joinedData)

      // 6단계: 날짜 필터링 (선택된 날짜가 있는 경우)
      let filteredData = joinedData
      if (selectedDate) {
        console.log('5단계: 날짜 필터링 중...', selectedDate)
        
        // 한국 표준시(KST) 기준으로 날짜 처리
        const targetDate = new Date(selectedDate + 'T00:00:00+09:00') // KST 시작
        const nextDate = new Date(selectedDate + 'T23:59:59+09:00')   // KST 끝
        
        console.log('한국시간 기준 필터링:', {
          selectedDate,
          targetDateKST: targetDate.toLocaleString('ko-KR'),
          nextDateKST: nextDate.toLocaleString('ko-KR'),
          targetDateUTC: targetDate.toISOString(),
          nextDateUTC: nextDate.toISOString()
        })

        filteredData = joinedData.filter(record => {
          const recordDate = new Date(record.scan_time)
          console.log('기록 시간:', {
            scan_time: record.scan_time,
            recordDateKST: recordDate.toLocaleString('ko-KR'),
            recordDateUTC: recordDate.toISOString(),
            isInRange: recordDate >= targetDate && recordDate <= nextDate
          })
          return recordDate >= targetDate && recordDate <= nextDate
        })
        console.log('날짜 필터링 후:', filteredData)
      }

      // 7단계: 권한별 필터링
      console.log('6단계: 권한별 필터링 중...')
      if (currentUser.role === 'student') {
        // 학생은 자신의 기록만
        filteredData = filteredData.filter(record => record.user_id === currentUser.id)
        console.log('학생 권한 필터링 후:', filteredData)
      } else if (currentUser.role === 'faculty') {
        // 교직원은 학생과 교직원 기록만
        filteredData = filteredData.filter(record => 
          record.users.role === 'student' || record.users.role === 'faculty'
        )
        console.log('교직원 권한 필터링 후:', filteredData)
      }
      // 관리자나 기타 권한은 모든 기록 조회

      // 8단계: 추가 필터링 (역할, 사용자, 위치)
      console.log('7단계: 추가 필터링 중...')
      
      // 역할 필터
      if (selectedRole !== 'all' && currentUser.role !== 'student') {
        filteredData = filteredData.filter(record => record.users.role === selectedRole)
        console.log('역할 필터링 후:', filteredData)
      }

      // 사용자 필터
      if (selectedUser !== 'all' && currentUser.role !== 'student') {
        filteredData = filteredData.filter(record => record.user_id === selectedUser)
        console.log('사용자 필터링 후:', filteredData)
      }

      // 위치 필터
      if (selectedLocation !== 'all') {
        filteredData = filteredData.filter(record => record.location === selectedLocation)
        console.log('위치 필터링 후:', filteredData)
      }

      console.log('=== 최종 결과 ===')
      console.log('최종 데이터:', filteredData)
      console.log('최종 기록 수:', filteredData.length)

      setAttendanceRecords(filteredData)
      setAllAttendanceRecords(joinedData)
      
    } catch (err) {
      console.error('출퇴근 기록 로드 오류:', err)
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const filterRecords = () => {
    let filtered = attendanceRecords

    // 날짜 필터
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate)
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.scan_time)
        return recordDate.toDateString() === selectedDateObj.toDateString()
      })
    }

    // 역할 필터
    if (selectedRole !== 'all') {
      filtered = filtered.filter(record => record.users?.role === selectedRole)
    }

    // 사용자 필터
    if (selectedUser !== 'all') {
      filtered = filtered.filter(record => record.user_id === selectedUser)
    }

    // 위치 필터
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(record => record.location === selectedLocation)
    }

    setFilteredRecords(filtered)
  }

  const canEditRecords = () => {
    return canEditAttendance(currentUser)
  }

  const canEditAbsenceReason = (record: AttendanceRecord) => {
    if (!currentUser) return false
    
    // 교직원은 모든 기록의 결석 사유를 수정할 수 있음
    if (canEditAttendance(currentUser)) {
      return true
    }
    
    // 학생은 자신의 결석 기록만 사유를 입력할 수 있음
    if (currentUser.role === 'student' && record.user_id === currentUser.id && record.scan_type === 'absent') {
      return true
    }
    
    return false
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'student':
        return '학생'
      case 'faculty':
        return '교직원'
      default:
        return role
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <UserIcon className="w-4 h-4 text-blue-600" />
      case 'faculty':
        return <Users className="w-4 h-4 text-green-600" />
      default:
        return <UserIcon className="w-4 h-4 text-gray-600" />
    }
  }

  // const getUserIdLabel = (role: string) => {
  //   switch (role) {
  //     case 'student':
  //       return '학번'
  //     case 'faculty':
  //       return '교원번호'
  //     default:
  //       return 'ID'
  //   }
  // }

  const getScanTypeBadge = (scanType: string) => {
    const getBadgeStyle = () => {
      switch (scanType) {
        case 'checkin':
          return 'bg-green-100 text-green-800'
        case 'checkout':
          return 'bg-orange-100 text-orange-800'
        case 'absent':
          return 'bg-red-100 text-red-800'
        case 'vacation':
          return 'bg-blue-100 text-blue-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    const getLabel = () => {
      switch (scanType) {
        case 'checkin':
          return '출근'
        case 'checkout':
          return '퇴근'
        case 'absent':
          return '결근'
        case 'vacation':
          return '휴가'
        default:
          return scanType
      }
    }

    return (
      <span className={`px-2 py-1 text-xs rounded-full ${getBadgeStyle()}`}>
        {getLabel()}
      </span>
    )
  }

  const handleEditRecord = (record: AttendanceRecord) => {
    // 저장된 시간을 로컬 시간대로 해석하여 편집용 형식으로 변환
    const recordDate = new Date(record.scan_time)
    
    // 로컬 시간대 기준으로 YYYY-MM-DDTHH:mm 형식 생성
    const year = recordDate.getFullYear()
    const month = String(recordDate.getMonth() + 1).padStart(2, '0')
    const day = String(recordDate.getDate()).padStart(2, '0')
    const hours = String(recordDate.getHours()).padStart(2, '0')
    const minutes = String(recordDate.getMinutes()).padStart(2, '0')
    
    const localTimeString = `${year}-${month}-${day}T${hours}:${minutes}`
    
    console.log('편집 시간 설정:', {
      원본_DB시간: record.scan_time,
      Date객체: recordDate.toString(),
      로컬시간_표시: recordDate.toLocaleString('ko-KR'),
      편집용_문자열: localTimeString
    })
    
    setEditingRecord({
      id: record.id,
      scan_time: localTimeString,
      scan_type: record.scan_type,
      location: record.location || '',
      absence_reason: record.absence_reason || ''
    })
  }

  const handleSaveEdit = async () => {
    if (!editingRecord || !currentUser) return

    try {
      console.log('수정 저장 시도:', {
        입력된_KST_시간: editingRecord.scan_time,
        scan_type: editingRecord.scan_type
      })
      
      await updateAttendanceRecord(
        editingRecord.id,
        {
          scan_time: editingRecord.scan_time, // KST 기준 시간 전달
          scan_type: editingRecord.scan_type,
          location: editingRecord.location,
          absence_reason: editingRecord.absence_reason
        },
        currentUser
      )

      setEditingRecord(null)
      await loadAttendanceRecords()
      
      // 교직원인 경우 통계도 새로고침
      if (currentUser.role === 'faculty') {
        await loadAllStats()
      }
    } catch (err) {
      console.error('수정 저장 오류:', err)
      setError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.')
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    if (!currentUser) return

    // 삭제 확인
    const confirmDelete = window.confirm('이 출퇴근 기록을 삭제하시겠습니까?\n삭제된 기록은 복구할 수 없습니다.')
    if (!confirmDelete) return

    try {
      await deleteAttendanceRecord(recordId, currentUser)
      await loadAttendanceRecords()
      
      // 교직원인 경우 통계도 새로고침
      if (currentUser.role === 'faculty') {
        await loadAllStats()
      }
    } catch (err) {
      console.error('기록 삭제 오류:', err)
      setError(err instanceof Error ? err.message : '기록 삭제 중 오류가 발생했습니다.')
    }
  }

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const headers = ['날짜', '시간', '이름', '구분', '아이디', '소속', '상태', '위치', '위도', '경도', '수정여부']
    const rows = filteredRecords.map(record => {
      // 저장된 시간을 그대로 사용
      const scanTime = new Date(record.scan_time)
      const user = record.users
      
      return [
        scanTime.toLocaleDateString('ko-KR'),
        scanTime.toLocaleTimeString('ko-KR'),
        user?.name || '알 수 없음',
        getRoleLabel(user?.role || ''),
        user?.user_id || '알 수 없음',
        user?.department || '알 수 없음',
        record.scan_type === 'checkin' ? '출근' : 
        record.scan_type === 'checkout' ? '퇴근' :
        record.scan_type === 'absent' ? '결근' :
        record.scan_type === 'vacation' ? '휴가' : record.scan_type,
        record.location || '알 수 없음',
        record.latitude ?? '-',
        record.longitude ?? '-',
        record.is_edited ? '수정됨' : '원본'
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `출퇴근기록_${selectedDate}.csv`
    link.click()
  }

  const handleEditAbsenceReason = (record: AttendanceRecord) => {
    setEditingAbsenceReason(record.id)
    setAbsenceReasonInput(record.absence_reason || '')
  }

  const handleSaveAbsenceReason = async (recordId: string) => {
    if (!currentUser) return

    try {
      await updateAttendanceRecord(
        recordId,
        {
          absence_reason: absenceReasonInput.trim() || undefined
        },
        currentUser
      )

      setEditingAbsenceReason(null)
      setAbsenceReasonInput('')
      await loadAttendanceRecords()
      
      // 교직원인 경우 통계도 새로고침
      if (currentUser.role === 'faculty') {
        await loadAllStats()
      }
    } catch (err) {
      console.error('결석 사유 저장 오류:', err)
      setError(err instanceof Error ? err.message : '결석 사유 저장 중 오류가 발생했습니다.')
    }
  }

  const handleCancelAbsenceReason = () => {
    setEditingAbsenceReason(null)
    setAbsenceReasonInput('')
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  // QR 스캔 관련 함수들
  const processQRCode = async (qrText: string) => {
    try {
      let qrData: any
      try {
        qrData = JSON.parse(qrText)
      } catch {
        qrData = qrText
      }
      if (qrData && typeof qrData === 'object' && qrData.type === 'attendance_session') {
        // handleSessionScan에서 자동 저장 대신 모달 오픈
        setPendingScan({ location: qrData.location })
        setSelectScanTypeOpen(true)
        return
      }
      if (typeof qrData === 'string' && qrData.length > 0) {
        const result = await validateQRLocation(qrData)
        if (!result.isValid) {
          setScanError('등록되지 않은 장소입니다.')
          return
        }
        setPendingScan({ location: qrData })
        setSelectScanTypeOpen(true)
        return
      }
      setScanError('지원하지 않는 QR 코드 형식입니다.')
    } catch (error) {
      setScanError('QR 코드를 해석할 수 없습니다.')
    }
  }

  // 출근/퇴근 선택 후 저장 함수
  const handleSaveScan = async (scanType: 'checkin' | 'checkout') => {
    if (!currentUser || !pendingScan) return
    setSelectScanTypeOpen(false)
    setIsLoading(true)
    console.log('[handleSaveScan] 시작', { scanType, pendingScan })
    let latitude: number | undefined = undefined
    let longitude: number | undefined = undefined
    try {
      // 위치 권한 요청
      const pos = await new Promise<{ latitude: number; longitude: number }>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('이 브라우저에서는 위치 정보가 지원되지 않습니다.'))
        } else {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              resolve({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude
              })
            },
            (err) => {
              reject(new Error('위치 정보를 가져올 수 없습니다. 위치 권한을 허용해 주세요.'))
            },
            { enableHighAccuracy: true, timeout: 10000 }
          )
        }
      })
      latitude = pos.latitude
      longitude = pos.longitude
      console.log('[handleSaveScan] 위치 권한 OK', { latitude, longitude })
    } catch (geoErr) {
      setScanError(geoErr instanceof Error ? geoErr.message : '위치 정보를 가져올 수 없습니다.')
      setIsLoading(false)
      setPendingScan(null)
      setSelectScanTypeOpen(false)
      console.error('[handleSaveScan] 위치 권한 오류', geoErr)
      return
    }
    try {
      // 출퇴근 기록 저장
      console.log('[handleSaveScan] saveAttendanceRecord 호출')
      const success = await saveAttendanceRecord(
        currentUser.id,
        scanType,
        pendingScan.location,
        latitude,
        longitude
      )
      console.log('[handleSaveScan] saveAttendanceRecord 결과', success)
      setIsLoading(false)
      setPendingScan(null)
      if (success) {
        setScanResult({
          success: true,
          scanType,
          user: {
            name: currentUser.name,
            role: currentUser.role,
            user_id: currentUser.user_id,
            department: currentUser.department,
            id: currentUser.id
          },
          location: pendingScan.location
        })
        try {
          console.log('[handleSaveScan] loadAttendanceRecords 호출')
          await loadAttendanceRecords()
          console.log('[handleSaveScan] loadAttendanceRecords 완료')
        } catch (loadErr) {
          console.error('[handleSaveScan] loadAttendanceRecords 오류', loadErr)
        }
      } else {
        setScanError('출퇴근 기록 저장에 실패했습니다.')
      }
    } catch (err) {
      setScanError('알 수 없는 오류가 발생했습니다.')
      console.error('[handleSaveScan] 예외', err)
    } finally {
      setIsLoading(false)
      setPendingScan(null)
      setSelectScanTypeOpen(false)
      console.log('[handleSaveScan] finally 종료')
    }
  }

  // 통계 데이터 로드 함수들
  const loadAllStats = async () => {
    if (!currentUser || currentUser.role !== 'faculty') return

    try {
      setIsLoading(true)
      const [todayData, weeklyData, dailyData, vacationCount] = await Promise.all([
        getTodayAttendanceStatus(),
        getWeeklyAttendanceStats(),
        getDailyAttendanceStats(30),
        getPendingVacationRequestsCount()
      ])

      setTodayAttendance(todayData)
      setWeeklyStats(weeklyData)
      setDailyStats(dailyData)
      setPendingVacationCount(vacationCount)
    } catch (err) {
      console.error('통계 데이터 로드 오류:', err)
      setError('통계 데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getDepartments = () => {
    if (!todayAttendance) return []
    const allStudents = [
      ...todayAttendance.checkin,
      ...todayAttendance.checkout,
      ...todayAttendance.absent,
      ...todayAttendance.vacation
    ]
    const departments = Array.from(new Set(allStudents.map(s => s.department)))
    return departments.sort()
  }

  const filterStudentsByDepartment = (students: User[]) => {
    if (selectedDepartment === 'all') return students
    return students.filter(s => s.department === selectedDepartment)
  }

  const handleStatusChange = async (studentId: string, newStatus: AttendanceStatus) => {
    if (!currentUser) return

    try {
      const today = new Date().toISOString().split('T')[0]
      const success = await setStudentAttendanceStatus(studentId, newStatus, today, currentUser)
      
      if (success) {
        setEditingStudent(null)
        setSelectedStudent(null) // 저장 후 상세보기 모달 닫기
        await loadAllStats() // 통계 새로고침
        console.log(`학생 ${studentId}의 상태를 ${newStatus}로 변경했습니다.`)
      } else {
        setError(`상태 변경에 실패했습니다. 다시 시도해주세요.`)
        console.error('상태 변경 실패 - setStudentAttendanceStatus returned false')
      }
    } catch (err) {
      console.error('상태 변경 오류:', err)
      setError(`상태 변경 중 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
    }
  }

    const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return formatLocalTime(timeString)
  }

  const formatDate = (dateString: string) => {
    return formatLocalDate(dateString)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    return formatLocalDateRange(startDate, endDate)
  }

  const renderStudentCard = (student: User & { checkinTime?: string, checkoutTime?: string, vacationStartDate?: string, vacationEndDate?: string }, status: AttendanceStatus) => {
    // 오늘 해당 학생의 출결 기록 중 가장 최근 1건
    const todayRecords = attendanceRecords
      .filter(r => r.users.user_id === student.user_id)
      .sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime())
    const latest = todayRecords[0]
    return (
      <div
        key={student.id}
        className="flex items-center justify-between bg-white p-3 rounded-lg cursor-pointer hover:bg-gray-100"
        onClick={() => latest && handleStudentRowClick(latest)}
      >
        <div className="flex-1">
          <p className="font-medium text-gray-900">{student.name}</p>
          <p className="text-sm text-gray-600">{student.user_id} • {student.department}</p>
          
          {/* 출퇴근 시간 및 휴가 기간 표시 */}
          {status === 'checkin' && student.checkinTime && (
            <p className="text-xs text-green-600 mt-1">
              출근시간: {formatTime(student.checkinTime)}
            </p>
          )}
          
          {status === 'checkout' && (
            <div className="text-xs mt-1 flex gap-4">
              {student.checkinTime && (
                <span className="text-green-600">출근시간: {formatTime(student.checkinTime)}</span>
              )}
              {student.checkoutTime && (
                <span className="text-blue-600">퇴근시간: {formatTime(student.checkoutTime)}</span>
              )}
            </div>
          )}
          
          {status === 'vacation' && student.vacationStartDate && student.vacationEndDate && (
            <p className="text-xs text-yellow-600 mt-1">
              휴가기간: {formatDateRange(student.vacationStartDate, student.vacationEndDate)}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {editingStudent?.studentId === student.id ? (
            <div className="flex items-center space-x-2">
              <select
                value={editingStudent.currentStatus}
                onChange={(e) => setEditingStudent({
                  ...editingStudent,
                  currentStatus: e.target.value as AttendanceStatus
                })}
                className="text-sm border rounded px-2 py-1 min-w-[90px]"
              >
                <option value="checkin">출근</option>
                <option value="late">지각</option>
                <option value="checkout">퇴근</option>
                <option value="absent">결근</option>
                <option value="vacation">휴가</option>
              </select>
              <button
                onClick={e => { e.stopPropagation(); handleStatusChange(student.id, editingStudent.currentStatus) }}
                className="text-green-600 hover:text-green-800"
                title="저장"
              >
                <Save className="w-4 h-4" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditingStudent(null); setSelectedStudent(null); }}
                className="text-red-600 hover:text-red-800"
                title="취소"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 text-xs rounded-full ${getAttendanceStatusColor(status)}`}>
                {getAttendanceStatusLabel(status)}
              </span>
              {currentUser?.role === 'faculty' && (
                <button
                  onClick={e => { e.stopPropagation(); setEditingStudent({studentId: student.id, currentStatus: status}) }}
                  className="text-blue-600 hover:text-blue-800"
                  title="상태 변경"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const exportStatsToCSV = () => {
    if (selectedStatsTab === 'today' && todayAttendance) {
      const csvData = [
        ['이름', '학번', '학과', '상태', '출근시간', '퇴근시간', '휴가기간'],
        ...todayAttendance.checkin.map(student => [
          student.name,
          student.user_id,
          student.department,
          '출근',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          '',
          ''
        ]),
        ...todayAttendance.checkout.map(student => [
          student.name,
          student.user_id,
          student.department,
          '퇴근',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          student.checkoutTime ? formatTime(student.checkoutTime) : '',
          ''
        ]),
        ...todayAttendance.absent.map(student => [
          student.name,
          student.user_id,
          student.department,
          '결근',
          '',
          '',
          ''
        ]),
        ...todayAttendance.vacation.map(student => [
          student.name,
          student.user_id,
          student.department,
          '휴가',
          '',
          '',
          student.vacationStartDate && student.vacationEndDate ? 
            formatDateRange(student.vacationStartDate, student.vacationEndDate) : ''
        ])
      ]
      
      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `출석현황_${getTodayLocal()}.csv`
      link.click()
    } else if (selectedStatsTab === 'weekly') {
      const csvData = [
        ['날짜', '이름', '학번', '학과', '상태', '출근시간', '퇴근시간'],
        ...weeklyStats.map(stat => [
          stat.date,
          stat.student.name,
          stat.student.user_id,
          stat.student.department,
          stat.status ? getAttendanceStatusLabel(stat.status) : '-',
          formatTime(stat.checkinTime),
          formatTime(stat.checkoutTime)
        ])
      ]
      
      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `주간출퇴근통계_${getTodayLocal()}.csv`
      link.click()
    }
  }

  // 학생 row 클릭 핸들러
  const handleStudentRowClick = async (record: AttendanceRecord) => {
    if (editingRecord) return

    let checkinTime: string | undefined = undefined
    let checkoutTime: string | undefined = undefined
    let isLate = false

    if (record.scan_type === 'checkout' && record.user_id) {
      // 퇴근 기록 바로 직전의 출근/지각 기록 찾기
      const prevCheckin = attendanceRecords
        .filter(r => r.user_id === record.user_id && (r.scan_type === 'checkin' || r.scan_type === 'late') && new Date(r.scan_time) < new Date(record.scan_time))
        .sort((a, b) => new Date(b.scan_time).getTime() - new Date(a.scan_time).getTime())[0]
      if (prevCheckin) {
        checkinTime = prevCheckin.scan_time
        isLate = prevCheckin.scan_type === 'late' || new Date(prevCheckin.scan_time).getHours() >= 10
      } else {
        // 출근 기록이 없으면 오류 알림
        alert('이 퇴근 기록 이전에 출근 기록이 없습니다. 출근 없이 퇴근이 기록되었습니다.');
        return;
      }
      checkoutTime = record.scan_time
    } else if (record.scan_type === 'checkin' || record.scan_type === 'late') {
      checkinTime = record.scan_time
      isLate = record.scan_type === 'late' || new Date(record.scan_time).getHours() >= 10
    }

    setSelectedStudent({
      name: record.users.name,
      user_id: record.users.user_id,
      department: record.users.department,
      checkinTime,
      checkoutTime,
      isLate,
      latitude: record.latitude,
      longitude: record.longitude
    })
  }

  // 일별 통계 카드 클릭 핸들러
  const handleDailyCardClick = async (date: string) => {
    setSelectedDailyDate(date)
    setShowDailyDetail(true)
    setSelectedDailyDetail(null)
    const detail = await getAttendanceStatusByDate(date)
    setSelectedDailyDetail(detail)
  }

  // --- pendingVacationCount 주기적 갱신 ---
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (currentUser && currentUser.role === 'faculty') {
      const fetchPending = async () => {
        try {
          const count = await getPendingVacationRequestsCount();
          setPendingVacationCount(count);
        } catch {}
      };
      fetchPending();
      interval = setInterval(fetchPending, 10000); // 10초마다 갱신
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentUser]);

  // --- 학생 휴가 승인/거절 알림 상태 ---
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [unreadAlerts, setUnreadAlerts] = useState<VacationRequest[]>([])
  const [studentVacationRequests, setStudentVacationRequests] = useState<VacationRequest[]>([])

  // 학생 알림 데이터 로드
  useEffect(() => {
    const fetchStudentVacation = async () => {
      if (currentUser && currentUser.role === 'student') {
        const reqs = await getVacationRequests(currentUser)
        setStudentVacationRequests(reqs)
        const seenIds = JSON.parse(localStorage.getItem('vacation_alert_seen') || '[]')
        const alerts = reqs.filter(r =>
          (r.status === 'approved' || r.status === 'rejected') &&
          !seenIds.includes(r.id)
        )
        setUnreadAlerts(alerts)
      }
    }
    fetchStudentVacation()
  }, [currentUser])

  const handleAlertClick = () => {
    setShowAlertModal(true)
    // 알림 확인 처리
    if (unreadAlerts.length > 0) {
      const seenIds = JSON.parse(localStorage.getItem('vacation_alert_seen') || '[]')
      const newIds = [...seenIds, ...unreadAlerts.map(a => a.id)]
      localStorage.setItem('vacation_alert_seen', JSON.stringify(newIds))
      setUnreadAlerts([])
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // 한국시간 기준 오늘 날짜를 반환하는 함수
  function getKoreaTodayDate() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const koreaTime = new Date(utc + (9 * 60 * 60 * 1000));
    return new Date(koreaTime.getFullYear(), koreaTime.getMonth(), koreaTime.getDate());
  }

  // 주간 통계 x축 라벨 동적 생성 함수
  function getWeeklyLabels() {
    const endDate = getKoreaTodayDate();
    const labels = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - i);
      labels.push(`${d.getDate()}일`);
    }
    return labels;
  }

  // 주간 통계 차트 데이터(출근+퇴근 인원 합) 동적 생성 함수
  function getWeeklyAttendanceCounts() {
    const labels = getWeeklyLabels();
    // 날짜별(YYYY-MM-DD)로 출근/퇴근 인원 합산
    const dateMap: { [key: string]: { checkin: number; checkout: number } } = {};
    weeklyStats.forEach(stat => {
      const date = new Date(stat.date);
      const label = `${date.getDate()}일`;
      if (!dateMap[label]) dateMap[label] = { checkin: 0, checkout: 0 };
      if (stat.status === 'checkin' || stat.status === 'late') dateMap[label].checkin += 1;
      if (stat.status === 'checkout') dateMap[label].checkout += 1;
    });
    // 라벨 순서대로 출근+퇴근 합계 배열 생성
    return labels.map(label => (dateMap[label]?.checkin || 0) + (dateMap[label]?.checkout || 0));
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-7xl">
        <div className="flex justify-end items-center mb-8">
          <div className="flex items-center gap-4">
            {/* 출퇴근 시간 설정 링크 (교직원만) */}
            {currentUser.role === 'faculty' && (
              <>
                <Link
                  to="/work-time-settings"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                  title="출퇴근 시간 설정"
                >
                  <Settings size={20} />
                </Link>
                <Link
                  to="/qr_generator"
                  className="text-gray-700 hover:text-blue-600 transition-colors"
                  title="QR 코드 관리"
                >
                  <QrCode size={22} />
                </Link>
                <Link 
                  to="/vacation" 
                  className="text-gray-700 hover:text-yellow-600 transition-colors relative"
                  title="휴가 신청 관리"
                >
                  <Plane size={20} />
                  {currentUser.role === 'faculty' && pendingVacationCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                      {pendingVacationCount}
                    </span>
                  )}
                </Link>
              </>
            )}
            {/* 학생 계정: 휴가 승인/거절 알림 종 아이콘 */}
            {currentUser.role === 'student' && (
              <button
                className="relative text-gray-700 hover:text-purple-600"
                title="휴가신청 처리 알림"
                onClick={handleAlertClick}
              >
              <Bell size={20} />
                {unreadAlerts.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadAlerts.length}
                  </span>
                )}
              </button>
            )}
            {currentUser.role === 'student' && (
              <Link
                to="/vacation"
                className="text-gray-700 hover:text-yellow-600 transition-colors"
                title="휴가 신청"
              >
                <Plane size={20} />
              </Link>
            )}
            
            <div className="flex items-center gap-2 text-black">
              {getRoleIcon(currentUser.role)}
              <span className="font-medium">{currentUser.name}</span>
              <span className="text-sm opacity-80">({getRoleLabel(currentUser.role)})</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="text-center mb-8">
          <Clock className="w-16 h-16 text-black mx-auto mb-4" />
          <h1 className="text-4xl font-light text-black mb-2">출퇴근 관리</h1>
          <p className="text-gray-900">출퇴근 기록을 확인하고 QR 코드를 스캔하세요</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* 탭 메뉴 */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              {currentUser?.role !== 'faculty' && (
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'scan'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Camera className="inline w-4 h-4 mr-2" />
                  QR 스캔
                </button>
              )}
              <button
                onClick={() => setActiveTab('records')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'records'
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="inline w-4 h-4 mr-2" />
                출퇴근 기록
              </button>
              {currentUser?.role === 'faculty' && (
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'stats'
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TrendingUp className="inline w-4 h-4 mr-2" />
                  통계
                </button>
              )}
            </nav>
          </div>

          <div className="p-8">
            {/* 출퇴근 기록 탭 */}
            {activeTab === 'records' && (
              <div>
                {/* 필터 및 제어 */}
                <div className={`grid grid-cols-1 gap-4 mb-6 ${
                  currentUser.role === 'student' ? 'md:grid-cols-1' : 'md:grid-cols-4'
                }`}>
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline w-4 h-4 mr-1" />
                      날짜 선택
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  
                  {currentUser.role !== 'student' && (
                    <>
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                          <Filter className="inline w-4 h-4 mr-1" />
                          구분 필터
                        </label>
                        <select
                          id="role"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                          className="input-field"
                        >
                          <option value="all">전체</option>
                          <option value="student">학생</option>
                          {currentUser.role === 'faculty' && <option value="faculty">교직원</option>}
                        </select>
                      </div>
                      
                      <div>
                        <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                          사용자 필터
                        </label>
                        <select
                          id="user"
                          value={selectedUser}
                          onChange={(e) => setSelectedUser(e.target.value)}
                          className="input-field"
                        >
                          <option value="all">전체 사용자</option>
                          {users
                            .filter(user => selectedRole === 'all' || user.role === selectedRole)
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.name} ({user.user_id})
                              </option>
                            ))
                          }
                        </select>
                      </div>

                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                          <Filter className="inline w-4 h-4 mr-1" />
                          위치 필터
                        </label>
                        <select
                          id="location"
                          value={selectedLocation}
                          onChange={(e) => setSelectedLocation(e.target.value)}
                          className="input-field"
                        >
                          <option value="all">전체 위치</option>
                          <option value="손봉기 교수님 연구실">손봉기 교수님 연구실</option>
                          <option value="MBC사무실">MBC 사무실</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {currentUser.role !== 'student' && (
                    <div className="flex items-end">
                      <button
                        onClick={exportToCSV}
                        disabled={filteredRecords.length === 0}
                        className="btn-secondary inline-flex items-center gap-2 w-full"
                      >
                        <Download size={20} />
                        CSV 내보내기
                      </button>
                    </div>
                  )}
                </div>

                {/* 통계 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-900">총 기록</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{filteredRecords.length}건</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-green-600 rounded-full"></div>
                      <h3 className="font-semibold text-green-900">출근 기록</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredRecords.filter(r => r.scan_type === 'checkin').length}건
                    </p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 bg-orange-600 rounded-full"></div>
                      <h3 className="font-semibold text-orange-900">퇴근 기록</h3>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {filteredRecords.filter(r => r.scan_type === 'checkout').length}건
                    </p>
                  </div>
                </div>

                {/* 출퇴근 기록 테이블 */}
                <div className="overflow-x-auto">
                  <h2 className="text-xl font-semibold mb-4">
                    출퇴근 기록 ({selectedDate})
                    {selectedRole !== 'all' && ` - ${getRoleLabel(selectedRole)}`}
                    {selectedUser !== 'all' && selectedRole === 'all' && ` - ${users.find(u => u.id === selectedUser)?.name || '알 수 없음'}`}
                    {selectedLocation !== 'all' && ` - ${selectedLocation}`}
                  </h2>
                  
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-600">데이터를 불러오는 중...</p>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                      {error}
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      선택한 조건에 맞는 출퇴근 기록이 없습니다.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full bg-white text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {currentUser.role !== 'student' && (
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              사용자
                            </th>
                          )}
                          {currentUser.role !== 'student' && canEditRecords() && (
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              구분
                            </th>
                          )}
                          {currentUser.role !== 'student' && (
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              소속
                            </th>
                          )}
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            시간
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            위치
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            결석 사유
                          </th>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수정상태
                          </th>
                          {canEditRecords() && (
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              작업
                            </th>
                          )}
                          <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">위도</th>
                          <th className="px-2 py-2 text-xs font-medium text-gray-500 uppercase">경도</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-gray-50" onClick={e => {
                            // select, option 클릭 시 팝업 오픈 방지
                            if (
                              e.target instanceof HTMLElement &&
                              (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION' || e.target.closest('select'))
                            ) {
                              return
                            }
                            handleStudentRowClick(record)
                          }}>
                            {currentUser.role !== 'student' && (
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {getRoleIcon(record.users?.role || '')}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {record.users?.name || '알 수 없음'}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {record.users?.user_id || '알 수 없음'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            )}
                            {currentUser.role !== 'student' && canEditRecords() && (
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {getRoleLabel(record.users?.role || '')}
                                </span>
                              </td>
                            )}
                            {currentUser.role !== 'student' && (
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className="text-sm text-gray-900">
                                  {record.users?.department || '알 수 없음'}
                                </span>
                              </td>
                            )}
                            <td className="px-2 py-2 whitespace-nowrap">
                              {editingRecord?.id === record.id ? (
                                <select
                                  value={editingRecord.scan_type}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    scan_type: e.target.value as AttendanceStatus
                                  })}
                                  onClick={e => e.stopPropagation()}
                                  className="text-sm border rounded px-1 py-1 w-full min-w-[90px]"
                                >
                                  <option value="checkin">출근</option>
                                  <option value="checkout">퇴근</option>
                                  <option value="absent">결근</option>
                                  <option value="vacation">휴가</option>
                                </select>
                              ) : (
                                getScanTypeBadge(record.scan_type)
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {editingRecord?.id === record.id ? (
                                <input
                                  type="datetime-local"
                                  value={editingRecord.scan_time}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    scan_time: e.target.value
                                  })}
                                  className="text-sm border rounded px-1 py-1 w-full"
                                />
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {formatLocalDateTime(record.scan_time)}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {editingRecord?.id === record.id ? (
                                <select
                                  value={editingRecord.location}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    location: e.target.value
                                  })}
                                  onClick={e => e.stopPropagation()}
                                  className="text-sm border rounded px-1 py-1 w-full"
                                >
                                  <option value="">위치 선택</option>
                                  <option value="손봉기 교수님 연구실">손봉기 교수님 연구실</option>
                                  <option value="MBC사무실">MBC 사무실</option>
                                  <option value="휴가">휴가</option>
                                  <option value="재택근무">재택근무</option>
                                  <option value="기타">기타</option>
                                </select>
                              ) : (
                                <span className="text-sm text-gray-900">
                                  {record.location || '알 수 없음'}
                                </span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {editingRecord?.id === record.id ? (
                                <input
                                  type="text"
                                  value={editingRecord.absence_reason}
                                  onChange={(e) => setEditingRecord({
                                    ...editingRecord,
                                    absence_reason: e.target.value
                                  })}
                                  className="text-sm border rounded px-1 py-1 w-24"
                                  placeholder="결석 사유"
                                />
                              ) : editingAbsenceReason === record.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={absenceReasonInput}
                                    onChange={(e) => setAbsenceReasonInput(e.target.value)}
                                    className="text-sm border rounded px-1 py-1 w-20"
                                    placeholder="사유"
                                    autoFocus
                                  />
                                  <button
                                    onClick={e => { e.stopPropagation(); handleSaveAbsenceReason(record.id) }}
                                    className="text-green-600 hover:text-green-800"
                                    title="저장"
                                  >
                                    <Save size={12} />
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleCancelAbsenceReason() }}
                                    className="text-red-600 hover:text-red-800"
                                    title="취소"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-gray-900 flex-1 truncate max-w-20">
                                    {record.scan_type === 'absent' ? (record.absence_reason || '-') : '-'}
                                  </span>
                                  {canEditAbsenceReason(record) && record.scan_type === 'absent' && (
                                    <button
                                      onClick={e => { e.stopPropagation(); handleEditAbsenceReason(record) }}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="결석 사유 입력/수정"
                                    >
                                      <Edit3 size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap">
                              {record.is_edited ? (
                                <span className="px-1 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                                  수정
                                </span>
                              ) : (
                                <span className="px-1 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                  원본
                                </span>
                              )}
                            </td>
                            {canEditRecords() && (
                              <td className="px-2 py-2 whitespace-nowrap">
                                {editingRecord?.id === record.id ? (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={e => { e.stopPropagation(); handleSaveEdit() }}
                                      className="text-green-600 hover:text-green-800"
                                      title="저장"
                                    >
                                      <Save size={14} />
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); setEditingRecord(null) }}
                                      className="text-red-600 hover:text-red-800"
                                      title="취소"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={e => { e.stopPropagation(); handleEditRecord(record) }}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="수정"
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      onClick={e => { e.stopPropagation(); handleDeleteRecord(record.id) }}
                                      className="text-red-600 hover:text-red-800"
                                      title="삭제"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            )}
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">{record.latitude ?? '-'}</td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-gray-700">{record.longitude ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* QR 스캔 탭 */}
            {activeTab === 'scan' && currentUser?.role !== 'faculty' && (
              <div className="mt-4">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-2xl font-bold mb-4">QR 코드 스캔</h2>
                  <p className="mb-4">출퇴근 QR 코드를 스캔하여 기록하세요</p>
                  
                  {/* 스캔 제어 버튼 */}
                  <div className="flex justify-center gap-4 mb-6">
                    {!isScanning && !scanResult ? (
                      <button
                        onClick={startCamera}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Camera size={20} />
                        스캔 시작
                      </button>
                    ) : isScanning ? (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={stopCamera}
                          className="btn-secondary inline-flex items-center gap-2"
                        >
                          <X size={20} />
                          스캔 중지
                        </button>
                        <div className="flex items-center gap-2 text-blue-600">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm font-medium">스캔 중...</span>
                        </div>
                      </div>
                    ) : scanResult ? (
                      <button
                        onClick={() => {
                          setScanResult(null)
                          setScanError('')
                          startCamera()
                        }}
                        className="btn-primary inline-flex items-center gap-2"
                      >
                        <Camera size={20} />
                        새로 스캔하기
                      </button>
                    ) : null}
                  </div>
                  
                  {/* 카메라 화면 */}
                  <div className="relative">
                    <div className="w-full max-w-md mx-auto overflow-hidden rounded-lg border border-gray-200 min-h-[300px] bg-gray-50">
                      {isScanning ? (
                        <div className="relative">
                          <video
                            ref={videoRef}
                            className="w-full h-[300px] object-cover"
                            autoPlay
                            playsInline
                            muted
                          />
                          {/* QR 스캔용 숨겨진 캔버스 */}
                          <canvas
                            ref={canvasRef}
                            style={{ display: 'none' }}
                          />
                          {/* 스캔 가이드 */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg opacity-50"></div>
                          </div>
                          <div className="absolute top-2 left-2 right-2">
                            <div className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg text-sm text-center">
                              QR 코드를 가이드 안에 맞춰주세요
                            </div>
                          </div>

                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] p-8">
                          <Camera className="w-12 h-12 mb-4 text-gray-400" />
                          <p className="text-gray-600 text-center">
                            {scanResult ? '스캔이 완료되었습니다' : '위의 스캔 시작 버튼을 눌러\n카메라를 활성화하세요'}
                          </p>
                        </div>
                      )}
                    </div>
                    

                    
                    {scanError && !scanResult && (
                      <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          <span>{scanError}</span>
                        </div>
                      </div>
                    )}
                    
                    {scanResult && (
                      <div className="mt-6">
                        {scanResult.success ? (
                          <div className="p-4 bg-green-100 text-green-700 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="w-5 h-5" />
                              <span className="font-semibold">
                                {scanResult.scanType === 'checkin' ? '출근' : '퇴근'} 완료
                              </span>
                            </div>
                            {scanResult.user && (
                              <div className="text-sm space-y-2">
                                <div className="flex justify-between">
                                  <span>이름:</span>
                                  <span className="font-medium">{scanResult.user.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>부서:</span>
                                  <span className="font-medium">{scanResult.user.department}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>시간:</span>
                                  <span className="font-medium">{formatLocalDateTime(new Date())}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertCircle className="w-5 h-5" />
                              <span className="font-semibold">스캔 실패</span>
                            </div>
                            <p className="text-sm">{scanResult.error}</p>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
              </div>
            )}

            {/* 통계 탭 */}
            {activeTab === 'stats' && currentUser?.role === 'faculty' && (
              <div>
                {/* 상단 필터 및 내보내기 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Filter className="w-5 h-5 text-gray-500" />
                      <select
                        value={selectedDepartment}
                        onChange={(e) => setSelectedDepartment(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="all">전체 학과</option>
                        {getDepartments().map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <button
                    onClick={exportStatsToCSV}
                    className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                  >
                    <Download className="w-4 h-4" />
                    <span>내보내기</span>
                  </button>
                </div>

                {/* 통계 탭 네비게이션 */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setSelectedStatsTab('today')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        selectedStatsTab === 'today'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <UserCheck className="w-4 h-4" />
                        <span>오늘 현황</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setSelectedStatsTab('weekly')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        selectedStatsTab === 'weekly'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>주간 통계</span>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setSelectedStatsTab('daily')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        selectedStatsTab === 'daily'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>일별 통계</span>
                      </div>
                    </button>
                  </nav>
                </div>

                {/* 오늘 현황 */}
                {selectedStatsTab === 'today' && todayAttendance && (
                  <div>
                    {/* 요약 카드 */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                      <div className="bg-blue-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <Users className="w-8 h-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600">전체 학생</p>
                            <p className="text-2xl font-bold text-blue-900">{todayAttendance.totalStudents}명</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <UserCheck className="w-8 h-8 text-green-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-green-600">출근</p>
                            <p className="text-2xl font-bold text-green-900">{todayAttendance.checkinCount}명</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <Clock className="w-8 h-8 text-blue-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-blue-600">퇴근</p>
                            <p className="text-2xl font-bold text-blue-900">{todayAttendance.checkoutCount}명</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-red-50 rounded-lg p-6">
                        <div className="flex items-center">
                          <UserX className="w-8 h-8 text-red-600" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-red-600">결근</p>
                            <p className="text-2xl font-bold text-red-900">{todayAttendance.absentCount}명</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 상태별 학생 목록 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                          출근 학생 ({filterStudentsByDepartment(todayAttendance.checkin).length}명)
                        </h3>
                        <div className="bg-green-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {filterStudentsByDepartment(todayAttendance.checkin).length > 0 ? (
                            <div className="space-y-2">
                              {filterStudentsByDepartment(todayAttendance.checkin).map(student => 
                                renderStudentCard(student, 'checkin')
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">해당 조건의 출근 학생이 없습니다.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Clock className="w-5 h-5 text-blue-600 mr-2" />
                          퇴근 학생 ({filterStudentsByDepartment(todayAttendance.checkout).length}명)
                        </h3>
                        <div className="bg-blue-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {filterStudentsByDepartment(todayAttendance.checkout).length > 0 ? (
                            <div className="space-y-2">
                              {filterStudentsByDepartment(todayAttendance.checkout).map(student => 
                                renderStudentCard(student, 'checkout')
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">해당 조건의 퇴근 학생이 없습니다.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <UserX className="w-5 h-5 text-red-600 mr-2" />
                          결근 학생 ({filterStudentsByDepartment(todayAttendance.absent).length}명)
                        </h3>
                        <div className="bg-red-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {filterStudentsByDepartment(todayAttendance.absent).length > 0 ? (
                            <div className="space-y-2">
                              {filterStudentsByDepartment(todayAttendance.absent).map(student => 
                                renderStudentCard(student, 'absent')
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">해당 조건의 결근 학생이 없습니다.</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                          <Plane className="w-5 h-5 text-yellow-600 mr-2" />
                          휴가 학생 ({filterStudentsByDepartment(todayAttendance.vacation).length}명)
                        </h3>
                        <div className="bg-yellow-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                          {filterStudentsByDepartment(todayAttendance.vacation).length > 0 ? (
                            <div className="space-y-2">
                              {filterStudentsByDepartment(todayAttendance.vacation).map(student => 
                                renderStudentCard(student, 'vacation')
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-center py-4">해당 조건의 휴가 학생이 없습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 주간 통계 */}
                {selectedStatsTab === 'weekly' && (
                  <div>
                    {/* 주간 근무시간 차트 */}
                    <div className="w-full p-0 m-0 mb-8">
                      <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm text-gray-700">[총 {todayAttendance?.totalStudents ?? 0}명]</span>
                        {/* 날짜 범위 동적 계산 - 한국시간 기준 오늘 날짜로 고정 */}
                        {(() => {
                          const endDate = getKoreaTodayDate();
                          const startDate = new Date(endDate);
                          startDate.setDate(endDate.getDate() - 6);
                          return (
                            <span className="text-base text-gray-900 font-semibold">
                              {formatLocalDate(startDate)} ~ {formatLocalDate(endDate)}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="w-full p-0 m-0">
                        <Line
                          data={{
                            labels: getWeeklyLabels(),
                            datasets: [
                              {
                                label: '출근+퇴근 인원',
                                data: getWeeklyAttendanceCounts(),
                                borderColor: '#FFD600',
                                backgroundColor: '#FFD600',
                                pointBackgroundColor: '#FFD600',
                                pointBorderColor: '#FFD600',
                                tension: 0,
                                fill: false,
                                pointRadius: 4,
                                pointHoverRadius: 6,
                                borderWidth: 2,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                callbacks: {
                                  label: (ctx) => `근무시간: ${ctx.parsed.y}시간`
                                }
                              }
                            },
                            scales: {
                              x: {
                                grid: { display: true, color: '#eee' },
                                title: { display: false },
                                ticks: { font: { size: 14, weight: 'bold' }, color: '#222' }
                              },
                              y: {
                                min: 0,
                                max: todayAttendance?.totalStudents ?? 10, // 총 인원수로 동적 설정
                                ticks: { stepSize: 1, font: { size: 14, weight: 'bold' }, color: '#222' },
                                grid: { color: '#eee' },
                                title: { display: false }
                              }
                            }
                          }}
                          height={260}
                        />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">지난 7일간 출퇴근 기록</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학생</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학과</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출근시간</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">퇴근시간</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {weeklyStats
                            .filter(stat => selectedDepartment === 'all' || stat.student.department === selectedDepartment)
                            .map((stat, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {formatDate(stat.date)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {stat.student.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stat.student.user_id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {stat.student.department}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {stat.status ? (
                                  <span className={`px-2 py-1 text-xs rounded-full ${getAttendanceStatusColor(stat.status)}`}>
                                    {getAttendanceStatusLabel(stat.status)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 text-green-500 mr-2" />
                                  {formatTime(stat.checkinTime)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center">
                                  <Clock className="w-4 h-4 text-red-500 mr-2" />
                                  {formatTime(stat.checkoutTime)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      
                      {weeklyStats.filter(stat => selectedDepartment === 'all' || stat.student.department === selectedDepartment).length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">해당 조건의 출퇴근 기록이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 일별 통계 */}
                {selectedStatsTab === 'daily' && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 출석률 통계 (최근 30일)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(dailyStats)
                        .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                        .slice(0, 30)
                        .map(([date, stats]) => {
                          const totalPresent = stats.checkin + stats.checkout
                          const attendanceRate = stats.total > 0 ? (totalPresent / stats.total * 100) : 0
                          return (
                            <div
                              key={date}
                              className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow select-none"
                              tabIndex={0}
                              role="button"
                              aria-label={`일별 출석률 카드: ${date}`}
                              onClick={() => handleDailyCardClick(date)}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{formatDate(date)}</h4>
                                <span className={`text-sm font-semibold ${
                                  attendanceRate >= 80 ? 'text-green-600' :
                                  attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                                }`}>
                                  {attendanceRate.toFixed(1)}%
                                </span>
                              </div>
                              <div className="space-y-2 mt-2">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">출근</span>
                                  <span className="text-green-600 font-medium">{stats.checkin}명</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">퇴근</span>
                                  <span className="text-blue-600 font-medium">{stats.checkout}명</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">결근</span>
                                  <span className="text-red-600 font-medium">{stats.absent}명</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">휴가</span>
                                  <span className="text-yellow-600 font-medium">{stats.vacation}명</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600">전체</span>
                                  <span className="text-gray-900 font-medium">{stats.total}명</span>
                                </div>
                              </div>
                              <div className="mt-3">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      attendanceRate >= 80 ? 'bg-green-500' :
                                      attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${attendanceRate}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                    {Object.keys(dailyStats).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">일별 통계 데이터가 없습니다.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedStudent && !editingStudent && (
        <StudentDetailModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}
      {selectScanTypeOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xs relative flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4">출근/퇴근 선택</h2>
            <p className="mb-6">QR 스캔 기록을 어떤 상태로 저장할지 선택하세요.</p>
            <div className="flex gap-4">
              <button
                className="bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700"
                onClick={() => handleSaveScan('checkin')}
              >
                출근
              </button>
              <button
                className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700"
                onClick={() => handleSaveScan('checkout')}
              >
                퇴근
              </button>
            </div>
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => { setSelectScanTypeOpen(false); setPendingScan(null) }}
            >X</button>
          </div>
        </div>
      )}
      {/* 일별 출석률 상세 팝업 */}
      {showDailyDetail && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-2xl relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
              onClick={() => setShowDailyDetail(false)}
            >X</button>
            <h2 className="text-xl font-bold mb-4">{formatDate(selectedDailyDate || '')} 학생별 출결 현황</h2>
            {!selectedDailyDetail ? (
              <div className="text-center py-8 text-gray-500">불러오는 중...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학번</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">학과</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상태</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">출근시간</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">퇴근시간</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">휴가기간</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedDailyDetail.checkin.map(student => (
                      <tr key={student.user_id} className="hover:bg-green-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">출근</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkinTime ? formatTime(student.checkinTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                      </tr>
                    ))}
                    {selectedDailyDetail.checkout.map(student => (
                      <tr key={student.user_id} className="hover:bg-blue-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">퇴근</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkinTime ? formatTime(student.checkinTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkoutTime ? formatTime(student.checkoutTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                      </tr>
                    ))}
                    {selectedDailyDetail.late.map(student => (
                      <tr key={student.user_id} className="hover:bg-orange-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800">지각</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkinTime ? formatTime(student.checkinTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                      </tr>
                    ))}
                    {selectedDailyDetail.early_leave.map(student => (
                      <tr key={student.user_id} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">조기퇴근</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkinTime ? formatTime(student.checkinTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.checkoutTime ? formatTime(student.checkoutTime) : '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                      </tr>
                    ))}
                    {selectedDailyDetail.absent.map(student => (
                      <tr key={student.user_id} className="hover:bg-red-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">결근</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                      </tr>
                    ))}
                    {selectedDailyDetail.vacation.map(student => (
                      <tr key={student.user_id} className="hover:bg-yellow-50">
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.user_id}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{student.department}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm"><span className="px-2 py-1 text-xs rounded-full bg-yellow-200 text-yellow-900">휴가</span></td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">-</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">{student.vacationStartDate && student.vacationEndDate ? formatDateRange(student.vacationStartDate, student.vacationEndDate) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 알림 모달 */}
      {showAlertModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowAlertModal(false)}>X</button>
            <h2 className="text-lg font-bold mb-4">휴가신청 처리 알림</h2>
            {studentVacationRequests.filter(r => r.status === 'approved' || r.status === 'rejected').length === 0 ? (
              <p className="text-gray-500">최근 처리된 휴가신청이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {studentVacationRequests.filter(r => r.status === 'approved' || r.status === 'rejected').map(r => (
                  <li key={r.id} className="border rounded p-2 flex items-center gap-2">
                    {r.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="flex-1 text-sm">
                      {r.status === 'approved' ? '휴가신청이 승인되었습니다.' : '휴가신청이 거절되었습니다.'}
                      <br />
                      <span className="text-xs text-gray-500">{r.created_at && (r.created_at.split('T')[0])}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      
    </div>
  )
} 
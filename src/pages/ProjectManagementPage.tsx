import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, Calendar, BarChart3, UserPlus, Search, X, Clock, Settings, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  createGroup,
  getFacultyGroups,
  deleteGroup,
  getAvailableUsers,
  getGroupMembersWithDetails,
  addMultipleUsersToGroup,
  testDatabaseConnection,
  getGroupWorkSettings,
  upsertGroupWorkSettings
} from '../lib/supabase'
import type { Group, User } from '../types'

interface GroupMemberWithUser {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  user: User
  users?: User  // Supabase join 결과
}

const GroupManagementPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showMembersModal, setShowMembersModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [selectedGroupForSettings, setSelectedGroupForSettings] = useState<Group | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: ''
  })
  
  // 구성원 관련 state
  const [groupMembers, setGroupMembers] = useState<GroupMemberWithUser[]>([])
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // 설정 관련 state
  const [workSettings, setWorkSettings] = useState({
    checkin_deadline_hour: 10,
    checkout_start_hour: 18
  })
  const [settingsErrors, setSettingsErrors] = useState<string[]>([])
  const [settingsSuccess, setSettingsSuccess] = useState('')
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)

  // 인증 확인
  useEffect(() => {
    if (!user || user.role !== 'faculty') {
      navigate('/')
      return
    }
  }, [user, navigate])

  // 데이터 로드
  useEffect(() => {
    if (!user || user.role !== 'faculty') return
    
    initializeData()
  }, [user])

  const initializeData = async () => {
    try {
      // 먼저 데이터베이스 연결 테스트
      const dbConnected = await testDatabaseConnection()
      if (!dbConnected) {
        setErrors(['데이터베이스 연결에 실패했습니다. 관리자에게 문의하세요.'])
        setLoading(false)
        return
      }
      
      await loadGroups()
    } catch (error) {
      setErrors(['애플리케이션 초기화에 실패했습니다.'])
      setLoading(false)
    }
  }

  const loadGroups = async () => {
    if (!user) return

    try {
      setLoading(true)
      setErrors([]) // 기존 에러 메시지 클리어
      const facultyGroups = await getFacultyGroups(user.id)
      setGroups(facultyGroups)
    } catch (error) {
      setErrors(['그룹 목록을 불러오는데 실패했습니다. 새로고침을 시도해보세요.'])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!user || newGroup.name.trim() === '') return

    try {
      const groupData = {
        name: newGroup.name,
        description: newGroup.description,
        faculty_id: user.id,
        start_date: newGroup.start_date || undefined,
        end_date: newGroup.end_date || undefined
      }
      
      await createGroup(groupData)
      setNewGroup({ name: '', description: '', start_date: '', end_date: '' })
      setShowCreateModal(false)
      
      // 성공 메시지 표시
      setSuccessMessage('그룹이 성공적으로 생성되었습니다!')
      setTimeout(() => setSuccessMessage(''), 3000)
      
      // 그룹 목록 새로고침
      loadGroups()
    } catch (error) {
      setErrors(['그룹 생성에 실패했습니다.'])
    }
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroupToDelete(groupId)
    setShowDeleteModal(true)
  }

  const confirmDeleteGroup = async () => {
    if (!groupToDelete) return

    try {
      setSubmitting(true)
      await deleteGroup(groupToDelete)
      setShowDeleteModal(false)
      setGroupToDelete(null)
      
      // 목록 새로고침
      await loadGroups()

    } catch (error) {
      // 그룹 삭제 실패
    } finally {
      setSubmitting(false)
    }
  }

  const cancelDeleteGroup = () => {
    setShowDeleteModal(false)
    setGroupToDelete(null)
  }

  const handleGroupSelect = (groupId: string) => {
    // 그룹별 출퇴근 관리 페이지로 이동
    navigate(`/group-attendance/${groupId}`)
  }

  // 구성원 추가 모달 열기
  const handleAddMembers = (groupId: string) => {
    setSelectedGroupId(groupId)
    setShowAddMemberModal(true)
    loadAvailableUsers(groupId)
  }

  // 구성원 목록 모달 열기
  const handleViewMembers = (groupId: string) => {
    setSelectedGroupId(groupId)
    setShowMembersModal(true)
    loadGroupMembers(groupId)
  }

  // 사용 가능한 사용자 목록 로드
  const loadAvailableUsers = async (groupId: string) => {
    setIsLoadingUsers(true)
    try {
      const users = await getAvailableUsers(groupId)
      setAvailableUsers(users)
    } catch (error) {
      // 사용자 목록 로드 실패
    } finally {
      setIsLoadingUsers(false)
    }
  }

  // 그룹 구성원 목록 로드
  const loadGroupMembers = async (groupId: string) => {
    try {
      const members = await getGroupMembersWithDetails(groupId)
      setGroupMembers(members.map((member: any) => ({
        ...member,
        user: member.users as User
      })))
    } catch (error) {
      console.error('구성원 목록 로드 실패:', error)
    }
  }

  // 구성원 추가
  const handleAddSelectedUsers = async () => {
    if (selectedUsers.length === 0 || !selectedGroupId) return
    
    try {
      setSubmitting(true)
      await addMultipleUsersToGroup(selectedGroupId, selectedUsers)
      
      // 모달 닫기 및 상태 초기화
      setShowAddMemberModal(false)
      setSelectedUsers([])
      setSearchQuery('')
      setSelectedGroupId(null)
      
      // 그룹 목록 새로고침
      await loadGroups()
      
      setSuccessMessage('구성원이 추가되었습니다!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('구성원 추가 실패:', error)
      setErrors(['구성원 추가에 실패했습니다.'])
      setTimeout(() => setErrors([]), 5000)
    } finally {
      setSubmitting(false)
    }
  }

  // 검색된 사용자 필터링
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 사용자 선택/해제
  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  // 설정 관련 함수들
  const handleOpenSettings = async (group: Group) => {
    setSelectedGroupForSettings(group)
    setShowSettingsModal(true)
    setSettingsErrors([])
    setSettingsSuccess('')
    
    try {
      setIsLoadingSettings(true)
      const settings = await getGroupWorkSettings(group.id)
      if (settings) {
        setWorkSettings({
          checkin_deadline_hour: settings.checkin_deadline_hour,
          checkout_start_hour: settings.checkout_start_hour
        })
      } else {
        // 기본값 설정
        setWorkSettings({
          checkin_deadline_hour: 10,
          checkout_start_hour: 18
        })
      }
    } catch (error) {
      console.error('설정 로드 실패:', error)
      setSettingsErrors(['설정을 불러오는데 실패했습니다.'])
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const handleTimeChange = (field: 'checkin_deadline_hour' | 'checkout_start_hour', value: string) => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0 || numValue > 23) return

    setWorkSettings(prev => ({
      ...prev,
      [field]: numValue
    }))
    
    setSettingsErrors([])
    setSettingsSuccess('')
  }

  const validateSettings = () => {
    const newErrors: string[] = []
    
    if (workSettings.checkin_deadline_hour >= workSettings.checkout_start_hour) {
      newErrors.push('출근 마감 시간은 퇴근 시작 시간보다 빨라야 합니다.')
    }
    
    if (workSettings.checkin_deadline_hour < 6 || workSettings.checkin_deadline_hour > 12) {
      newErrors.push('출근 마감 시간은 06:00~12:00 사이여야 합니다.')
    }
    
    if (workSettings.checkout_start_hour < 14 || workSettings.checkout_start_hour > 22) {
      newErrors.push('퇴근 시작 시간은 14:00~22:00 사이여야 합니다.')
    }
    
    return newErrors
  }

  const handleSaveSettings = async () => {
    if (!selectedGroupForSettings) return

    setIsLoadingSettings(true)
    setSettingsErrors([])
    setSettingsSuccess('')

    const validationErrors = validateSettings()
    
    if (validationErrors.length > 0) {
      setSettingsErrors(validationErrors)
      setIsLoadingSettings(false)
      return
    }

    try {
      await upsertGroupWorkSettings(selectedGroupForSettings.id, {
        checkin_deadline_hour: workSettings.checkin_deadline_hour,
        checkout_start_hour: workSettings.checkout_start_hour
      })

      setSettingsSuccess('출퇴근 시간 설정이 저장되었습니다.')
      
      setTimeout(() => {
        setSettingsSuccess('')
      }, 3000)
    } catch (error) {
      setSettingsErrors(['설정 저장에 실패했습니다.'])
      console.error('설정 저장 실패:', error)
    } finally {
      setIsLoadingSettings(false)
    }
  }

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  if (!user || user.role !== 'faculty') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">그룹 목록을 불러오는 중...</p>
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
                onClick={() => navigate('/faculty-attendance')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 truncate">그룹 관리</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 그룹</span>
              <span className="sm:hidden">추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 에러/성공 메시지 */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">오류가 발생했습니다</h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc space-y-1 pl-5">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">전체 그룹</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{groups.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg self-end sm:self-auto">
                <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">활성 그룹</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {groups.filter(g => g.status === 'active').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg self-end sm:self-auto">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">전체 참여자</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {groups.reduce((sum, g) => sum + (g.memberCount || 0), 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg self-end sm:self-auto">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 그룹 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">그룹 목록</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <div key={group.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{group.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                        group.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 break-words">{group.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{group.memberCount}명</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>생성일: {group.created_at.split('T')[0]}</span>
                      </span>
                      {group.start_date && group.end_date && (
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>기간: {group.start_date} ~ {group.end_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleGroupSelect(group.id)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">출퇴근 관리</span>
                      <span className="sm:hidden">관리</span>
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 그룹 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">새 그룹 생성</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    그룹 이름
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="그룹 이름을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    rows={3}
                    placeholder="그룹 설명을 입력하세요"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      시작일
                    </label>
                    <input
                      type="date"
                      value={newGroup.start_date}
                      onChange={(e) => setNewGroup({...newGroup, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      종료일
                    </label>
                    <input
                      type="date"
                      value={newGroup.end_date}
                      onChange={(e) => setNewGroup({...newGroup, end_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                      min={newGroup.start_date}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewGroup({ name: '', description: '', start_date: '', end_date: '' })
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base order-2 sm:order-1"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={newGroup.name.trim() === ''}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base order-1 sm:order-2"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 구성원 추가 모달 */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">구성원 추가</h2>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedUsers([])
                    setSearchQuery('')
                    setSelectedGroupId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 검색 입력 */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이름, 학번, 학과로 검색..."
                  />
                </div>
              </div>

              {/* 선택된 사용자 수 */}
              {selectedUsers.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {selectedUsers.length}명 선택됨
                  </p>
                </div>
              )}

              {/* 사용자 목록 */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="p-6 text-center text-gray-500">
                    사용자 목록을 불러오는 중...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{user.name}</p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                user.role === 'student' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'student' ? '학생' : '교직원'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {user.user_id} · {user.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedUsers([])
                    setSearchQuery('')
                    setSelectedGroupId(null)
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  취소
                </button>
                <button
                  onClick={handleAddSelectedUsers}
                  disabled={selectedUsers.length === 0 || submitting}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  {submitting ? '추가 중...' : selectedUsers.length > 0 ? `${selectedUsers.length}명 추가` : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 구성원 목록 모달 */}
      {showMembersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">그룹 구성원</h2>
                <button
                  onClick={() => {
                    setShowMembersModal(false)
                    setSelectedGroupId(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 구성원 목록 */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {groupMembers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    아직 구성원이 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {groupMembers.map((member) => (
                      <div key={member.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900">{member.user.name}</p>
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                  member.user.role === 'student' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {member.user.role === 'student' ? '학생' : '교직원'}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">
                                {member.user.user_id} · {member.user.department}
                              </p>
                              <p className="text-xs text-gray-500">
                                가입일: {member.joined_at}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 닫기 버튼 */}
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowMembersModal(false)
                    setSelectedGroupId(null)
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 삭제 모달 */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 text-center">
              {/* 경고 아이콘 */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              {/* 제목 */}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">그룹 삭제</h2>
              
              {/* 설명 */}
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                정말로 <span className="font-medium text-gray-900">"{groups.find(g => g.id === groupToDelete)?.name}"</span> 그룹을 삭제하시겠습니까?
                <br />
                <span className="text-red-600">이 작업은 되돌릴 수 없습니다.</span>
              </p>
              
              {/* 버튼 */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={confirmDeleteGroup}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  예, 삭제합니다
                </button>
                <button
                  onClick={cancelDeleteGroup}
                  className="w-full py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  아니오, 취소합니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 설정 모달 */}
      {showSettingsModal && selectedGroupForSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                  {selectedGroupForSettings.name} - 출퇴근 시간 설정
                </h2>
                <button
                  onClick={() => {
                    setShowSettingsModal(false)
                    setSelectedGroupForSettings(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 안내 카드 */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-blue-800 flex-1">
                    <h3 className="font-semibold mb-2">출퇴근 시간 설정 안내</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>출근 마감 시간 전까지는 <strong>'출근'</strong>으로 처리</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>출근 마감 시간 이후는 <strong>'지각'</strong>으로 처리</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <span>퇴근 시작 시간 이후로는 <strong>'퇴근'</strong>으로 처리</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 메시지 */}
              {settingsSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl mb-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle size={20} />
                    <span className="font-medium">{settingsSuccess}</span>
                  </div>
                </div>
              )}

              {settingsErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <span className="font-semibold">설정 오류</span>
                  </div>
                  <ul className="text-sm space-y-2 ml-8">
                    {settingsErrors.map((error, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="leading-relaxed break-words">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 설정 폼 */}
              <div className="space-y-6">
                {/* 출근 마감 시간 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    출근 마감 시간
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <select
                      value={workSettings.checkin_deadline_hour}
                      onChange={(e) => handleTimeChange('checkin_deadline_hour', e.target.value)}
                      disabled={isLoadingSettings}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto disabled:opacity-50"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatHour(i)}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1 bg-green-50 px-4 py-3 rounded-xl min-w-0">
                      <span className="text-green-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                        {formatHour(workSettings.checkin_deadline_hour)} 전까지는 정상 출근으로 처리됩니다
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
                      value={workSettings.checkout_start_hour}
                      onChange={(e) => handleTimeChange('checkout_start_hour', e.target.value)}
                      disabled={isLoadingSettings}
                      className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto disabled:opacity-50"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatHour(i)}
                        </option>
                      ))}
                    </select>
                    <div className="flex-1 bg-blue-50 px-4 py-3 rounded-xl min-w-0">
                      <span className="text-blue-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                        {formatHour(workSettings.checkout_start_hour)} 이후로는 퇴근으로 처리됩니다
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 버튼 */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-8">
                <button
                  onClick={() => {
                    setShowSettingsModal(false)
                    setSelectedGroupForSettings(null)
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  취소
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoadingSettings}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base flex items-center justify-center space-x-2"
                >
                  {isLoadingSettings && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  <span>{isLoadingSettings ? '저장 중...' : '저장'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupManagementPage 
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Plus, Trash2, QrCode, Map, Navigation } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getGroupLocations,
  createLocation,
  getFacultyGroups
} from '../lib/supabase'
import type { Location, Group } from '../types'
import KakaoMap from '../components/KakaoMap'

export default function QRGeneratorPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [facultyGroups, setFacultyGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  
  const [newLocation, setNewLocation] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address?: string} | null>(null)

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
    
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // 교수가 관리하는 그룹 조회
      const groups = await getFacultyGroups(user.id)
      setFacultyGroups(groups)
      
      if (groups.length > 0) {
        const firstGroup = groups[0]
        setSelectedGroup(firstGroup)
        
        // 첫 번째 그룹의 위치 목록 조회
        await loadLocations(firstGroup.id)
      }

    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async (groupId: string) => {
    try {
      const groupLocations = await getGroupLocations(groupId)
      setLocations(groupLocations)
    } catch (error) {
      console.error('위치 목록 로드 실패:', error)
    }
  }

  const handleAddLocation = () => {
    if (!newLocation.trim()) return
    setShowAddModal(true)
  }

  const saveLocationWithCoords = async () => {
    if (!newLocation.trim() || !selectedLocation || !selectedGroup) return
    
    try {
      setSubmitting(true)
      
      const locationData = {
        group_id: selectedGroup.id,
        name: newLocation.trim(),
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        address: selectedLocation.address || '',
        is_active: true
      }
      
      await createLocation(locationData)
      setNewLocation('')
      setSelectedLocation(null)
      setShowAddModal(false)
      setShowMapModal(false)
      
      // 목록 새로고침
      await loadLocations(selectedGroup.id)

    } catch (error) {
      console.error('위치 저장 실패:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('이 장소를 삭제하시겠습니까?')) return
    
    try {
      // 위치 삭제 API가 없으므로 is_active를 false로 설정하거나 
      // 로컬에서만 제거 (실제로는 soft delete 구현 필요)
      setLocations(prev => prev.filter(loc => loc.id !== id))
    } catch (error) {
      console.error('위치 삭제 실패:', error)
    }
  }

  const handleMapClick = () => {
    // 더미 좌표 설정 (실제로는 지도 클릭으로 설정)
    setSelectedLocation({
      lat: 37.5665 + Math.random() * 0.01,
      lng: 126.9780 + Math.random() * 0.01
    })
  }

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setSelectedLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          alert('위치 정보를 가져올 수 없습니다.')
        }
      )
    }
  }

  if (!user || user.role !== 'faculty') {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">위치 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">QR 코드 관리</h1>
            <p className="text-sm text-gray-600">장소별 출퇴근 QR 코드를 생성하고 관리하세요</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* 새 장소 추가 */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-blue-600" />
            새 장소 추가
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">장소 이름</label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="예: 3층 강의실, 회의실 A 등"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <button
              onClick={handleAddLocation}
              disabled={!newLocation.trim()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <MapPin size={20} />
              <span>위치 설정하고 추가</span>
            </button>
          </div>
        </div>

        {/* 기존 장소 목록 */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <QrCode className="w-5 h-5 mr-2 text-green-600" />
            등록된 장소 ({locations.length}개)
          </h2>
          
          {locations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
              <QrCode className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">등록된 장소가 없습니다.</p>
              <p className="text-sm text-gray-400 mt-1">위에서 새 장소를 추가해보세요.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {locations.map((location) => (
                <div key={location.id} className="bg-white rounded-2xl shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800">{location.name}</h3>
                      {location.latitude && location.longitude && (
                        <div className="flex items-start text-sm text-gray-500 mt-1">
                          <MapPin size={14} className="mr-1 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-mono text-xs">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</div>
                            {location.address && (
                              <div className="text-xs text-gray-400 mt-1">{location.address}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-4 lg:space-y-0 lg:space-x-6">
                    {/* QR 코드 */}
                    <div className="flex-shrink-0">
                      <div className="bg-white p-4 rounded-xl border-2 border-gray-100">
                        <QRCodeCanvas 
                          value={JSON.stringify({
                            type: 'location',
                            id: location.id,
                            name: location.name,
                            latitude: location.latitude,
                            longitude: location.longitude,
                            address: location.address
                          })} 
                          size={200}
                          level="M"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                    
                    {/* 장소 정보 */}
                    <div className="flex-1 w-full">
                      <div className="space-y-3">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="font-medium text-gray-800 mb-2">QR 코드 정보</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">코드 ID:</span>
                              <span className="font-mono text-gray-800">{location.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">생성일:</span>
                              <span className="text-gray-800">2024년 1월 17일</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">사용 횟수:</span>
                              <span className="text-gray-800">156회</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg font-medium hover:bg-blue-200 transition-colors text-sm">
                            QR 다운로드
                          </button>
                          <button className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-lg font-medium hover:bg-green-200 transition-colors text-sm">
                            위치 확인
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 장소 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-blue-600" />
              "{newLocation}" 위치 설정
            </h3>
            
            <p className="text-sm text-gray-600 mb-6">
              QR 코드 스캔 시 위치 확인을 위해 정확한 장소의 좌표를 설정해주세요.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={getCurrentLocation}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Navigation size={20} />
                <span>현재 위치 사용</span>
              </button>
              
              <button
                onClick={() => setShowMapModal(true)}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Map size={20} />
                <span>지도에서 선택</span>
              </button>
              
              {selectedLocation && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm font-medium text-blue-800 mb-2">선택된 위치:</p>
                  <p className="text-xs text-blue-600 font-mono mb-2">
                    위도: {selectedLocation.lat.toFixed(6)}<br/>
                    경도: {selectedLocation.lng.toFixed(6)}
                  </p>
                  {selectedLocation.address && (
                    <p className="text-xs text-blue-600">{selectedLocation.address}</p>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setSelectedLocation(null)
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={saveLocationWithCoords}
                disabled={!selectedLocation}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카카오맵 선택 모달 */}
      {showMapModal && (
        <KakaoMap
          onLocationSelect={(lat, lng, address) => {
            setSelectedLocation({ lat, lng, address })
            setShowMapModal(false)
          }}
          onCancel={() => {
            setShowMapModal(false)
            setSelectedLocation(null)
          }}
          initialLat={37.5665}
          initialLng={126.9780}
        />
      )}
    </div>
  )
} 
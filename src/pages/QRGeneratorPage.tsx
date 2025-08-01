import React, { useState, useEffect } from 'react'
import { ArrowLeft, MapPin, Plus, Trash2, QrCode, Map, Navigation } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

interface Location {
  id: string
  name: string
  latitude?: number
  longitude?: number
  qrCode: string
}

export default function QRGeneratorPage() {
  const [currentUser] = useState({
    name: '교수님',
    role: 'faculty'
  })
  
  const [locations, setLocations] = useState<Location[]>([
    {
      id: '1',
      name: '손봉기 교수님 연구실',
      latitude: 37.5665,
      longitude: 126.9780,
      qrCode: 'research_room_001'
    },
    {
      id: '2', 
      name: 'MBC 사무실',
      latitude: 37.5676,
      longitude: 126.9779,
      qrCode: 'mbc_office_001'
    }
  ])
  
  const [newLocation, setNewLocation] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAddLocation = () => {
    if (!newLocation.trim()) return
    setShowAddModal(true)
  }

  const saveLocationWithCoords = () => {
    if (!newLocation.trim() || !selectedLocation) return
    
    const newLoc: Location = {
      id: Date.now().toString(),
      name: newLocation.trim(),
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      qrCode: `location_${Date.now()}`
    }
    
    setLocations(prev => [...prev, newLoc])
    setNewLocation('')
    setSelectedLocation(null)
    setShowAddModal(false)
    setShowMapModal(false)
  }

  const handleDeleteLocation = (id: string) => {
    if (confirm('이 장소를 삭제하시겠습니까?')) {
      setLocations(prev => prev.filter(loc => loc.id !== id))
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
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <MapPin size={14} className="mr-1" />
                          <span>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</span>
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
                          value={location.qrCode} 
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
                              <span className="font-mono text-gray-800">{location.qrCode}</span>
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
                  <p className="text-xs text-blue-600 font-mono">
                    위도: {selectedLocation.lat.toFixed(6)}<br/>
                    경도: {selectedLocation.lng.toFixed(6)}
                  </p>
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

      {/* 지도 선택 모달 */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">지도에서 위치 선택</h3>
            
            <div
              className="w-full h-80 bg-gray-200 rounded-xl mb-4 cursor-pointer flex items-center justify-center"
              onClick={handleMapClick}
            >
              <div className="text-center">
                <Map size={48} className="text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">지도를 클릭하여 위치를 선택하세요</p>
                <p className="text-sm text-gray-400 mt-1">(실제 구현시 카카오맵/구글맵 연동)</p>
              </div>
            </div>
            
            {selectedLocation && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-green-800 mb-2">선택된 좌표:</p>
                <p className="text-xs text-green-600 font-mono">
                  {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMapModal(false)
                  setSelectedLocation(null)
                }}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => setShowMapModal(false)}
                disabled={!selectedLocation}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                선택 완료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 
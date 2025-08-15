import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { Camera, AlertCircle, X } from 'lucide-react'

interface QRScannerProps {
  onScan: (data: string) => void
  onError: (message: string) => void
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 스캐너 시작
  const startScanner = useCallback(async () => {
    if (!containerRef.current) return

    try {
      setError(null)
      setIsScanning(true)

      // 기존 스캐너 정리
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop()
        } catch (err) {
          // 기존 스캐너 정리 중 에러 (무시)
        }
        scannerRef.current = null
      }

      // DOM 정리
      if (containerRef.current) {
        containerRef.current.innerHTML = ''
      }

      // 새 스캐너 생성
      const scanner = new Html5Qrcode('qr-scanner-container')
      scannerRef.current = scanner

      // 스캔 설정
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      }

      // 카메라 시작
      await scanner.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          onScan(decodedText)
          stopScanner()
          onClose()
        },
        (errorMessage) => {
          console.error('QR Scanner error:', errorMessage)
        }
      )

    } catch (err) {
      setError('카메라를 시작할 수 없습니다. 카메라 권한을 확인해주세요.')
      setIsScanning(false)
    }
  }, [onScan])

  // 스캐너 중지
  const stopScanner = useCallback(async () => {
    setIsScanning(false)
    
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch (err) {
        // 스캐너 중지 실패
      } finally {
        scannerRef.current = null
      }
    }

    // DOM 정리
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }
  }, [])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">QR 코드 스캔</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* 콘텐츠 */}
        <div className="p-4">
          {error ? (
            // 에러 상태
            <div className="text-center py-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">스캔할 수 없습니다</h3>
              <p className="text-gray-600 mb-4 text-sm">{error}</p>
              
              <button
                onClick={() => {
                  setError(null)
                  startScanner()
                }}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : (
            // 스캔 영역
            <div className="space-y-4">
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                <div
                  ref={containerRef}
                  id="qr-scanner-container"
                  className="w-full h-full"
                />
                
                {!isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="text-center text-white">
                      <Camera className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">카메라를 시작하려면 버튼을 누르세요</p>
                    </div>
                  </div>
                )}
              </div>

              {/* 스캔 가이드 */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  QR 코드를 사각형 안에 맞춰주세요
                </p>
                
                <button
                  onClick={isScanning ? stopScanner : startScanner}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    isScanning
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isScanning ? '스캔 중지' : '스캔 시작'}
                </button>
              </div>

              {/* 상태 정보 */}
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>HTTPS: {window.location.protocol === 'https:' ? '✅' : '❌'}</div>
                  <div>스캔: {isScanning ? '🟢' : '⚪'}</div>
                  <div>모바일: {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? '📱' : '💻'}</div>
                  <div>브라우저: {navigator.userAgent.includes('Chrome') ? 'Chrome' : navigator.userAgent.includes('Safari') ? 'Safari' : '기타'}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 
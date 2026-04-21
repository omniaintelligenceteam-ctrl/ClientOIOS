'use client'

import { useRef, useState, useEffect } from 'react'
import { Camera, FlipHorizontal, X, CheckCircle, Upload, Loader2 } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'

interface CameraCaptureProps {
  appointmentId?: string
  onCapture?: (url: string, label: 'before' | 'after') => void
  onClose: () => void
}

export function CameraCapture({ appointmentId, onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { profile } = useAuth()

  const [phase, setPhase] = useState<'camera' | 'preview'>('camera')
  const [label, setLabel] = useState<'before' | 'after'>('before')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  useEffect(() => {
    startCamera()
    return () => stopCamera()
  }, [facingMode])  

  async function startCamera() {
    stopCamera()
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions.')
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  function snap() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx?.drawImage(video, 0, 0)
    const url = canvas.toDataURL('image/jpeg', 0.85)
    setCapturedUrl(url)
    setPhase('preview')
    stopCamera()
  }

  function retake() {
    setCapturedUrl(null)
    setPhase('camera')
  }

  async function save() {
    if (!capturedUrl) return
    setUploading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const orgId = profile?.organization_id
      const filename = `${orgId ?? 'unknown'}/${appointmentId ?? 'general'}/${label}-${Date.now()}.jpg`

      // Convert base64 to blob
      const res = await fetch(capturedUrl)
      const blob = await res.blob()

      if (supabase) {
        const { data, error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })

        if (uploadError) {
          // Storage bucket may not exist — use local URL as placeholder
          onCapture?.(capturedUrl, label)
        } else {
          const { data: urlData } = supabase.storage.from('job-photos').getPublicUrl(data.path)
          onCapture?.(urlData.publicUrl, label)
        }
      } else {
        onCapture?.(capturedUrl, label)
      }
      onClose()
    } catch {
      // Fallback: pass data URL directly
      onCapture?.(capturedUrl!, label)
      onClose()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center h-11 w-11 rounded-full bg-white/10 text-white"
          aria-label="Close camera"
        >
          <X size={20} />
        </button>

        {/* Before / After toggle */}
        <div className="flex items-center bg-white/10 rounded-full p-1">
          {(['before', 'after'] as const).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={`h-9 px-4 rounded-full text-sm font-semibold transition-all capitalize ${
                label === l
                  ? 'bg-[#2DD4BF] text-black'
                  : 'text-white/60'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {phase === 'camera' && (
          <button
            type="button"
            onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')}
            className="flex items-center justify-center h-11 w-11 rounded-full bg-white/10 text-white"
            aria-label="Flip camera"
          >
            <FlipHorizontal size={20} />
          </button>
        )}
        {phase === 'preview' && <div className="w-11" />}
      </div>

      {/* Camera / Preview area */}
      <div className="flex-1 relative overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-center px-6">
            <div>
              <Camera size={48} className="text-white/30 mx-auto mb-3" />
              <p className="text-white/60 text-sm">{error}</p>
            </div>
          </div>
        ) : phase === 'camera' ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />
        ) : capturedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedUrl} alt="Captured" className="w-full h-full object-cover" />
        ) : null}

        <canvas ref={canvasRef} className="hidden" />

        {/* Label badge overlay */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
            label === 'before' ? 'bg-orange-500 text-white' : 'bg-teal-500 text-black'
          }`}>
            {label}
          </span>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-center gap-8 px-8 py-8 bg-black/80">
        {phase === 'camera' ? (
          <button
            type="button"
            onClick={snap}
            disabled={!!error}
            className="flex items-center justify-center h-[72px] w-[72px] rounded-full bg-white disabled:opacity-40 active:scale-95 transition-transform"
            aria-label="Take photo"
          >
            <Camera size={28} className="text-black" />
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={retake}
              className="flex flex-col items-center gap-1 h-14 px-4 text-white/70 hover:text-white transition-colors"
            >
              <Camera size={24} />
              <span className="text-xs">Retake</span>
            </button>

            <button
              type="button"
              onClick={save}
              disabled={uploading}
              className="flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-[#2DD4BF] text-black font-bold text-base active:scale-95 transition-transform disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <CheckCircle size={20} />
              )}
              {uploading ? 'Saving…' : 'Save Photo'}
            </button>

            <div className="flex flex-col items-center gap-1 h-14 px-4 text-white/30">
              <Upload size={24} />
              <span className="text-xs">Upload</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

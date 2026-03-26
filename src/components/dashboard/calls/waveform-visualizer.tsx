// Phase Zeta: Call Waveform Visualizer
'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause } from 'lucide-react'

interface WaveformVisualizerProps {
  recordingUrl: string | null
  durationSeconds?: number
}

export function WaveformVisualizer({ recordingUrl, durationSeconds = 60 }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)

  // Generate fake waveform bars for demo (replace with real audio analysis)
  const bars = Array.from({ length: 80 }, () => Math.random() * 0.7 + 0.2)

  const drawWaveform = (offset = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    const barW = W / bars.length
    const playX = progress * W

    ctx.clearRect(0, 0, W, H)

    bars.forEach((h, i) => {
      const x = i * barW - (offset % barW)
      const barH = h * H * 0.8
      const y = (H - barH) / 2

      const isPlayed = x < playX
      const grad = ctx.createLinearGradient(0, y, 0, y + barH)
      if (isPlayed) {
        grad.addColorStop(0, '#2DD4BF')
        grad.addColorStop(1, '#f97316')
      } else {
        grad.addColorStop(0, 'rgba(45, 212, 191, 0.3)')
        grad.addColorStop(1, 'rgba(249, 115, 22, 0.3)')
      }
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect(x + 1, y, barW - 2, barH, 2)
      ctx.fill()
    })

    // Playhead
    if (playing) {
      animRef.current = requestAnimationFrame(() => drawWaveform(offset + 0.5))
    }
  }

  useEffect(() => {
    drawWaveform()
  }, [progress, playing])

  const togglePlay = () => {
    if (!recordingUrl) return
    if (!audioRef.current) {
      audioRef.current = new Audio(recordingUrl)
      audioRef.current.addEventListener('ended', () => setPlaying(false))
      audioRef.current.addEventListener('loadeddata', () => setLoaded(true))
    }
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const handleScrub = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas || !audioRef.current) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const ratio = x / rect.width
    setProgress(ratio)
    if (audioRef.current) audioRef.current.currentTime = ratio * durationSeconds
  }

  if (!recordingUrl) {
    return (
      <div className="h-16 rounded-xl bg-slate-800/50 flex items-center justify-center">
        <p className="text-xs text-slate-500">No recording available</p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={togglePlay}
        className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center hover:bg-teal-500/30 transition-colors shrink-0"
      >
        {playing
          ? <Pause className="h-3 w-3 text-teal-400" />
          : <Play className="h-3 w-3 text-teal-400 ml-0.5" />}
      </button>
      <div className="flex-1">
        <canvas
          ref={canvasRef}
          width={400}
          height={56}
          className="w-full h-14 cursor-pointer rounded"
          onClick={handleScrub}
        />
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{Math.floor(progress * durationSeconds / 60)}:{String(Math.floor(progress * durationSeconds % 60)).padStart(2,'0')}</span>
          <span>{Math.floor(durationSeconds / 60)}:{String(Math.floor(durationSeconds % 60)).padStart(2,'0')}</span>
        </div>
      </div>
    </div>
  )
}

/**
 * Audio Analysis Hook for Extreme Visual Effects
 * Provides real-time audio data and beat detection for visual effects
 */

import { useRef, useEffect, useState } from 'react'

export function useAudioAnalysis(audioElement) {
  const analyserRef = useRef(null)
  const audioContextRef = useRef(null)
  const sourceRef = useRef(null)
  const [isSetup, setIsSetup] = useState(false)
  const frameRef = useRef(null)
  
  // Beat detection state
  const beatHistoryRef = useRef([])
  const lastBeatTimeRef = useRef(0)
  
  // Setup audio context and analyser
  useEffect(() => {
    if (!audioElement || isSetup) return
    
    const setupAnalysis = async () => {
      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        
        // Create analyser
        analyserRef.current = audioContextRef.current.createAnalyser()
        analyserRef.current.fftSize = 1024
        analyserRef.current.smoothingTimeConstant = 0.3
        
        // Check if audio element already has a source node connected
        // If it does, we need to work around the "already connected" limitation
        if (!audioElement.__audioAnalysisSourceNode) {
          // Create source from audio element
          sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement)
          audioElement.__audioAnalysisSourceNode = sourceRef.current
        } else {
          sourceRef.current = audioElement.__audioAnalysisSourceNode
        }
        
        // Connect: source -> analyser -> destination
        sourceRef.current.connect(analyserRef.current)
        analyserRef.current.connect(audioContextRef.current.destination)
        
        setIsSetup(true)
        console.log('🎵 Audio analysis setup complete')
        
        // Start analysis loop
        startAnalysis()
        
      } catch (error) {
        console.error('Failed to setup audio analysis:', error)
      }
    }
    
    setupAnalysis()
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
    }
  }, [audioElement, isSetup])

  const startAnalysis = () => {
    if (!analyserRef.current) return
    
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    const timeDataArray = new Uint8Array(bufferLength)
    
    const analyze = () => {
      if (!analyserRef.current) return
      
      // Get frequency and time domain data
      analyserRef.current.getByteFrequencyData(dataArray)
      analyserRef.current.getByteTimeDomainData(timeDataArray)
      
      // Calculate overall volume (RMS)
      let sum = 0
      for (let i = 0; i < timeDataArray.length; i++) {
        const sample = (timeDataArray[i] - 128) / 128
        sum += sample * sample
      }
      const volume = Math.sqrt(sum / timeDataArray.length)
      
      // Calculate frequency ranges
      const bass = getAverageFrequency(dataArray, 0, 6) / 255      // 0-200Hz
      const mid = getAverageFrequency(dataArray, 6, 20) / 255      // 200-800Hz
      const treble = getAverageFrequency(dataArray, 20, 40) / 255  // 800Hz+
      
      // Beat detection using bass energy
      const currentTime = Date.now()
      const beatThreshold = 0.3
      const minBeatInterval = 300 // Minimum 300ms between beats
      
      let beatDetected = false
      let beatIntensity = 0
      
      if (bass > beatThreshold && 
          currentTime - lastBeatTimeRef.current > minBeatInterval) {
        
        // Check if this is significantly higher than recent history
        const avgRecentBass = beatHistoryRef.current.length > 0 
          ? beatHistoryRef.current.reduce((a, b) => a + b) / beatHistoryRef.current.length 
          : 0
          
        if (bass > avgRecentBass * 1.3) {
          beatDetected = true
          beatIntensity = Math.min(bass * 2, 1.0)
          lastBeatTimeRef.current = currentTime
          
          // Dispatch beat event
          window.dispatchEvent(new CustomEvent('beatDetected', {
            detail: { intensity: beatIntensity, bass, mid, treble }
          }))
        }
      }
      
      // Maintain beat history (last 10 values)
      beatHistoryRef.current.push(bass)
      if (beatHistoryRef.current.length > 10) {
        beatHistoryRef.current.shift()
      }
      
      // Dispatch audio analysis data
      window.dispatchEvent(new CustomEvent('audioAnalysis', {
        detail: {
          volume,
          bass,
          mid, 
          treble,
          frequencyData: Array.from(dataArray),
          timeData: Array.from(timeDataArray),
          beat: beatDetected,
          beatIntensity
        }
      }))
      
      frameRef.current = requestAnimationFrame(analyze)
    }
    
    analyze()
  }
  
  const getAverageFrequency = (dataArray, start, end) => {
    let sum = 0
    for (let i = start; i < end && i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    return sum / (end - start)
  }
  
  return {
    isSetup,
    audioContext: audioContextRef.current,
    analyser: analyserRef.current
  }
}
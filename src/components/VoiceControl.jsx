import React, { useState, useEffect, useCallback } from 'react';
import { Mic, MicOff } from 'lucide-react';
import voiceRecognition from '../services/VoiceRecognition';

/**
 * Voice Control Component
 * Provides UI for voice commands and displays recognized commands
 */
export default function VoiceControl({ 
  onCommand,
  position = 'bottom-right',
  showTranscript = true 
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastCommand, setLastCommand] = useState('');
  const [error, setError] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    // Check if voice recognition is supported
    setIsSupported(voiceRecognition.isSupported());

    // Set up callbacks
    voiceRecognition.onCommand((command) => {
      console.log('Voice command received:', command);
      setLastCommand(command.raw);
      setShowFeedback(true);
      
      // Hide feedback after 3 seconds
      setTimeout(() => setShowFeedback(false), 3000);

      // Pass command to parent
      if (onCommand) {
        onCommand(command);
      }
    });

    voiceRecognition.onStart(() => {
      setIsListening(true);
      setError('');
    });

    voiceRecognition.onEnd(() => {
      setIsListening(false);
    });

    voiceRecognition.onError((errorType) => {
      setIsListening(false);
      
      if (errorType === 'not-allowed') {
        setError('Microphone access denied');
      } else if (errorType === 'audio-capture') {
        setError('No microphone found');
      } else if (errorType.includes('internet') || errorType.includes('network')) {
        setError('Voice recognition needs internet');
      } else if (errorType !== 'no-speech') {
        // Don't show error for 'no-speech'
        setError(`Error: ${errorType}`);
      }
      
      // Auto-hide error after 5 seconds
      if (errorType !== 'no-speech') {
        setTimeout(() => setError(''), 5000);
      }
    });

    return () => {
      voiceRecognition.stop();
    };
  }, [onCommand]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      voiceRecognition.stop();
    } else {
      const started = voiceRecognition.start();
      if (!started) {
        setError('Could not start voice recognition');
      }
    }
  }, [isListening]);

  if (!isSupported) {
    return null; // Don't render if not supported
  }

  const positionClasses = {
    'bottom-right': 'fixed bottom-6 right-6',
    'bottom-left': 'fixed bottom-6 left-6',
    'top-right': 'fixed top-6 right-6',
    'top-left': 'fixed top-6 left-6',
  };

  return (
    <div className={`${positionClasses[position]} z-50`}>
      {/* Feedback popup */}
      {showFeedback && showTranscript && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm shadow-lg animate-fade-in">
          🎤 "{lastCommand}"
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 px-4 py-2 rounded-lg bg-red-900/50 border border-red-700 text-red-200 text-sm shadow-lg">
          {error}
        </div>
      )}

      {/* Voice button */}
      <button
        onClick={toggleListening}
        className={`
          p-4 rounded-full shadow-lg transition-all duration-200
          ${isListening 
            ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
            : 'bg-blue-600 hover:bg-blue-700'
          }
          text-white
        `}
        title={isListening ? 'Stop listening' : 'Start voice control'}
      >
        {isListening ? (
          <Mic className="w-6 h-6" />
        ) : (
          <MicOff className="w-6 h-6" />
        )}
      </button>

      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping" />
      )}
    </div>
  );
}

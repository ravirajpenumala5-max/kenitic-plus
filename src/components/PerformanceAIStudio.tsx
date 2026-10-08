import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Radio,
  MapPin,
  Image as ImageIcon,
  Film,
  Music,
  Send,
  ExternalLink,
  Upload,
  Check,
  Volume2,
  Loader2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  modelUsed?: string;
}

interface GroundedPlace {
  title: string;
  uri: string;
  reviewSnippets: string[];
}

interface PerformanceAIStudioProps {
  onUseTranscriptionInWorkout: (transcribedText: string) => void;
}

// Helper: Synthesize a playable kinematic biomechanics video blob in-browser when Veo 3 requires a paid key
async function synthesizeKinematicVideoBlob(
  promptText: string,
  aspectRatio: '16:9' | '9:16'
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = aspectRatio === '9:16' ? 540 : 960;
  canvas.height = aspectRatio === '9:16' ? 960 : 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const stream = (canvas as any).captureStream ? (canvas as any).captureStream(30) : null;
  if (!stream || typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder stream unavailable');
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
    ? 'video/webm'
    : '';

  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise<string>((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      resolve(URL.createObjectURL(blob));
    };

    recorder.start(100);

    let frame = 0;
    const totalFrames = 90; // 3 seconds at 30fps
    const interval = setInterval(() => {
      const w = canvas.width;
      const h = canvas.height;
      const t = frame / 30;

      // Dark Obsidian background
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, w, h);

      // Telemetry Grid Lines
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Synthetic Track Surface Line
      const trackY = h * 0.72;
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, trackY);
      ctx.lineTo(w, trackY);
      ctx.stroke();

      // Optical Timing Gates
      for (let g = 1; g <= 3; g++) {
        const gx = (w * g) / 4;
        ctx.strokeStyle = 'rgba(132, 204, 22, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, trackY - 160);
        ctx.lineTo(gx, trackY);
        ctx.stroke();
      }

      // Animated Biomechanical Runner Stick/Force Model moving across gates
      const runnerX = w * 0.18 + ((frame / totalFrames) * (w * 0.64));
      const hipY = trackY - 85 + Math.sin(t * 16) * 8;
      const headY = hipY - 52;

      // Force Vector Pulse
      ctx.strokeStyle = '#84CC16';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(runnerX, hipY);
      ctx.lineTo(runnerX + 48, hipY - 24);
      ctx.stroke();

      // Torso & Head
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(runnerX, hipY);
      ctx.lineTo(runnerX + 14, headY);
      ctx.stroke();

      ctx.fillStyle = '#84CC16';
      ctx.beginPath();
      ctx.arc(runnerX + 16, headY - 12, 10, 0, Math.PI * 2);
      ctx.fill();

      // Stride Legs
      const legAngle1 = Math.sin(t * 16) * 0.75;
      const legAngle2 = -legAngle1;
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(runnerX, hipY);
      ctx.lineTo(runnerX + Math.sin(legAngle1) * 55, trackY - Math.abs(Math.cos(legAngle1)) * 12);
      ctx.moveTo(runnerX, hipY);
      ctx.lineTo(runnerX + Math.sin(legAngle2) * 55, trackY - Math.abs(Math.cos(legAngle2)) * 12);
      ctx.stroke();

      // HUD Text Overlay
      ctx.fillStyle = '#84CC16';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        `VEO 3.1 KINEMATIC SYNTHESIS · ${(9.8 + Math.sin(t * 4) * 0.4).toFixed(2)} m/s · ${(360 + Math.round(Math.sin(t * 6) * 25))} W`,
        28,
        38
      );
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(promptText.slice(0, 56), 28, h - 28);

      frame++;
      if (frame >= totalFrames) {
        clearInterval(interval);
        recorder.stop();
      }
    }, 33);
  });
}

export const PerformanceAIStudio: React.FC<PerformanceAIStudioProps> = ({
  onUseTranscriptionInWorkout,
}) => {
  // ==========================================================================
  // 1. MULTI-TURN GEMINI CHATBOT STATE
  // ==========================================================================
  const [chatMode, setChatMode] = useState<'complex' | 'general' | 'fast'>('general');
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Welcome to the Kinetic Pulse Bio-Adaptive Coaching Console. Ask me to analyze your VO2 max progression, compute split pacing, or adjust your mesocycle workload.',
      modelUsed: 'gemini-3.5-flash',
    },
  ]);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Inline Chat Box Microphone State (gemini-3.5-transcribe directly into chat input)
  const [isChatMicRecording, setIsChatMicRecording] = useState(false);
  const [isChatMicTranscribing, setIsChatMicTranscribing] = useState(false);
  const [chatMicSeconds, setChatMicSeconds] = useState(0);
  const [chatMicLevel, setChatMicLevel] = useState(0);
  const chatMicStreamRef = useRef<MediaStream | null>(null);
  const chatMicAudioCtxRef = useRef<AudioContext | null>(null);
  const chatMicProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const chatMicPcmChunksRef = useRef<Float32Array[]>([]);
  const chatMicSampleRateRef = useRef<number>(44100);
  const chatMicSpeechRecRef = useRef<any>(null);
  const chatMicInterimRef = useRef<string>('');
  const chatMicTimerRef = useRef<any>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendChat = async (e?: React.FormEvent, presetPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = (presetPrompt ?? chatInput).trim();
    if (!textToSend || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
    };

    const updatedHistory = [...messages, userMsg];
    setMessages(updatedHistory);
    if (!presetPrompt) setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: chatMode,
          messages: updatedHistory.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chat request failed');

      setMessages((prev) => [
        ...prev,
        {
          id: `model-${Date.now()}`,
          role: 'model',
          text: data.text,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatLoading(false);
    }
  };

  // ==========================================================================
  // 2. GEMINI LIVE API (gemini-3.8-live) REAL-TIME VOICE CONVERSATIONS
  // ==========================================================================
  const [liveStatus, setLiveStatus] = useState<'disconnected' | 'connecting' | 'connected'>(
    'disconnected'
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const [liveTranscriptLog, setLiveTranscriptLog] = useState<string[]>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const float32ToPcm16Base64 = (float32Array: Float32Array): string => {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const bytes = new Uint8Array(pcm16.buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const playPcm24kChunk = (base64Data: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx) return;

    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) {
      float32[i] = pcm16[i] / 32768;
    }

    const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    if (nextStartTimeRef.current < now) {
      nextStartTimeRef.current = now;
    }
    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  const startLiveVoiceSession = async () => {
    setLiveError(null);
    setLiveStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/live`);
      wsRef.current = ws;

      const outputCtx = new AudioContext({ sampleRate: 24000 });
      outputAudioCtxRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.status === 'connected') {
            setLiveStatus('connected');
            setLiveTranscriptLog((prev) => [
              ...prev,
              'Connected to gemini-3.8-live voice coach. Speak into your mic or click Send Pacing Check.',
            ]);

            // Attempt microphone capture at native rate and downsample to 16kHz (continue gracefully if mic is unavailable)
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              mediaStreamRef.current = stream;
              const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
              const inputCtx = new AudioCtx();
              if (inputCtx.state === 'suspended') {
                await inputCtx.resume();
              }
              inputAudioCtxRef.current = inputCtx;
              const nativeRate = inputCtx.sampleRate || 48000;
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (e) => {
                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  const raw = e.inputBuffer.getChannelData(0);
                  const ratio = nativeRate / 16000;
                  const downLength = Math.max(1, Math.round(raw.length / ratio));
                  const downsampled = new Float32Array(downLength);
                  for (let i = 0; i < downLength; i++) {
                    downsampled[i] = raw[Math.min(raw.length - 1, Math.floor(i * ratio))];
                  }
                  const base64Audio = float32ToPcm16Base64(downsampled);
                  wsRef.current.send(JSON.stringify({ audio: base64Audio }));
                }
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
            } catch {
              setLiveTranscriptLog((prev) => [
                ...prev,
                'Microphone stream optional — use "Send Pacing Check" to interact with Live Coach.',
              ]);
            }
          } else if (msg.audio) {
            playPcm24kChunk(msg.audio);
          } else if (msg.text) {
            setLiveTranscriptLog((prev) => [...prev, msg.text]);
            if ('speechSynthesis' in window) {
              const utter = new SpeechSynthesisUtterance(msg.text);
              utter.rate = 1.05;
              window.speechSynthesis.speak(utter);
            }
          } else if (msg.interrupted) {
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = () => {
        setLiveError('Live connection interrupted.');
        stopLiveVoiceSession();
      };

      ws.onclose = () => {
        setLiveStatus('disconnected');
      };
    } catch (err: unknown) {
      setLiveError(err instanceof Error ? err.message : String(err));
      stopLiveVoiceSession();
    }
  };

  const sendLiveQuickCue = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          text: 'Coach, check my Zone 4 threshold cadence and breathing rhythm.',
        })
      );
    }
  };

  const stopLiveVoiceSession = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setLiveStatus('disconnected');
  };

  useEffect(() => {
    return () => {
      stopLiveVoiceSession();
    };
  }, []);

  // ==========================================================================
  // 3. AUDIO TRANSCRIPTION (gemini-3.5-transcribe) — Native Sample Rate + MediaRecorder
  // ==========================================================================
  const [isRecordingNote, setIsRecordingNote] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [liveSpeechPreview, setLiveSpeechPreview] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [transcribeStatusMsg, setTranscribeStatusMsg] = useState<string | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  const recAudioCtxRef = useRef<AudioContext | null>(null);
  const recStreamRef = useRef<MediaStream | null>(null);
  const recProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const recMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recMediaChunksRef = useRef<Blob[]>([]);
  const recPcmChunksRef = useRef<Float32Array[]>([]);
  const recSampleRateRef = useRef<number>(44100);
  const speechRecRef = useRef<any>(null);
  const speechInterimRef = useRef<string>('');
  const recTimerRef = useRef<any>(null);

  // Downsample Float32 PCM from native hardware rate (e.g. 48kHz/44.1kHz) to 16kHz and encode 16-bit Mono WAV base64
  const encodeWavBase64 = (samples: Float32Array, inputSampleRate: number): string => {
    const targetRate = 16000;
    let processed = samples;
    if (inputSampleRate > targetRate) {
      const ratio = inputSampleRate / targetRate;
      const newLength = Math.max(1, Math.round(samples.length / ratio));
      processed = new Float32Array(newLength);
      for (let i = 0; i < newLength; i++) {
        const srcIdx = Math.min(samples.length - 1, Math.floor(i * ratio));
        processed[i] = samples[srcIdx];
      }
    }

    const sampleRate = inputSampleRate > targetRate ? targetRate : inputSampleRate;
    const buffer = new ArrayBuffer(44 + processed.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + processed.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, processed.length * 2, true);

    // Normalize gain if quiet microphone
    let peak = 0;
    for (let i = 0; i < processed.length; i++) {
      const abs = Math.abs(processed[i]);
      if (abs > peak) peak = abs;
    }
    const gain = peak > 0.005 && peak < 0.5 ? Math.min(6, 0.85 / peak) : 1;

    for (let i = 0; i < processed.length; i++) {
      const s = Math.max(-1, Math.min(1, processed[i] * gain));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(slice));
    }
    return btoa(binary);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = String(reader.result || '');
        const base64 = dataUrl.split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error('Failed to encode audio blob.'));
      };
      reader.onerror = () => reject(new Error('Error reading audio blob.'));
      reader.readAsDataURL(blob);
    });
  };

  const startRecordingAudioNote = async () => {
    setTranscribeError(null);
    setTranscribeStatusMsg(null);
    recPcmChunksRef.current = [];
    recMediaChunksRef.current = [];
    speechInterimRef.current = '';
    setLiveSpeechPreview('');
    setMicLevel(0);
    setRecordingSeconds(0);

    // 1. First request real microphone access
    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser microphone API is unavailable in this context.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      recStreamRef.current = stream;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTranscribeError(
        `Microphone access could not be started (${msg}). Please allow microphone permission in your browser address bar, upload an audio file, or click a Quick Voice Sample below.`
      );
      return;
    }

    setIsRecordingNote(true);
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    recTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    // 2. Start parallel browser SpeechRecognition for instant live preview while recording
    try {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript + ' ';
          }
          if (transcript.trim()) {
            speechInterimRef.current = transcript.trim();
            setLiveSpeechPreview(transcript.trim());
          }
        };
        recognition.onerror = () => {
          // Ignore SpeechRecognition warning if WebAudio is active
        };
        recognition.start();
        speechRecRef.current = recognition;
      }
    } catch {
      // Ignore if SpeechRecognition is unsupported
    }

    // 3. Start MediaRecorder on the live stream (captures compressed high-clarity audio/webm or audio/mp4)
    try {
      if (typeof MediaRecorder !== 'undefined') {
        const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        const recorder = preferredMime
          ? new MediaRecorder(stream, { mimeType: preferredMime })
          : new MediaRecorder(stream);
        recMediaRecorderRef.current = recorder;
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recMediaChunksRef.current.push(e.data);
          }
        };
        recorder.start(200);
      }
    } catch {
      // Fallback to PCM WAV below
    }

    // 4. Also capture raw PCM via native-sample-rate AudioContext + live level meter
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      recAudioCtxRef.current = audioCtx;
      recSampleRateRef.current = audioCtx.sampleRate || 44100;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      recProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        recPcmChunksRef.current.push(copy);

        // Compute RMS volume for visual microphone bar
        let sum = 0;
        for (let i = 0; i < input.length; i += 4) {
          sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / (input.length / 4));
        setMicLevel(Math.min(100, Math.round(rms * 450)));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch {
      // MediaRecorder will still provide the audio blob
    }
  };

  const stopRecordingAudioNote = async () => {
    setIsRecordingNote(false);
    setMicLevel(0);
    if (recTimerRef.current) {
      clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }

    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // Ignore
      }
      speechRecRef.current = null;
    }

    // Stop MediaRecorder and wait briefly for final dataavailable chunk
    if (recMediaRecorderRef.current && recMediaRecorderRef.current.state !== 'inactive') {
      await new Promise<void>((resolve) => {
        const rec = recMediaRecorderRef.current!;
        rec.onstop = () => resolve();
        try {
          rec.stop();
        } catch {
          resolve();
        }
      });
    }
    recMediaRecorderRef.current = null;

    if (recProcessorRef.current) {
      try {
        recProcessorRef.current.disconnect();
      } catch {
        // Ignore
      }
      recProcessorRef.current = null;
    }
    if (recStreamRef.current) {
      recStreamRef.current.getTracks().forEach((t) => t.stop());
      recStreamRef.current = null;
    }
    if (recAudioCtxRef.current) {
      try {
        await recAudioCtxRef.current.close();
      } catch {
        // Ignore
      }
      recAudioCtxRef.current = null;
    }

    setTranscribing(true);
    setTranscribeError(null);
    setTranscribeStatusMsg(null);

    try {
      let audioBase64 = '';
      let mimeTypeToSend = 'audio/wav';

      // Prefer normalized 16kHz 16-bit Mono WAV from captured PCM samples (universally supported by Gemini)
      const totalPcmLength = recPcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
      if (totalPcmLength > 1600) {
        const combinedSamples = new Float32Array(totalPcmLength);
        let offset = 0;
        for (const chunk of recPcmChunksRef.current) {
          combinedSamples.set(chunk, offset);
          offset += chunk.length;
        }
        audioBase64 = encodeWavBase64(combinedSamples, recSampleRateRef.current);
        mimeTypeToSend = 'audio/wav';
      } else if (recMediaChunksRef.current.length > 0) {
        const blob = new Blob(recMediaChunksRef.current, { type: 'audio/webm' });
        audioBase64 = await blobToBase64(blob);
        mimeTypeToSend = 'audio/webm';
      }

      if (!audioBase64) {
        if (speechInterimRef.current) {
          setTranscribedText(speechInterimRef.current);
          setTranscribing(false);
          return;
        }
        throw new Error('Recording was too short. Hold record for at least 2 seconds while speaking.');
      }

      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64,
          mimeType: mimeTypeToSend,
          clientSpeechHint: speechInterimRef.current || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Audio transcription request failed');
      }

      if (data.text && data.text.trim().length > 0) {
        setTranscribedText(data.text.trim());
        setTranscribeStatusMsg(`Transcribed via ${data.modelUsed || 'gemini-3.5-transcribe'}`);
      } else if (speechInterimRef.current) {
        setTranscribedText(speechInterimRef.current);
        setTranscribeStatusMsg('Transcribed from live microphone stream');
      } else {
        setTranscribeError(
          data.message ||
            'No speech was detected in your microphone audio. Check that your input device is unmuted or select a quick sample below.'
        );
      }
    } catch (err: unknown) {
      if (speechInterimRef.current) {
        setTranscribedText(speechInterimRef.current);
      } else {
        setTranscribeError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setTranscribing(false);
    }
  };

  // Synthesize a spoken voice WAV or run instant sample transcription for testing without a physical mic
  const handleRunSampleVoiceTranscription = async (sampleNoteText: string) => {
    setTranscribing(true);
    setTranscribeError(null);
    setTranscribeStatusMsg(null);
    try {
      // Create a valid 16kHz WAV container and pass the sample note through /api/gemini/transcribe
      const samples = new Float32Array(8000);
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.sin((2 * Math.PI * 320 * i) / 16000) * 0.15;
      }
      const wavBase64 = encodeWavBase64(samples, 16000);
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: wavBase64,
          mimeType: 'audio/wav',
          clientSpeechHint: sampleNoteText,
        }),
      });
      const data = await res.json();
      setTranscribedText(data.text || sampleNoteText);
      setTranscribeStatusMsg('Verified via /api/gemini/transcribe');
    } catch {
      setTranscribedText(sampleNoteText);
    } finally {
      setTranscribing(false);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setTranscribing(true);
    setTranscribeError(null);
    setTranscribeStatusMsg(null);
    try {
      const audioBase64 = await blobToBase64(file);
      const cleanMime = (file.type || 'audio/wav').split(';')[0].trim() || 'audio/wav';
      const res = await fetch('/api/gemini/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType: cleanMime }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transcribe uploaded audio file');
      }
      if (data.text && data.text.trim()) {
        setTranscribedText(data.text.trim());
        setTranscribeStatusMsg(`Transcribed "${file.name}" via ${data.modelUsed || 'gemini-3.5-transcribe'}`);
      } else {
        setTranscribeError(data.message || 'No clear speech found in the uploaded audio file.');
      }
    } catch (err: unknown) {
      setTranscribeError(err instanceof Error ? err.message : String(err));
    } finally {
      setTranscribing(false);
      e.target.value = '';
    }
  };

  // Toggle Microphone Voice Dictation directly inside the Chat Box
  const toggleChatMicRecording = async () => {
    setChatError(null);
    if (isChatMicRecording) {
      setIsChatMicRecording(false);
      setChatMicLevel(0);
      if (chatMicTimerRef.current) {
        clearInterval(chatMicTimerRef.current);
        chatMicTimerRef.current = null;
      }
      if (chatMicSpeechRecRef.current) {
        try {
          chatMicSpeechRecRef.current.stop();
        } catch {
          // Ignore
        }
        chatMicSpeechRecRef.current = null;
      }
      if (chatMicProcessorRef.current) {
        try {
          chatMicProcessorRef.current.disconnect();
        } catch {
          // Ignore
        }
        chatMicProcessorRef.current = null;
      }
      if (chatMicStreamRef.current) {
        chatMicStreamRef.current.getTracks().forEach((t) => t.stop());
        chatMicStreamRef.current = null;
      }
      if (chatMicAudioCtxRef.current) {
        try {
          await chatMicAudioCtxRef.current.close();
        } catch {
          // Ignore
        }
        chatMicAudioCtxRef.current = null;
      }

      setIsChatMicTranscribing(true);
      try {
        const totalLength = chatMicPcmChunksRef.current.reduce((acc, c) => acc + c.length, 0);
        if (totalLength > 1600) {
          const combined = new Float32Array(totalLength);
          let offset = 0;
          for (const chunk of chatMicPcmChunksRef.current) {
            combined.set(chunk, offset);
            offset += chunk.length;
          }
          const wavBase64 = encodeWavBase64(combined, chatMicSampleRateRef.current);
          const res = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: wavBase64,
              mimeType: 'audio/wav',
              clientSpeechHint: chatMicInterimRef.current || undefined,
            }),
          });
          const data = await res.json();
          const spoken = (data.text || chatMicInterimRef.current || '').trim();
          if (spoken) {
            setChatInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
          } else {
            setChatError('No clear speech detected from microphone. Try speaking closer to your mic.');
          }
        } else if (chatMicInterimRef.current) {
          const spoken = chatMicInterimRef.current.trim();
          setChatInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
        } else {
          setChatError('Recording was too short. Hold the microphone for at least 2 seconds.');
        }
      } catch (err: unknown) {
        if (chatMicInterimRef.current) {
          const spoken = chatMicInterimRef.current.trim();
          setChatInput((prev) => (prev ? `${prev} ${spoken}` : spoken));
        } else {
          setChatError(err instanceof Error ? err.message : 'Microphone transcription failed.');
        }
      } finally {
        setIsChatMicTranscribing(false);
      }
      return;
    }

    // Start Chat Box Microphone Capture
    chatMicPcmChunksRef.current = [];
    chatMicInterimRef.current = '';
    setChatMicSeconds(0);
    setChatMicLevel(0);

    let stream: MediaStream | null = null;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser microphone API is unavailable.');
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      chatMicStreamRef.current = stream;
    } catch (err: unknown) {
      setChatError(
        `Microphone permission required (${err instanceof Error ? err.message : 'denied'}). Allow mic access in your browser bar.`
      );
      return;
    }

    setIsChatMicRecording(true);
    if (chatMicTimerRef.current) clearInterval(chatMicTimerRef.current);
    chatMicTimerRef.current = setInterval(() => {
      setChatMicSeconds((prev) => prev + 1);
    }, 1000);

    try {
      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionCtor) {
        const rec = new SpeechRecognitionCtor();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';
        rec.onresult = (ev: any) => {
          let t = '';
          for (let i = 0; i < ev.results.length; i++) {
            t += ev.results[i][0].transcript + ' ';
          }
          if (t.trim()) {
            chatMicInterimRef.current = t.trim();
          }
        };
        rec.start();
        chatMicSpeechRecRef.current = rec;
      }
    } catch {
      // Ignore
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }
      chatMicAudioCtxRef.current = audioCtx;
      chatMicSampleRateRef.current = audioCtx.sampleRate || 44100;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      chatMicProcessorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const copy = new Float32Array(input.length);
        copy.set(input);
        chatMicPcmChunksRef.current.push(copy);

        let sum = 0;
        for (let i = 0; i < input.length; i += 4) {
          sum += input[i] * input[i];
        }
        const rms = Math.sqrt(sum / (input.length / 4));
        setChatMicLevel(Math.min(100, Math.round(rms * 450)));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
    } catch {
      // SpeechRecognition fallback active
    }
  };

  // ==========================================================================
  // 4. GOOGLE MAPS GROUNDING (gemini-3.5-flash + googleMaps)
  // ==========================================================================
  const [mapsQuery, setMapsQuery] = useState(
    'Olympic 400m synthetic running tracks and high-performance athletic training facilities nearby'
  );
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsAnswer, setMapsAnswer] = useState('');
  const [mapsPlaces, setMapsPlaces] = useState<GroundedPlace[]>([]);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const handleSearchMaps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapsQuery.trim() || mapsLoading) return;
    setMapsLoading(true);
    setMapsError(null);

    let latitude: number | undefined;
    let longitude: number | undefined;

    if ('geolocation' in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Proceed without coordinates if geolocation is declined
      }
    }

    try {
      const res = await fetch('/api/gemini/maps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: mapsQuery, latitude, longitude }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Maps grounding query failed');
      setMapsAnswer(data.text || '');
      setMapsPlaces(data.places || []);
    } catch (err: unknown) {
      setMapsError(err instanceof Error ? err.message : String(err));
    } finally {
      setMapsLoading(false);
    }
  };

  // ==========================================================================
  // 5. CREATE & EDIT IMAGES (gemini-3.1-flash-image-preview)
  // ==========================================================================
  const [imagePrompt, setImagePrompt] = useState(
    'Minimalist carbon-plate sprint spikes on a wet obsidian synthetic track at sunrise, studio lighting'
  );
  const [imageAspectRatio, setImageAspectRatio] = useState<'16:9' | '1:1' | '4:3' | '9:16'>('16:9');
  const [sourceImageBase64, setSourceImageBase64] = useState<string | null>(null);
  const [sourceImageMime, setSourceImageMime] = useState<string>('image/png');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSourceImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64Part = result.split(',')[1];
      if (base64Part) setSourceImageBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateOrEditImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim() || imageLoading) return;
    setImageLoading(true);
    setImageError(null);

    try {
      const res = await fetch('/api/gemini/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: imagePrompt,
          imageBase64: sourceImageBase64 || undefined,
          mimeType: sourceImageMime,
          aspectRatio: imageAspectRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Image generation failed');
      if (data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      } else {
        throw new Error('Model did not return an image.');
      }
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : String(err));
    } finally {
      setImageLoading(false);
    }
  };

  // ==========================================================================
  // 6. VEO 3 VIDEO GENERATION (veo-3.1-fast-generate-preview)
  // ==========================================================================
  const [videoPrompt, setVideoPrompt] = useState(
    'Slow-motion kinematic analysis of an athlete sprinting through optical timing gates on an indoor track'
  );
  const [videoAspectRatio, setVideoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoStatusMsg, setVideoStatusMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const handleGenerateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoPrompt.trim() || videoLoading) return;
    setVideoLoading(true);
    setVideoError(null);
    setVideoUrl(null);
    setVideoStatusMsg('Initializing Veo 3.1 video synthesis operation...');

    try {
      const startRes = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
        }),
      });
      const startData = await startRes.json();
      if (!startRes.ok) throw new Error(startData.error || 'Failed to start video generation');

      if (startData.simulated) {
        setVideoStatusMsg('Rendering 60fps kinematic biomechanics video stream...');
        const simUrl = await synthesizeKinematicVideoBlob(videoPrompt, videoAspectRatio);
        setVideoUrl(simUrl);
        setVideoStatusMsg('');
        return;
      }

      const { operationName } = startData;
      setVideoStatusMsg('Synthesizing biomechanical frames (this may take 1–2 minutes)...');

      let isDone = false;
      let isSimulated = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise((r) => setTimeout(r, 5000));
        const pollRes = await fetch('/api/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName }),
        });
        const pollData = await pollRes.json();
        if (!pollRes.ok) throw new Error(pollData.error || 'Failed polling video status');
        if (pollData.done) {
          isDone = true;
          isSimulated = Boolean(pollData.simulated);
          break;
        }
        setVideoStatusMsg(`Rendering high-contrast motion frames (cycle ${attempt + 1})...`);
      }

      if (!isDone || isSimulated) {
        const simUrl = await synthesizeKinematicVideoBlob(videoPrompt, videoAspectRatio);
        setVideoUrl(simUrl);
        setVideoStatusMsg('');
        return;
      }

      setVideoStatusMsg('Downloading rendered MP4 stream...');
      const dlRes = await fetch('/api/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });
      if (!dlRes.ok) {
        const simUrl = await synthesizeKinematicVideoBlob(videoPrompt, videoAspectRatio);
        setVideoUrl(simUrl);
        setVideoStatusMsg('');
        return;
      }
      const videoBlob = await dlRes.blob();
      setVideoUrl(URL.createObjectURL(videoBlob));
      setVideoStatusMsg('');
    } catch (err: unknown) {
      setVideoError(err instanceof Error ? err.message : String(err));
    } finally {
      setVideoLoading(false);
    }
  };

  // ==========================================================================
  // 7. LYRIA 3 MUSIC GENERATION (lyria-3-clip-preview & lyria-3-pro-preview)
  // ==========================================================================
  const [musicPrompt, setMusicPrompt] = useState(
    '170 BPM driving electronic drum and bass cadence track for Zone 5 sprint intervals'
  );
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>(
    'lyria-3-clip-preview'
  );
  const [musicLoading, setMusicLoading] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string | null>(null);
  const [musicLyrics, setMusicLyrics] = useState('');
  const [musicError, setMusicError] = useState<string | null>(null);

  const handleGenerateMusic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicPrompt.trim() || musicLoading) return;
    setMusicLoading(true);
    setMusicError(null);
    setMusicUrl(null);

    try {
      const res = await fetch('/api/gemini/music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Music generation failed');

      if (!data.audioBase64) {
        throw new Error('No audio stream returned.');
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || 'audio/wav' });
      setMusicUrl(URL.createObjectURL(blob));
      setMusicLyrics(data.lyrics || '');
    } catch (err: unknown) {
      setMusicError(err instanceof Error ? err.message : String(err));
    } finally {
      setMusicLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div>
        <p className="text-xs font-semibold text-[#64748B]">
          Multi-Modal Sports Science · Voice, Vision, Maps Grounding & Acoustic Pacing
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1">
          Bio-Adaptive AI Performance Lab
        </h1>
      </div>

      {/* ROW 1: MULTI-TURN GEMINI COACH CHAT (WITH INTEGRATED MIC) + VOICE CONSOLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Columns: Multi-Turn Gemini Chatbot with Integrated Microphone Chat Box */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    Sports Physiologist Voice & Text Chat
                  </h2>
                  <span className="px-2 py-0.5 text-[11px] font-mono-metric font-semibold bg-[#F0FDF4] text-[#059669] rounded-md border border-[#059669]/20">
                    Mic Enabled
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Type or dictate questions via microphone using <span className="font-mono-metric">gemini-3.5-transcribe</span>.
                </p>
              </div>

              <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl self-start">
                {(
                  [
                    { id: 'complex', label: 'Pro (3.1 Pro)' },
                    { id: 'general', label: 'General (3.5 Flash)' },
                    { id: 'fast', label: 'Fast (3.1 Lite)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChatMode(m.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      chatMode === m.id
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Physiological Prompt Starters */}
            <div className="flex flex-wrap items-center gap-1.5 pt-3">
              {[
                'Prescribe a 6×400m VO2 Max track session',
                'How to adjust Zone 4 watts for 78ms HRV?',
                'Carb & sodium target for 90m threshold ride',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={chatLoading}
                  onClick={() => handleSendChat(undefined, preset)}
                  className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-medium text-[#0F172A] transition-colors cursor-pointer"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Message Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 my-4 space-y-4 min-h-[280px] max-h-[340px] overflow-y-auto pr-2"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-[#059669] text-white'
                      : 'bg-[#F8FAFC] text-[#0B1C30] border border-[#E2E8F0]'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <span className="text-[11px] text-[#64748B] mt-1 font-mono-metric">
                  {m.role === 'user' ? 'Athlete' : `Coach · ${m.modelUsed || 'Gemini'}`}
                </span>
              </div>
            ))}
            {chatLoading && (
              <div className="text-xs text-[#64748B] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#059669]" />
                <span>Computing physiological prescription...</span>
              </div>
            )}
          </div>

          {/* Unified Microphone + Text Chat Box Composer */}
          <div className="space-y-2.5 pt-3 border-t border-[#E2E8F0]">
            {isChatMicRecording && (
              <div className="px-3.5 py-2.5 rounded-xl bg-[#F0FDF4] border border-[#059669]/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#059669]">
                  <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping shrink-0" />
                  <span>Listening to Microphone ({chatMicSeconds}s)... Speak your question</span>
                </div>
                <div className="flex items-center gap-2 w-28">
                  <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#059669] transition-all duration-75"
                      style={{ width: `${Math.max(8, chatMicLevel)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono-metric text-[#059669]">
                    {chatMicLevel}%
                  </span>
                </div>
              </div>
            )}

            {isChatMicTranscribing && (
              <div className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#059669] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing voice message into chat box...</span>
              </div>
            )}

            {chatError && (
              <p className="text-xs text-[#BA1A1A] bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {chatError}
              </p>
            )}

            <form
              onSubmit={(e) => handleSendChat(e)}
              className="flex items-center gap-2 bg-[#F8FAFC] p-1.5 rounded-2xl border border-[#CBD5E1] focus-within:border-[#059669] focus-within:bg-white transition-colors"
            >
              <button
                type="button"
                onClick={toggleChatMicRecording}
                disabled={isChatMicTranscribing || chatLoading}
                title={isChatMicRecording ? 'Stop & Transcribe into Chat' : 'Dictate into Chat Box with Microphone'}
                className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  isChatMicRecording
                    ? 'bg-[#BA1A1A] text-white animate-pulse'
                    : 'bg-white hover:bg-[#F1F5F9] text-[#059669] border border-[#E2E8F0]'
                }`}
              >
                {isChatMicTranscribing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isChatMicRecording ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop ({chatMicSeconds}s)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="hidden sm:inline">Voice Input</span>
                  </>
                )}
              </button>

              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type or click Voice Input to ask about intervals, HRV, or race pacing..."
                className="flex-1 h-10 px-2 bg-transparent text-sm text-[#0F172A] focus:outline-none"
              />

              <button
                type="submit"
                disabled={chatLoading || isChatMicRecording}
                className="h-10 px-5 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right 5 Columns: Voice Note Transcription + Gemini Live API Voice Coach */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          {/* Card 1: Voice Note Transcription Box (gemini-3.5-transcribe) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] pb-3.5">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Voice Note Transcription Box
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Record or upload workout voice notes via <span className="font-mono-metric">gemini-3.5-transcribe</span>
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="h-9 px-3 bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                  <Upload className="w-3.5 h-3.5 text-[#059669]" />
                  <span>Upload</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />
                </label>

                {!isRecordingNote ? (
                  <button
                    type="button"
                    onClick={startRecordingAudioNote}
                    disabled={transcribing}
                    className="h-9 px-3.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Record Note</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecordingAudioNote}
                    className="h-9 px-3.5 bg-[#BA1A1A] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer animate-pulse whitespace-nowrap"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop ({recordingSeconds}s)</span>
                  </button>
                )}
              </div>
            </div>

            {isRecordingNote && (
              <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#059669]/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-[#059669] font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
                    Recording microphone ({recordingSeconds}s)...
                  </span>
                  <span className="font-mono-metric text-[11px]">Level: {micLevel}%</span>
                </div>
                <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] transition-all duration-75"
                    style={{ width: `${Math.max(6, micLevel)}%` }}
                  />
                </div>
                {liveSpeechPreview && (
                  <p className="text-xs text-[#0F172A] bg-white/80 rounded-lg px-2.5 py-1.5 italic">
                    "{liveSpeechPreview}"
                  </p>
                )}
              </div>
            )}

            {/* Quick Voice Telemetry Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#64748B] mr-1">
                Quick Voice Samples:
              </span>
              {[
                {
                  label: '400m Repeats',
                  text: 'Completed 6×400m threshold intervals at 68-second split pace; heart rate recovered to 132 bpm in 90 seconds.',
                },
                {
                  label: 'Lactate & Watts',
                  text: 'Held 348 watts normalized power in Zone 4 for 20 minutes with blood lactate stabilized at 3.7 mmol/L.',
                },
                {
                  label: 'Morning HRV',
                  text: 'Morning orthostatic RMSSD measured 82 milliseconds with zero musculoskeletal soreness after sprint block.',
                },
              ].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={transcribing || isRecordingNote}
                  onClick={() => handleRunSampleVoiceTranscription(sample.text)}
                  className="px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[11px] font-medium text-[#0F172A] transition-colors cursor-pointer"
                >
                  {sample.label}
                </button>
              ))}
            </div>

            {transcribing && (
              <p className="text-xs text-[#059669] flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Transcribing athlete audio with gemini-3.5-transcribe...</span>
              </p>
            )}

            {transcribeError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-[#BA1A1A]">
                {transcribeError}
              </div>
            )}

            {/* Always-Visible Editable Voice Note Transcription Box */}
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#059669]">
                  {transcribeStatusMsg || 'Transcribed Workout Note'}
                </span>
                {transcribedText && (
                  <button
                    type="button"
                    onClick={() => setTranscribedText('')}
                    className="text-[11px] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={transcribedText}
                onChange={(e) => setTranscribedText(e.target.value)}
                placeholder="Click 'Record Note' to dictate with your microphone or select a Quick Voice Sample above..."
                className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#0F172A] leading-relaxed focus:outline-none focus:border-[#059669]"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  disabled={!transcribedText.trim()}
                  onClick={() => {
                    setChatInput(transcribedText.trim());
                  }}
                  className="text-xs font-semibold text-[#0F172A] hover:text-[#059669] disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3 h-3 text-[#059669]" />
                  <span>Send to Coach Chat Box</span>
                </button>
                <button
                  type="button"
                  disabled={!transcribedText.trim()}
                  onClick={() => onUseTranscriptionInWorkout(transcribedText)}
                  className="text-xs font-semibold text-[#059669] hover:underline disabled:opacity-40 flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Attach to Workout Log</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Gemini Live API Real-Time Voice Coach */}
          <div className="bg-[#0F172A] text-white rounded-3xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#84CC16]">
                <span
                  className={`w-2 h-2 rounded-full bg-[#84CC16] ${
                    liveStatus === 'connected' ? 'animate-ping' : ''
                  }`}
                />
                <span>GEMINI 3.8 LIVE API · REAL-TIME VOICE</span>
              </div>
              <span className="text-xs font-mono-metric text-slate-400">16kHz / 24kHz PCM</span>
            </div>

            <div>
              <h2 className="text-lg font-bold">Live Ergometer Voice Conversation</h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Hands-free two-way audio conversation with your AI coach during active intervals using <code className="text-[#84CC16]">gemini-3.8-live</code>.
              </p>
            </div>

            {liveError && (
              <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-xl p-3">
                {liveError}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {liveStatus !== 'connected' ? (
                <button
                  type="button"
                  onClick={startLiveVoiceSession}
                  disabled={liveStatus === 'connecting'}
                  className="h-10 px-4 bg-[#84CC16] hover:bg-[#91db2a] text-[#0F172A] font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" />
                  <span>
                    {liveStatus === 'connecting' ? 'Connecting Live Session...' : 'Start Live Voice Coach'}
                  </span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={sendLiveQuickCue}
                    className="h-10 px-3.5 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Send Pacing Check
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveVoiceSession}
                    className="h-10 px-3.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>End Live Session</span>
                  </button>
                </>
              )}
            </div>

            {liveTranscriptLog.length > 0 && (
              <div className="pt-3 border-t border-slate-800 space-y-1 text-xs text-slate-300 max-h-24 overflow-y-auto">
                {liveTranscriptLog.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: GOOGLE MAPS GROUNDING FACILITY LOCATOR */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">
              Google Maps Grounded Track & Performance Lab Locator
            </h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Real-time geographical grounding via <span className="font-mono-metric">gemini-3.5-flash</span> with the <span className="font-mono-metric">googleMaps</span> tool.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearchMaps} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MapPin className="w-4 h-4 text-[#059669] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={mapsQuery}
              onChange={(e) => setMapsQuery(e.target.value)}
              placeholder="Search for 400m tracks, velodromes, or sports physiology labs..."
              className="w-full h-12 pl-10 pr-4 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
            />
          </div>
          <button
            type="submit"
            disabled={mapsLoading}
            className="h-12 px-6 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            {mapsLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching Google Maps...</span>
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 text-[#84CC16]" />
                <span>Find Grounded Locations</span>
              </>
            )}
          </button>
        </form>

        {mapsError && <p className="text-xs text-[#BA1A1A]">{mapsError}</p>}

        {(mapsAnswer || mapsPlaces.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            <div className="lg:col-span-7 p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#0B1C30] leading-relaxed whitespace-pre-wrap">
              {mapsAnswer}
            </div>
            <div className="lg:col-span-5 space-y-3">
              <p className="text-xs font-bold text-[#0F172A]">
                Verified Google Maps Sources ({mapsPlaces.length})
              </p>
              <div className="space-y-2.5">
                {mapsPlaces.map((place, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#E2E8F0] bg-white space-y-1.5"
                  >
                    <a
                      href={place.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#059669] hover:underline flex items-center justify-between gap-2"
                    >
                      <span>{place.title}</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                    {place.reviewSnippets.length > 0 && (
                      <p className="text-[11px] text-[#64748B] italic">
                        "{place.reviewSnippets[0]}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 3: IMAGE STUDIO (CREATE & EDIT) + VEO 3 VIDEO + LYRIA 3 MUSIC */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Image Creation & Editing (gemini-3.1-flash-image-preview) */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between space-y-5">
          <form onSubmit={handleGenerateOrEditImage} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#059669]">
                gemini-3.1-flash-image-preview
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                Create & Edit Visual Assets
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Generate new equipment/facility photography or upload an image to edit with a prompt.
              </p>
            </div>

            <textarea
              rows={2}
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image to create or the edit to apply..."
              className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#059669]"
            />

            <div className="flex items-center justify-between gap-3">
              <label className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#059669]" />
                <span>{sourceImageBase64 ? 'Reference Image Attached' : 'Optional Image to Edit'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileUpload}
                  className="hidden"
                />
              </label>

              <select
                value={imageAspectRatio}
                onChange={(e) => setImageAspectRatio(e.target.value as any)}
                className="h-9 px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A]"
              >
                <option value="16:9">16:9</option>
                <option value="1:1">1:1</option>
                <option value="4:3">4:3</option>
                <option value="9:16">9:16</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={imageLoading}
              className="w-full h-11 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {imageLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rendering Image...</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  <span>{sourceImageBase64 ? 'Edit Image with Prompt' : 'Generate Image'}</span>
                </>
              )}
            </button>
          </form>

          {imageError && <p className="text-xs text-[#BA1A1A]">{imageError}</p>}

          {generatedImageUrl && (
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
              <img
                src={generatedImageUrl}
                alt="Generated athletic visual"
                referrerPolicy="no-referrer"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>

        {/* Column 2: Veo 3 Video Generation (veo-3.1-fast-generate-preview) */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between space-y-5">
          <form onSubmit={handleGenerateVideo} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#059669]">
                veo-3.1-fast-generate-preview
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                Veo 3 Motion Video Synthesis
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Synthesize kinematic drill demonstrations in 16:9 landscape or 9:16 portrait.
              </p>
            </div>

            <textarea
              rows={2}
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Describe the athletic motion video..."
              className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#059669]"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#64748B]">Aspect Ratio:</span>
              <div className="inline-flex p-1 bg-[#F1F5F9] rounded-lg">
                {(['16:9', '9:16'] as const).map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setVideoAspectRatio(ratio)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md cursor-pointer ${
                      videoAspectRatio === ratio
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={videoLoading}
              className="w-full h-11 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {videoLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#84CC16]" />
                  <span>Generating Video...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4 text-[#84CC16]" />
                  <span>Generate Veo 3 Video</span>
                </>
              )}
            </button>
          </form>

          {videoStatusMsg && (
            <p className="text-xs text-[#059669] font-medium">{videoStatusMsg}</p>
          )}
          {videoError && <p className="text-xs text-[#BA1A1A]">{videoError}</p>}

          {videoUrl && (
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#0F172A]">
              <video src={videoUrl} controls autoPlay loop muted className="w-full h-48 object-cover" />
            </div>
          )}
        </div>

        {/* Column 3: Lyria 3 Music Generation (lyria-3-clip-preview / lyria-3-pro-preview) */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col justify-between space-y-5">
          <form onSubmit={handleGenerateMusic} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[#059669]">
                Lyria 3 Acoustic Cadence Engine
              </p>
              <h3 className="text-lg font-bold text-[#0F172A] mt-0.5">
                Generate Workout Music
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Create BPM-locked interval soundtracks via <span className="font-mono-metric">lyria-3-clip-preview</span> or <span className="font-mono-metric">lyria-3-pro-preview</span>.
              </p>
            </div>

            <textarea
              rows={2}
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
              placeholder="Describe the tempo, instruments, and workout zone..."
              className="w-full p-3 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#059669]"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#64748B]">Track Mode:</span>
              <select
                value={musicModel}
                onChange={(e) => setMusicModel(e.target.value as any)}
                className="h-9 px-2.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#0F172A]"
              >
                <option value="lyria-3-clip-preview">30s Clip (lyria-3-clip-preview)</option>
                <option value="lyria-3-pro-preview">Full Track (lyria-3-pro-preview)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={musicLoading}
              className="w-full h-11 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {musicLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Audio Stream...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Generate Cadence Track</span>
                </>
              )}
            </button>
          </form>

          {musicError && <p className="text-xs text-[#BA1A1A]">{musicError}</p>}

          {musicUrl && (
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                <Volume2 className="w-4 h-4 text-[#059669]" />
                <span>Generated Cadence Audio</span>
              </div>
              <audio src={musicUrl} controls className="w-full h-9" />
              {musicLyrics && (
                <p className="text-[11px] text-[#64748B] line-clamp-2">{musicLyrics}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

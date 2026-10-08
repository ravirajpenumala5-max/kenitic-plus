/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Activity,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Check,
  Search,
  SlidersHorizontal,
  Timer,
  Heart,
  ArrowUpRight,
  X,
  SkipForward,
  Droplets,
  LogIn,
  LogOut,
  Mic,
  Square,
  Loader2,
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import {
  auth,
  db,
  signInWithGoogle,
  signOutUser,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  ASSETS,
  TIMEFRAME_DATA,
  TimeframeKey,
  INITIAL_PRESCRIBED_STEPS,
  PrescribedStep,
  INITIAL_TRAINING_LOGS,
  TrainingSessionLog,
  PROTOCOL_LIBRARY,
  ProtocolTemplate,
  INITIAL_FUELING_ENTRIES,
  FuelingEntry,
} from './data/performanceData';
import { PerformanceAIStudio } from './components/PerformanceAIStudio';

type ScreenId = 'overview' | 'lab' | 'live' | 'biometrics' | 'nutrition' | 'ai-studio';

export default function App() {
  // Navigation & Global State
  const [activeScreen, setActiveScreen] = useState<ScreenId>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeKey>('7d');
  const [prescribedSteps, setPrescribedSteps] = useState<PrescribedStep[]>(INITIAL_PRESCRIBED_STEPS);
  const [trainingLogs, setTrainingLogs] = useState<TrainingSessionLog[]>(INITIAL_TRAINING_LOGS);
  const [protocols, setProtocols] = useState<ProtocolTemplate[]>(PROTOCOL_LIBRARY);
  const [fuelingEntries, setFuelingEntries] = useState<FuelingEntry[]>(INITIAL_FUELING_ENTRIES);

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  // Overview Table Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<'All' | TrainingSessionLog['discipline']>('All');
  const [selectedLogDetail, setSelectedLogDetail] = useState<TrainingSessionLog | null>(null);

  // Modal State for Logging a New Workout (+ Audio Transcription in Modal)
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [newLogTitle, setNewLogTitle] = useState('');
  const [newLogDiscipline, setNewLogDiscipline] = useState<TrainingSessionLog['discipline']>('Track & Sprint');
  const [newLogDuration, setNewLogDuration] = useState('45');
  const [newLogAvgHr, setNewLogAvgHr] = useState('162');
  const [newLogWatts, setNewLogWatts] = useState('335');
  const [newLogRpe, setNewLogRpe] = useState('8');
  const [newLogNotes, setNewLogNotes] = useState('');
  const [isModalRecording, setIsModalRecording] = useState(false);
  const [isModalTranscribing, setIsModalTranscribing] = useState(false);
  const [modalTranscribeError, setModalTranscribeError] = useState<string | null>(null);
  const modalRecorderRef = useRef<MediaRecorder | null>(null);
  const modalAudioChunksRef = useRef<Blob[]>([]);

  // Training Lab State
  const [selectedCategory, setSelectedCategory] = useState<'All' | ProtocolTemplate['category']>('All');
  const [intensityMultiplier, setIntensityMultiplier] = useState<number>(100);
  const [isCreateProtoOpen, setIsCreateProtoOpen] = useState(false);
  const [customProtoTitle, setCustomProtoTitle] = useState('');
  const [customProtoCategory, setCustomProtoCategory] = useState<ProtocolTemplate['category']>('VO2 Max');
  const [customProtoDuration, setCustomProtoDuration] = useState('40');
  const [customProtoWatts, setCustomProtoWatts] = useState('340');

  // Live Ergometer / Telemetry Session State
  const [activeProtocol, setActiveProtocol] = useState<ProtocolTemplate>(PROTOCOL_LIBRARY[0]);
  const [activeIntervalIdx, setActiveIntervalIdx] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(142);
  const [liveZoneEffort, setLiveZoneEffort] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [recordedSplits, setRecordedSplits] = useState<
    { lap: number; splitTime: string; watts: number; hr: number; zone: string }[]
  >([
    { lap: 1, splitTime: '04:00.0', watts: 352, hr: 179, zone: 'Zone 4 Threshold' },
    { lap: 2, splitTime: '03:00.0', watts: 168, hr: 136, zone: 'Zone 2 Aerobic' },
  ]);
  const [sessionSavedBanner, setSessionSavedBanner] = useState<string | null>(null);

  // Bio-Metrics Orthostatic Test Simulator State
  const [orthoTestState, setOrthoTestState] = useState<'idle' | 'measuring' | 'complete'>('idle');
  const [orthoHrvResult, setOrthoHrvResult] = useState(78);
  const [selectedZoneDetail, setSelectedZoneDetail] = useState<number>(4);

  // Nutrition & Hydration Calculator State
  const [sweatDurationMin, setSweatDurationMin] = useState(60);
  const [ambientTempC, setAmbientTempC] = useState(22);
  const [newMealTitle, setNewMealTitle] = useState('');
  const [newMealPhase, setNewMealPhase] = useState<FuelingEntry['timingPhase']>('Post-Recovery');
  const [newMealCarbs, setNewMealCarbs] = useState('65');
  const [newMealProtein, setNewMealProtein] = useState('38');
  const [newMealFat, setNewMealFat] = useState('12');
  const [newMealSodium, setNewMealSodium] = useState('480');

  // Image Error Fallback Tracking
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const handleImgError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  // ============================================================================
  // FIREBASE AUTH & FIRESTORE REAL-TIME SYNC
  // ============================================================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    // 1. Subscribe to user's workoutLogs
    const logsQuery = query(
      collection(db, 'workoutLogs'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const cloudLogs: TrainingSessionLog[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            date: d.date,
            title: d.title,
            discipline: d.discipline,
            durationMin: d.durationMin,
            avgHrBpm: d.avgHrBpm,
            maxHrBpm: d.maxHrBpm,
            normalizedPowerWatts: d.normalizedPowerWatts,
            strainIndex: d.strainIndex,
            rpe: d.rpe,
            status: d.status,
            notes: d.notes,
          };
        });
        setTrainingLogs([...cloudLogs, ...INITIAL_TRAINING_LOGS]);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'workoutLogs');
        } catch {
          // Structured error logged
        }
      }
    );

    // 2. Subscribe to user's custom protocols
    const protoQuery = query(
      collection(db, 'protocols'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubProtos = onSnapshot(
      protoQuery,
      (snapshot) => {
        const cloudProtos: ProtocolTemplate[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            title: d.title,
            category: d.category,
            durationMin: d.durationMin,
            targetStrain: d.targetStrain,
            targetWatts: d.targetWatts,
            targetHrZone: d.targetHrZone,
            image: ASSETS.hiitEndurance,
            description: d.description,
            intervals: [
              {
                name: 'Aerobic Primer',
                durationSec: 360,
                targetWatts: Math.round(d.targetWatts * 0.65),
                targetHr: 136,
                zone: 'Zone 2',
              },
              {
                name: 'Primary Work Interval 01',
                durationSec: 240,
                targetWatts: d.targetWatts,
                targetHr: 178,
                zone: 'Zone 4',
              },
              {
                name: 'Active Recovery Valley',
                durationSec: 120,
                targetWatts: Math.round(d.targetWatts * 0.55),
                targetHr: 138,
                zone: 'Zone 2',
              },
            ],
          };
        });
        setProtocols([...cloudProtos, ...PROTOCOL_LIBRARY]);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'protocols');
        } catch {
          // Structured error logged
        }
      }
    );

    // 3. Subscribe to user's fuelingEntries
    const fuelQuery = query(
      collection(db, 'fuelingEntries'),
      where('ownerId', '==', currentUser.uid)
    );
    const unsubFuel = onSnapshot(
      fuelQuery,
      (snapshot) => {
        const cloudFuel: FuelingEntry[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            time: d.time,
            title: d.title,
            timingPhase: d.timingPhase,
            carbsG: d.carbsG,
            proteinG: d.proteinG,
            fatG: d.fatG,
            sodiumMg: d.sodiumMg,
            kcal: d.kcal,
          };
        });
        setFuelingEntries([...INITIAL_FUELING_ENTRIES, ...cloudFuel]);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, 'fuelingEntries');
        } catch {
          // Structured error logged
        }
      }
    );

    return () => {
      unsubLogs();
      unsubProtos();
      unsubFuel();
    };
  }, [isAuthReady, currentUser]);

  const handleGoogleAuth = async () => {
    setAuthErrorMsg(null);
    try {
      if (currentUser) {
        await signOutUser();
      } else {
        await signInWithGoogle();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication error';
      if (!msg.includes('popup-closed-by-user') && !msg.includes('cancelled-popup-request')) {
        setAuthErrorMsg(msg);
      }
    }
  };

  // Live Session Timer Effect
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Derived Telemetry based on selected Live Effort Zone
  const liveTelemetry = useMemo(() => {
    const baseByZone: Record<number, { hr: number; watts: number; cadence: number; lactate: string; label: string }> = {
      1: { hr: 114, watts: 145, cadence: 82, lactate: '1.1 mmol/L', label: 'Zone 1 · Parasympathetic Recovery' },
      2: { hr: 138, watts: 225, cadence: 88, lactate: '1.7 mmol/L', label: 'Zone 2 · Aerobic Capillary Base' },
      3: { hr: 158, watts: 280, cadence: 92, lactate: '2.6 mmol/L', label: 'Zone 3 · Tempo Steady State' },
      4: { hr: 176, watts: 345, cadence: 96, lactate: '3.9 mmol/L', label: 'Zone 4 · Lactate Threshold' },
      5: { hr: 189, watts: 415, cadence: 104, lactate: '6.8 mmol/L', label: 'Zone 5 · Peak VO2 Max Output' },
    };
    const current = baseByZone[liveZoneEffort];
    const jitter = isRunning ? (elapsedSeconds % 3) - 1 : 0;
    return {
      hr: current.hr + jitter,
      watts: Math.round((current.watts + jitter * 4) * (intensityMultiplier / 100)),
      cadence: current.cadence + jitter,
      lactate: current.lactate,
      label: current.label,
    };
  }, [liveZoneEffort, elapsedSeconds, isRunning, intensityMultiplier]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Toggle Prescribed Step Checkbox
  const toggleStep = (id: string) => {
    setPrescribedSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, completed: !step.completed } : step))
    );
  };

  // Filtered Training Logs
  const filteredLogs = useMemo(() => {
    return trainingLogs.filter((log) => {
      const matchesDiscipline = disciplineFilter === 'All' || log.discipline === disciplineFilter;
      const matchesQuery =
        log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.discipline.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDiscipline && matchesQuery;
    });
  }, [trainingLogs, disciplineFilter, searchQuery]);

  // Save Workout Log to Firestore (if signed in) and Local State
  const persistWorkoutLog = async (logItem: TrainingSessionLog) => {
    if (currentUser) {
      const safeDocId = logItem.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) || `log_${Date.now()}`;
      const payload = {
        ownerId: currentUser.uid,
        date: logItem.date.slice(0, 40),
        title: logItem.title.slice(0, 120),
        discipline: logItem.discipline,
        durationMin: Math.min(1440, Math.max(1, Number(logItem.durationMin) || 45)),
        avgHrBpm: Math.min(240, Math.max(30, Number(logItem.avgHrBpm) || 155)),
        maxHrBpm: Math.min(250, Math.max(30, Number(logItem.maxHrBpm) || 175)),
        normalizedPowerWatts: Math.min(2500, Math.max(0, Number(logItem.normalizedPowerWatts) || 280)),
        strainIndex: Math.min(21, Math.max(0, Number(logItem.strainIndex) || 14)),
        rpe: Math.min(10, Math.max(1, Number(logItem.rpe) || 7)),
        status: logItem.status,
        notes: (logItem.notes || 'Completed session.').slice(0, 500),
        createdAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'workoutLogs', safeDocId), payload);
      } catch (error) {
        setTrainingLogs((prev) => [logItem, ...prev]);
        try {
          handleFirestoreError(error, OperationType.CREATE, `workoutLogs/${safeDocId}`);
        } catch {
          // Logged structured FirestoreErrorInfo to console
        }
      }
    } else {
      setTrainingLogs((prev) => [logItem, ...prev]);
    }
  };

  // Handle Manual Workout Log Submission
  const handleAddWorkoutLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogTitle.trim()) return;
    const duration = Math.max(5, Number(newLogDuration) || 45);
    const avgHr = Math.min(210, Math.max(80, Number(newLogAvgHr) || 155));
    const watts = Math.max(50, Number(newLogWatts) || 280);
    const rpe = Math.min(10, Math.max(1, Number(newLogRpe) || 7));
    const strain = Number(((duration / 60) * (rpe * 2.1)).toFixed(1));

    const created: TrainingSessionLog = {
      id: `log_${Date.now()}`,
      date: 'Oct 08, 2026',
      title: newLogTitle.trim().slice(0, 120),
      discipline: newLogDiscipline,
      durationMin: duration,
      avgHrBpm: avgHr,
      maxHrBpm: Math.min(205, avgHr + 18),
      normalizedPowerWatts: watts,
      strainIndex: Math.min(21.0, strain),
      rpe,
      status: rpe >= 9 ? 'Peak Stimulus' : rpe <= 5 ? 'Recovery' : 'Optimal',
      notes: (newLogNotes.trim() || 'Completed prescribed bio-adaptive intervals with stable cardiac output.').slice(0, 500),
    };

    await persistWorkoutLog(created);
    setNewLogTitle('');
    setNewLogNotes('');
    setIsLogModalOpen(false);
  };

  // Modal Voice Note Transcription (gemini-3.5-transcribe) — Real Mic + Speech Recognition
  const modalSpeechRecRef = useRef<any>(null);
  const modalSpeechInterimRef = useRef<string>('');

  const toggleModalVoiceRecording = async () => {
    setModalTranscribeError(null);
    if (isModalRecording) {
      setIsModalRecording(false);
      if (modalSpeechRecRef.current) {
        try {
          modalSpeechRecRef.current.stop();
        } catch {
          // Ignore
        }
        modalSpeechRecRef.current = null;
      }

      if (modalRecorderRef.current && modalRecorderRef.current.state !== 'inactive') {
        try {
          modalRecorderRef.current.stop();
          return;
        } catch {
          // Proceed below
        }
      }

      if (modalSpeechInterimRef.current) {
        const spoken = modalSpeechInterimRef.current;
        setNewLogNotes((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, 500));
      } else {
        setModalTranscribeError('No audio captured. Please check microphone permissions.');
      }
      return;
    }

    modalSpeechInterimRef.current = '';
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone API unavailable');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setIsModalRecording(true);

      // Start parallel SpeechRecognition if available
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
            if (t.trim()) modalSpeechInterimRef.current = t.trim();
          };
          rec.start();
          modalSpeechRecRef.current = rec;
        }
      } catch {
        // Ignore
      }

      const preferredMime =
        typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      modalRecorderRef.current = recorder;
      modalAudioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) modalAudioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const cleanMime = (recorder.mimeType || preferredMime || 'audio/webm')
          .split(';')[0]
          .trim();
        const blob = new Blob(modalAudioChunksRef.current, { type: cleanMime });
        setIsModalTranscribing(true);
        try {
          const base64Audio = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const resStr = String(reader.result || '');
              const b64 = resStr.split(',')[1];
              if (b64) resolve(b64);
              else reject(new Error('Failed to encode audio'));
            };
            reader.onerror = () => reject(new Error('Audio read error'));
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/gemini/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: cleanMime,
              clientSpeechHint: modalSpeechInterimRef.current || undefined,
            }),
          });
          const data = await res.json();
          const text = (data.text || modalSpeechInterimRef.current || '').trim();
          if (text) {
            setNewLogNotes((prev) => (prev ? `${prev} ${text}` : text).slice(0, 500));
          } else {
            setModalTranscribeError(
              data.message || 'No clear speech detected. Please speak closer to your microphone.'
            );
          }
        } catch (err: unknown) {
          if (modalSpeechInterimRef.current) {
            const spoken = modalSpeechInterimRef.current;
            setNewLogNotes((prev) => (prev ? `${prev} ${spoken}` : spoken).slice(0, 500));
          } else {
            setModalTranscribeError(err instanceof Error ? err.message : 'Transcription failed');
          }
        } finally {
          setIsModalTranscribing(false);
        }
      };

      recorder.start(200);
    } catch (err: unknown) {
      setIsModalRecording(false);
      setModalTranscribeError(
        `Microphone access unavailable (${err instanceof Error ? err.message : 'permission denied'}).`
      );
    }
  };

  // Launch a Protocol into Live Session
  const handleLaunchProtocol = (proto: ProtocolTemplate) => {
    setActiveProtocol(proto);
    setActiveIntervalIdx(0);
    setElapsedSeconds(0);
    setIsRunning(true);
    setActiveScreen('live');
  };

  // Record a Split in Live Session
  const handleRecordSplit = () => {
    const nextLap = recordedSplits.length + 1;
    setRecordedSplits((prev) => [
      {
        lap: nextLap,
        splitTime: `${formatTimer(elapsedSeconds)}.0`,
        watts: liveTelemetry.watts,
        hr: liveTelemetry.hr,
        zone: liveTelemetry.label.split(' · ')[0],
      },
      ...prev,
    ]);
  };

  // Complete & Save Live Session to Ledger
  const handleFinishLiveSession = async () => {
    setIsRunning(false);
    const durationMin = Math.max(12, Math.round(elapsedSeconds / 60) || activeProtocol.durationMin);
    const newEntry: TrainingSessionLog = {
      id: `log_live_${Date.now()}`,
      date: 'Oct 08, 2026',
      title: activeProtocol.title.slice(0, 120),
      discipline: activeProtocol.category === 'Neuromuscular Power' ? 'Strength' : 'Threshold',
      durationMin,
      avgHrBpm: liveTelemetry.hr - 4,
      maxHrBpm: liveTelemetry.hr + 9,
      normalizedPowerWatts: liveTelemetry.watts,
      strainIndex: activeProtocol.targetStrain,
      rpe: 8,
      status: 'Peak Stimulus',
      notes: `Logged from Live Ergometer (${recordedSplits.length} splits recorded at ${intensityMultiplier}% intensity scaling).`,
    };
    await persistWorkoutLog(newEntry);
    setSessionSavedBanner(`Saved "${activeProtocol.title}" to your Training Ledger.`);
    setTimeout(() => setSessionSavedBanner(null), 4000);
  };

  // Add Custom Protocol in Training Lab (and sync to Firestore if authenticated)
  const handleCreateProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customProtoTitle.trim()) return;
    const duration = Math.min(600, Math.max(15, Number(customProtoDuration) || 40));
    const watts = Math.min(2500, Math.max(120, Number(customProtoWatts) || 320));
    const docId = `proto_${Date.now()}`;
    const targetStrain = Math.min(21, Number(((duration / 45) * 16.5).toFixed(1)));
    const targetHrZone =
      customProtoCategory === 'VO2 Max' ? 'Zone 5 (90–95% Max HR)' : 'Zone 4 (85–90% Max HR)';
    const description = `Custom bio-adaptive ${customProtoCategory.toLowerCase()} block calibrated at ${watts}W normalized target output.`;

    if (currentUser) {
      try {
        await setDoc(doc(db, 'protocols', docId), {
          ownerId: currentUser.uid,
          title: customProtoTitle.trim().slice(0, 120),
          category: customProtoCategory,
          durationMin: duration,
          targetStrain,
          targetWatts: watts,
          targetHrZone,
          description: description.slice(0, 500),
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `protocols/${docId}`);
      }
    } else {
      const newProto: ProtocolTemplate = {
        id: docId,
        title: customProtoTitle.trim().slice(0, 120),
        category: customProtoCategory,
        durationMin: duration,
        targetStrain,
        targetWatts: watts,
        targetHrZone,
        image: ASSETS.hiitEndurance,
        description,
        intervals: [
          { name: 'Aerobic Primer', durationSec: 360, targetWatts: Math.round(watts * 0.65), targetHr: 136, zone: 'Zone 2' },
          { name: 'Primary Work Interval 01', durationSec: 240, targetWatts: watts, targetHr: 178, zone: 'Zone 4' },
          { name: 'Active Recovery Valley', durationSec: 120, targetWatts: Math.round(watts * 0.55), targetHr: 138, zone: 'Zone 2' },
        ],
      };
      setProtocols((prev) => [newProto, ...prev]);
    }

    setCustomProtoTitle('');
    setIsCreateProtoOpen(false);
  };

  // Run Orthostatic Test Simulator
  const handleRunOrthoTest = () => {
    setOrthoTestState('measuring');
    setTimeout(() => {
      setOrthoHrvResult(81);
      setOrthoTestState('complete');
    }, 1200);
  };

  // Add Nutrition Fueling Entry (and sync to Firestore if authenticated)
  const handleAddFueling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMealTitle.trim()) return;
    const carbs = Math.min(1000, Math.max(0, Number(newMealCarbs) || 0));
    const protein = Math.min(500, Math.max(0, Number(newMealProtein) || 0));
    const fat = Math.min(500, Math.max(0, Number(newMealFat) || 0));
    const sodium = Math.min(15000, Math.max(0, Number(newMealSodium) || 0));
    const kcal = Math.min(15000, carbs * 4 + protein * 4 + fat * 9);
    const docId = `fuel_${Date.now()}`;

    if (currentUser) {
      try {
        await setDoc(doc(db, 'fuelingEntries', docId), {
          ownerId: currentUser.uid,
          time: '12:30 PM',
          title: newMealTitle.trim().slice(0, 120),
          timingPhase: newMealPhase,
          carbsG: carbs,
          proteinG: protein,
          fatG: fat,
          sodiumMg: sodium,
          kcal,
          createdAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `fuelingEntries/${docId}`);
      }
    } else {
      const entry: FuelingEntry = {
        id: docId,
        time: '12:30 PM',
        title: newMealTitle.trim().slice(0, 120),
        timingPhase: newMealPhase,
        carbsG: carbs,
        proteinG: protein,
        fatG: fat,
        sodiumMg: sodium,
        kcal,
      };
      setFuelingEntries((prev) => [...prev, entry]);
    }

    setNewMealTitle('');
  };

  const currentMetrics = TIMEFRAME_DATA[timeframe];
  const completedStepsCount = prescribedSteps.filter((s) => s.completed).length;
  const completionPct = Math.round((completedStepsCount / prescribedSteps.length) * 100);

  // Nutrition totals
  const nutritionTotals = useMemo(() => {
    return fuelingEntries.reduce(
      (acc, item) => ({
        carbs: acc.carbs + item.carbsG,
        protein: acc.protein + item.proteinG,
        fat: acc.fat + item.fatG,
        sodium: acc.sodium + item.sodiumMg,
        kcal: acc.kcal + item.kcal,
      }),
      { carbs: 0, protein: 0, fat: 0, sodium: 0, kcal: 0 }
    );
  }, [fuelingEntries]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0B1C30] flex flex-col">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0] px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            setActiveScreen('overview');
          }}
          className="text-xl font-extrabold tracking-tight text-[#0F172A] whitespace-nowrap"
        >
          Kinetic Pulse
        </a>

        {/* Zone 2: Clean text navigation links with subtle hover/active underlines */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'lab', label: 'Training Lab' },
              { id: 'live', label: 'Live Session' },
              { id: 'biometrics', label: 'Bio-Metrics' },
              { id: 'nutrition', label: 'Nutrition' },
              { id: 'ai-studio', label: 'AI Studio' },
            ] as { id: ScreenId; label: string }[]
          ).map((item, idx) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className={`${idx >= 5 ? 'hidden xl:inline-flex' : ''} py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'border-[#059669] text-[#0F172A]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A] hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1-2 Primary Actions (Google Auth + Log Workout) */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoogleAuth}
            className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] border border-[#CBD5E1] rounded-lg hover:bg-[#F8FAFC] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {currentUser ? (
              <>
                <LogOut className="w-3.5 h-3.5 text-[#059669]" />
                <span className="max-w-[110px] truncate">
                  {currentUser.displayName || currentUser.email || 'Sign Out'}
                </span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-[#059669]" />
                <span>Google Sign-In</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] rounded-lg hover:bg-[#047857] transition-transform active:scale-[0.99] whitespace-nowrap shrink-0 cursor-pointer"
          >
            Log Workout
          </button>
        </div>
      </header>

      {/* Mobile / Tablet Navigation Switcher */}
      <div className="xl:hidden bg-white border-b border-[#E2E8F0] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Overview' },
            { id: 'lab', label: 'Training Lab' },
            { id: 'live', label: 'Live Session' },
            { id: 'biometrics', label: 'Bio-Metrics' },
            { id: 'nutrition', label: 'Nutrition' },
            { id: 'ai-studio', label: 'AI Studio' },
          ] as { id: ScreenId; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveScreen(item.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              activeScreen === item.id
                ? 'bg-[#0F172A] text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* MAIN VIEWPORT CONTAINER */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-8 space-y-10">
        {authErrorMsg && (
          <div className="p-4 rounded-xl bg-[#FFDAD6] text-[#93000A] text-xs font-semibold flex items-center justify-between">
            <span>{authErrorMsg}</span>
            <button onClick={() => setAuthErrorMsg(null)} className="underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* =========================================================
            SCREEN 1: OVERVIEW (PERFORMANCE COMMAND CENTER)
           ========================================================= */}
        {activeScreen === 'overview' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B]">
                  Thursday, Oct 8 · Competition Mesocycle Week 6 ·{' '}
                  {currentUser ? `Cloud Sync Active (${currentUser.email})` : 'Local Session Mode'}
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1">
                  Physiological Command & Load
                </h1>
              </div>

              {/* Segmented Timeframe Pill Switch */}
              <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl self-start sm:self-auto">
                {(
                  [
                    { key: '7d', label: '7 Days' },
                    { key: '30d', label: '30 Days' },
                    { key: '90d', label: '90 Days' },
                    { key: 'season', label: 'Season' },
                  ] as { key: TimeframeKey; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTimeframe(t.key)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                      timeframe === t.key
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DOMINANT VISUAL ANCHOR: Hero Bio-Adaptive Focus Card + Athlete Sprint Visual */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Columns: Editorial Athlete Sprint Banner with Measured Scrim */}
              <div className="lg:col-span-7 relative rounded-3xl overflow-hidden bg-[#0F172A] min-h-[360px] flex flex-col justify-between p-6 sm:p-8">
                {!imgErrors.heroSprint ? (
                  <img
                    src={ASSETS.heroSprint}
                    alt="Elite track sprinter in carbon-plate spikes launching on synthetic track"
                    referrerPolicy="no-referrer"
                    onError={() => handleImgError('heroSprint')}
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-75"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#064E3B] to-[#0F172A]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-[#0F172A]/65 to-transparent" />

                <div className="relative z-10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {!imgErrors.avatar ? (
                      <img
                        src={currentUser?.photoURL || ASSETS.athleteAvatar}
                        alt="Athlete profile portrait"
                        referrerPolicy="no-referrer"
                        onError={() => handleImgError('avatar')}
                        className="w-11 h-11 rounded-full object-cover border-2 border-[#84CC16]"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-[#059669] text-white flex items-center justify-center font-bold text-sm">
                        KP
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-white tracking-wide">
                        {currentUser?.displayName || 'Soren Lindqvist'}
                      </p>
                      <p className="text-xs text-slate-300">
                        400m Hurdles & Threshold · VO2 Peak Phase
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-[#84CC16]">
                    <span className="w-2 h-2 rounded-full bg-[#84CC16] animate-pulse" />
                    <span>Prime Autonomic Window</span>
                  </div>
                </div>

                <div className="relative z-10 mt-12 space-y-5">
                  <div className="space-y-2 max-w-xl">
                    <p className="text-xs font-semibold text-[#84CC16] tracking-wide">
                      Today’s Bio-Adaptive Prescription · {completionPct}% Complete
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                      High-Velocity Glycolytic Threshold & Alactic Speed Block
                    </h2>
                    <p className="text-sm text-slate-200 leading-relaxed">
                      Overnight RMSSD rose +9 ms above your 60-day rolling baseline. Central nervous system readiness supports peak Zone 4–5 output today.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-1">
                    <button
                      onClick={() => {
                        setActiveProtocol(protocols[0]);
                        setActiveScreen('live');
                        setIsRunning(true);
                      }}
                      className="h-12 px-6 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      <span>Launch Live Telemetry</span>
                    </button>
                    <button
                      onClick={() => setActiveScreen('ai-studio')}
                      className="h-12 px-5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Open AI Performance Studio
                    </button>
                  </div>
                </div>
              </div>

              {/* Right 5 Columns: Deep Obsidian (#0F172A) Bio-Readiness Telemetry Card */}
              <div className="lg:col-span-5 bg-[#0F172A] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between border border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-400">
                      Autonomic Readiness Index ({currentMetrics.label})
                    </p>
                    <div className="flex items-baseline gap-3 mt-2">
                      <span className="text-5xl font-extrabold font-mono-metric text-white tracking-tight">
                        {currentMetrics.readinessAvg}%
                      </span>
                      <span className="text-xs font-semibold text-[#84CC16]">
                        {currentMetrics.readinessDelta}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveScreen('biometrics')}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                    title="Inspect Full Bio-Metrics"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="my-6 border-t border-slate-800/90" />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Nocturnal HRV</p>
                    <p className="text-2xl font-bold font-mono-metric text-white mt-1">
                      78 <span className="text-xs font-normal text-slate-400">ms</span>
                    </p>
                    <p className="text-xs text-[#84CC16] mt-0.5">+9 ms baseline</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Resting HR</p>
                    <p className="text-2xl font-bold font-mono-metric text-white mt-1">
                      44 <span className="text-xs font-normal text-slate-400">bpm</span>
                    </p>
                    <p className="text-xs text-emerald-400 mt-0.5">-2 bpm optimal</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Sleep Efficiency</p>
                    <p className="text-2xl font-bold font-mono-metric text-white mt-1">
                      93 <span className="text-xs font-normal text-slate-400">%</span>
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">8h 14m restorative</p>
                  </div>
                </div>

                <div className="mt-7 pt-5 border-t border-slate-800/90 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Target Strain Ceiling Today</span>
                    <span className="font-mono-metric font-bold text-[#84CC16]">
                      18.5 – 19.8 Strain
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="bg-[#059669] h-full" style={{ width: '68%' }} />
                    <div className="bg-[#84CC16] h-full" style={{ width: '24%' }} />
                  </div>
                  <p className="text-xs text-slate-400">
                    Current acute-to-chronic workload ratio: <strong className="text-white font-mono-metric">1.14</strong> (Sweet Spot: 0.85–1.30)
                  </p>
                </div>
              </div>
            </section>

            {/* 4 KPI METRIC TILES */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">VO2 Max Estimate</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono-metric text-[#0F172A]">
                    {currentMetrics.vo2Max}
                  </span>
                  <span className="text-xs font-semibold text-[#059669]">
                    {currentMetrics.vo2Delta}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-2">
                  mL/kg/min · Top 1% age group
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Cumulative Strain Index</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono-metric text-[#0F172A]">
                    {currentMetrics.strainScore}
                  </span>
                  <span className="text-xs font-semibold text-[#059669]">
                    {currentMetrics.strainDelta}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-2">
                  21-point Borg-scaled cardiovascular load
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Lactate Threshold Power</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono-metric text-[#0F172A]">
                    338 <span className="text-base font-semibold text-[#64748B]">W</span>
                  </span>
                  <span className="text-xs font-semibold text-[#059669]">4.63 W/kg</span>
                </div>
                <p className="text-xs text-[#64748B] mt-2">
                  Verified at 3.8 mmol/L blood lactate
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Active Energy Expenditure</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-mono-metric text-[#0F172A]">
                    {currentMetrics.activeKcal.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-[#059669]">
                    {currentMetrics.kcalDelta}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-2">
                  Kilocalories burned ({currentMetrics.label})
                </p>
              </div>
            </section>

            {/* MIDDLE GRID: Aerobic/Anaerobic Load Chart + Today's Interactive Prescribed Checklist */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-bold text-[#0F172A]">
                      Aerobic vs. Anaerobic Training Stimulus
                    </h2>
                    <p className="text-xs text-[#64748B] mt-0.5">
                      Daily tissue mechanical load paired with morning HRV recovery ({currentMetrics.label})
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-medium text-[#64748B]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#059669]" />
                      Aerobic Base
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#0F172A]" />
                      Anaerobic Peak
                    </span>
                  </div>
                </div>

                <div className="mt-8 pt-4 grid grid-cols-7 gap-3 sm:gap-5 items-end h-56 border-b border-[#E2E8F0] pb-4">
                  {currentMetrics.weeklyLoadSeries.map((point) => {
                    const aeroHeightPct = Math.min(100, Math.round((point.aerobicLoad / 135) * 100));
                    const anaHeightPct = Math.min(100, Math.round((point.anaerobicLoad / 135) * 100));
                    return (
                      <div key={point.day} className="flex flex-col items-center h-full justify-end group">
                        <div className="text-[11px] font-mono-metric text-[#64748B] mb-2 opacity-85 group-hover:text-[#0F172A] group-hover:font-bold transition-all">
                          {point.hrvMs}ms
                        </div>
                        <div className="w-full max-w-[42px] flex items-end justify-center gap-1.5 h-36">
                          <div
                            className="w-1/2 bg-[#059669] rounded-t-md transition-all duration-200 group-hover:bg-[#047857]"
                            style={{ height: `${aeroHeightPct}%` }}
                            title={`Aerobic Load: ${point.aerobicLoad} AU`}
                          />
                          <div
                            className="w-1/2 bg-[#0F172A] rounded-t-md transition-all duration-200 group-hover:bg-slate-700"
                            style={{ height: `${anaHeightPct}%` }}
                            title={`Anaerobic Load: ${point.anaerobicLoad} AU`}
                          />
                        </div>
                        <span className="text-xs font-semibold text-[#0F172A] mt-3">
                          {point.day}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-xs text-[#64748B]">
                  <span>
                    Monotony Index: <strong className="text-[#0F172A] font-mono-metric">1.32</strong> (Low injury risk)
                  </span>
                  <span>
                    Peak Neuromuscular Output: <strong className="text-[#059669] font-mono-metric">1,180 W</strong> (Saturday Track Block)
                  </span>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-xl font-bold text-[#0F172A]">
                      Today’s Session Execution
                    </h2>
                    <span className="text-xs font-mono-metric font-bold text-[#059669]">
                      {completedStepsCount}/{prescribedSteps.length} Blocks
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Check off completed blocks to calibrate real-time glycogen and recovery need.
                  </p>

                  <div className="mt-6 divide-y divide-[#E2E8F0]">
                    {prescribedSteps.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => toggleStep(step.id)}
                        className="py-3.5 first:pt-0 last:pb-0 flex items-start gap-3.5 cursor-pointer group"
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={step.completed}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStep(step.id);
                          }}
                          className={`mt-0.5 w-5 h-5 rounded-[6px] flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                            step.completed
                              ? 'bg-[#059669] border-2 border-[#059669] text-white'
                              : 'bg-white border-2 border-[#CBD5E1] group-hover:border-[#059669]'
                          }`}
                        >
                          {step.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-[#64748B]">
                              {step.phase}
                            </span>
                            <span className="text-xs font-mono-metric text-[#64748B]">
                              {step.durationMin} min
                            </span>
                          </div>
                          <p
                            className={`text-sm font-bold mt-0.5 transition-colors ${
                              step.completed ? 'line-through text-[#64748B]' : 'text-[#0F172A]'
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-xs text-[#64748B] mt-0.5">
                            {step.prescription} · {step.targetZone} ({step.targetHrBpm})
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between gap-3">
                  <span className="text-xs text-[#64748B]">
                    Total Prescribed Time: <strong className="text-[#0F172A] font-mono-metric">60 min</strong>
                  </span>
                  <button
                    onClick={() => {
                      setActiveScreen('live');
                      setIsRunning(true);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Open Ergometer View
                  </button>
                </div>
              </div>
            </section>

            {/* HIGH-DENSITY TRAINING LEDGER TABLE */}
            <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    Completed Telemetry & Training Ledger
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Click any session row to inspect power curves, cardiac drift, and lactate notes.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search sessions or notes..."
                      className="h-10 pl-9 pr-4 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] placeholder:text-[#64748B] focus:outline-none focus:border-[#059669] focus:ring-3 focus:ring-[#059669]/15"
                    />
                  </div>

                  <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl overflow-x-auto">
                    {(['All', 'Track & Sprint', 'Strength', 'Cycling', 'Threshold'] as const).map(
                      (disc) => (
                        <button
                          key={disc}
                          onClick={() => setDisciplineFilter(disc)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            disciplineFilter === disc
                              ? 'bg-white text-[#0F172A] shadow-xs'
                              : 'text-[#64748B] hover:text-[#0F172A]'
                          }`}
                        >
                          {disc}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>

              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-[#CBD5E1] rounded-xl space-y-3">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    No training sessions match your current filter criteria
                  </p>
                  <p className="text-xs text-[#64748B] max-w-md mx-auto">
                    Clear your search filter or log a new completed workout session to populate the telemetry ledger.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setDisciplineFilter('All');
                      }}
                      className="px-4 py-2 text-xs font-semibold text-[#0F172A] bg-[#F1F5F9] hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                    <button
                      onClick={() => setIsLogModalOpen(true)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-[#059669] hover:bg-[#047857] rounded-lg transition-colors cursor-pointer"
                    >
                      Log First Entry
                    </button>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                        <th className="py-3 pr-4">Date</th>
                        <th className="py-3 px-4">Session Title & Discipline</th>
                        <th className="py-3 px-4 text-right">Duration</th>
                        <th className="py-3 px-4 text-right">Avg / Max HR</th>
                        <th className="py-3 px-4 text-right">Norm Power</th>
                        <th className="py-3 px-4 text-right">Strain</th>
                        <th className="py-3 pl-4 text-right">Physiological Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-sm">
                      {filteredLogs.map((log) => (
                        <tr
                          key={log.id}
                          onClick={() => setSelectedLogDetail(log)}
                          className="hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 pr-4 font-mono-metric text-xs text-[#64748B] whitespace-nowrap">
                            {log.date}
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-[#0F172A]">{log.title}</p>
                            <p className="text-xs text-[#64748B]">
                              {log.discipline} · RPE {log.rpe}/10
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-metric text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                            {log.durationMin} min
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-metric text-xs text-[#0F172A] whitespace-nowrap">
                            {log.avgHrBpm} / {log.maxHrBpm} bpm
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-metric text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                            {log.normalizedPowerWatts} W
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono-metric text-xs font-bold text-[#059669] whitespace-nowrap">
                            {log.strainIndex.toFixed(1)}
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap text-xs font-semibold">
                            <span
                              className={
                                log.status === 'Peak Stimulus'
                                  ? 'text-[#059669]'
                                  : log.status === 'Optimal'
                                  ? 'text-[#0F172A]'
                                  : 'text-[#64748B]'
                              }
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedLogDetail && (
                <div className="p-5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-[#64748B]">
                      <span className="font-semibold text-[#0F172A]">{selectedLogDetail.title}</span>
                      <span>·</span>
                      <span>{selectedLogDetail.date}</span>
                      <span>·</span>
                      <span>{selectedLogDetail.discipline}</span>
                    </div>
                    <p className="text-xs text-[#0B1C30] leading-relaxed">
                      <strong>Coach & Telemetry Note:</strong> {selectedLogDetail.notes}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLogDetail(null)}
                    className="self-start sm:self-center px-3 py-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {/* =========================================================
            SCREEN 2: TRAINING LAB (PROTOCOL BUILDER & LIBRARY)
           ========================================================= */}
        {activeScreen === 'lab' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B]">
                  Periodization & Ergometer Programming · Mesocycle Block II
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1">
                  Training Lab & Protocol Library
                </h1>
              </div>

              <button
                onClick={() => setIsCreateProtoOpen(!isCreateProtoOpen)}
                className="h-11 px-5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Create Custom Protocol</span>
              </button>
            </div>

            {isCreateProtoOpen && (
              <form
                onSubmit={handleCreateProtocol}
                className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Author New Bio-Adaptive Protocol
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsCreateProtoOpen(false)}
                    className="text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Protocol Title
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={customProtoTitle}
                      onChange={(e) => setCustomProtoTitle(e.target.value)}
                      placeholder="e.g., 8×300m Glycolytic Repeats"
                      className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Physiological System
                    </label>
                    <select
                      value={customProtoCategory}
                      onChange={(e) =>
                        setCustomProtoCategory(e.target.value as ProtocolTemplate['category'])
                      }
                      className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    >
                      <option value="VO2 Max">VO2 Max</option>
                      <option value="Lactate Threshold">Lactate Threshold</option>
                      <option value="Neuromuscular Power">Neuromuscular Power</option>
                      <option value="Active Recovery">Active Recovery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      value={customProtoDuration}
                      onChange={(e) => setCustomProtoDuration(e.target.value)}
                      className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                      Target Power (Watts)
                    </label>
                    <input
                      type="number"
                      value={customProtoWatts}
                      onChange={(e) => setCustomProtoWatts(e.target.value)}
                      className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="h-11 px-6 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Save Protocol to Library
                  </button>
                </div>
              </form>
            )}

            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl self-start">
                {(
                  [
                    'All',
                    'VO2 Max',
                    'Lactate Threshold',
                    'Neuromuscular Power',
                    'Active Recovery',
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-white text-[#0F172A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <SlidersHorizontal className="w-4 h-4 text-[#059669] shrink-0" />
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                    FTP Scaling Factor:
                  </span>
                  <input
                    type="range"
                    min={85}
                    max={115}
                    value={intensityMultiplier}
                    onChange={(e) => setIntensityMultiplier(Number(e.target.value))}
                    className="w-32 accent-[#059669] cursor-pointer"
                  />
                  <span className="text-xs font-mono-metric font-bold text-[#059669] w-12">
                    {intensityMultiplier}%
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {protocols
                .filter((p) => selectedCategory === 'All' || p.category === selectedCategory)
                .map((proto) => {
                  const scaledWatts = Math.round(proto.targetWatts * (intensityMultiplier / 100));
                  return (
                    <div
                      key={proto.id}
                      className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-48 bg-[#0F172A] overflow-hidden">
                          {!imgErrors[proto.id] ? (
                            <img
                              src={proto.image}
                              alt={proto.title}
                              referrerPolicy="no-referrer"
                              onError={() => handleImgError(proto.id)}
                              className="w-full h-full object-cover opacity-85"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#0F172A] to-[#059669]/40 flex items-center justify-center">
                              <Activity className="w-8 h-8 text-[#84CC16]" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/90 via-[#0F172A]/25 to-transparent" />
                          <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between text-white">
                            <div>
                              <p className="text-xs font-semibold text-[#84CC16]">
                                {proto.category} · {proto.durationMin} min
                              </p>
                              <h3 className="text-lg font-bold mt-0.5">{proto.title}</h3>
                            </div>
                          </div>
                        </div>

                        <div className="p-6 space-y-5">
                          <p className="text-xs text-[#64748B] leading-relaxed">
                            {proto.description}
                          </p>

                          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#E2E8F0]">
                            <div>
                              <p className="text-[11px] text-[#64748B]">Scaled Target</p>
                              <p className="text-base font-bold font-mono-metric text-[#0F172A]">
                                {scaledWatts} W
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#64748B]">Pred. Strain</p>
                              <p className="text-base font-bold font-mono-metric text-[#059669]">
                                {proto.targetStrain}
                              </p>
                            </div>
                            <div>
                              <p className="text-[11px] text-[#64748B]">Target Zone</p>
                              <p className="text-xs font-semibold text-[#0F172A] mt-0.5">
                                {proto.targetHrZone.split(' ')[0]} {proto.targetHrZone.split(' ')[1]}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2 pt-2">
                            <p className="text-xs font-semibold text-[#0F172A]">
                              Interval Architecture ({proto.intervals.length} Stages)
                            </p>
                            <div className="space-y-1.5">
                              {proto.intervals.slice(0, 4).map((intv, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between text-xs py-1 border-b border-[#E2E8F0]/60 last:border-none"
                                >
                                  <span className="text-[#0B1C30] truncate pr-2">{intv.name}</span>
                                  <span className="font-mono-metric text-[#64748B] shrink-0">
                                    {Math.round(intv.durationSec / 60)}m ·{' '}
                                    {Math.round(intv.targetWatts * (intensityMultiplier / 100))}W
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-6 pb-6">
                        <button
                          onClick={() => handleLaunchProtocol(proto)}
                          className="w-full h-11 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Load Protocol into Live Ergometer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 3: LIVE SESSION (REAL-TIME TELEMETRY ERGOMETER)
           ========================================================= */}
        {activeScreen === 'live' && (
          <div className="space-y-8">
            {sessionSavedBanner && (
              <div className="p-4 rounded-xl bg-[#059669] text-white text-xs font-semibold flex items-center justify-between">
                <span>{sessionSavedBanner}</span>
                <button
                  onClick={() => setActiveScreen('overview')}
                  className="underline font-bold cursor-pointer"
                >
                  View in Ledger
                </button>
              </div>
            )}

            <div className="bg-[#0F172A] text-white rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#84CC16]">
                    <span
                      className={`w-2 h-2 rounded-full bg-[#84CC16] ${
                        isRunning ? 'animate-ping' : ''
                      }`}
                    />
                    <span>
                      {isRunning ? 'LIVE TELEMETRY STREAM ACTIVE' : 'ERGOMETER PAUSED'} ·{' '}
                      {activeProtocol.category}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
                    {activeProtocol.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
                  <span className="text-xs text-slate-400 px-2">Target Zone:</span>
                  {([1, 2, 3, 4, 5] as const).map((z) => (
                    <button
                      key={z}
                      onClick={() => setLiveZoneEffort(z)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        liveZoneEffort === z
                          ? 'bg-[#84CC16] text-[#0F172A]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Z{z}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 py-2">
                <div>
                  <p className="text-xs font-semibold text-slate-400">Elapsed Interval Timer</p>
                  <p className="text-5xl sm:text-6xl font-extrabold font-mono-metric text-white mt-2 tracking-tight">
                    {formatTimer(elapsedSeconds)}
                  </p>
                  <p className="text-xs text-[#84CC16] mt-2">
                    Stage {activeIntervalIdx + 1} of {activeProtocol.intervals.length}:{' '}
                    {activeProtocol.intervals[activeIntervalIdx]?.name}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">Instantaneous Heart Rate</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl sm:text-6xl font-extrabold font-mono-metric text-white tracking-tight">
                      {liveTelemetry.hr}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">BPM</span>
                  </div>
                  <p className="text-xs text-emerald-400 mt-2">{liveTelemetry.label}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">Normalized Mechanical Power</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl sm:text-6xl font-extrabold font-mono-metric text-[#84CC16] tracking-tight">
                      {liveTelemetry.watts}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">WATTS</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    {(liveTelemetry.watts / 73).toFixed(2)} W/kg · {intensityMultiplier}% FTP Scale
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400">Cadence & Blood Lactate Est.</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-5xl sm:text-6xl font-extrabold font-mono-metric text-white tracking-tight">
                      {liveTelemetry.cadence}
                    </span>
                    <span className="text-sm font-semibold text-slate-400">RPM</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-2">
                    Est. Lactate: <strong className="text-white font-mono-metric">{liveTelemetry.lactate}</strong>
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className="h-12 px-6 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-4 h-4 fill-current" />
                        <span>Pause Telemetry</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Resume Telemetry</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleRecordSplit}
                    className="h-12 px-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Timer className="w-4 h-4 text-[#84CC16]" />
                    <span>Mark Lap Split</span>
                  </button>

                  <button
                    onClick={() =>
                      setActiveIntervalIdx((prev) => (prev + 1) % activeProtocol.intervals.length)
                    }
                    className="h-12 px-4 bg-slate-800/70 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Next Stage</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setElapsedSeconds(0);
                    }}
                    className="h-12 px-4 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                <button
                  onClick={handleFinishLiveSession}
                  className="h-12 px-6 bg-[#84CC16] hover:bg-[#91db2a] text-[#0F172A] font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  Complete & Log to Ledger
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#0F172A]">
                  Protocol Interval Queue
                </h2>
                <div className="divide-y divide-[#E2E8F0]">
                  {activeProtocol.intervals.map((intv, idx) => {
                    const isCurrent = idx === activeIntervalIdx;
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveIntervalIdx(idx)}
                        className={`py-3 px-3 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                          isCurrent ? 'bg-[#F0FDF4]' : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <div>
                          <p className="text-sm font-bold text-[#0F172A]">
                            0{idx + 1}. {intv.name}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Target {intv.zone} · {intv.targetHr} bpm ceiling
                          </p>
                        </div>
                        <div className="text-right font-mono-metric">
                          <p className="text-sm font-bold text-[#059669]">
                            {Math.round(intv.targetWatts * (intensityMultiplier / 100))} W
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {Math.floor(intv.durationSec / 60)}:00
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-[#0F172A]">
                    Captured Lap Splits ({recordedSplits.length})
                  </h2>
                  <span className="text-xs text-[#64748B]">Optical gate precision</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                        <th className="py-2.5">Lap</th>
                        <th className="py-2.5">Split Time</th>
                        <th className="py-2.5 text-right">Power</th>
                        <th className="py-2.5 text-right">Heart Rate</th>
                        <th className="py-2.5 text-right">Zone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] text-xs font-mono-metric">
                      {recordedSplits.map((s) => (
                        <tr key={s.lap}>
                          <td className="py-3 font-bold text-[#0F172A]">#{s.lap}</td>
                          <td className="py-3 text-[#0F172A]">{s.splitTime}</td>
                          <td className="py-3 text-right font-bold text-[#059669]">{s.watts} W</td>
                          <td className="py-3 text-right text-[#0F172A]">{s.hr} bpm</td>
                          <td className="py-3 text-right font-sans font-semibold text-[#64748B]">
                            {s.zone}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 4: BIO-METRICS (HRV, RECOVERY & HEART RATE ZONES)
           ========================================================= */}
        {activeScreen === 'biometrics' && (
          <div className="space-y-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-[#64748B]">
                  Autonomic Nervous System & Cardiorespiratory Profiling
                </p>
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1">
                  Bio-Metrics & Heart Rate Zones
                </h1>
              </div>

              <button
                onClick={handleRunOrthoTest}
                disabled={orthoTestState === 'measuring'}
                className="h-11 px-5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto cursor-pointer"
              >
                <Heart className="w-4 h-4 text-[#84CC16]" />
                <span>
                  {orthoTestState === 'measuring'
                    ? 'Sampling RR Intervals...'
                    : orthoTestState === 'complete'
                    ? `Orthostatic RMSSD: ${orthoHrvResult} ms (Recalibrate)`
                    : 'Run 60s Orthostatic HRV Check'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    5-Zone Physiological Heart Rate & Lactate Architecture
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Select any training zone row to inspect cellular adaptations and fuel substrate ratios.
                  </p>
                </div>

                <div className="divide-y divide-[#E2E8F0]">
                  {[
                    {
                      zone: 1,
                      name: 'Zone 1 · Parasympathetic Recovery',
                      hrRange: '102 – 124 bpm',
                      lactate: '< 1.5 mmol/L',
                      timeShare: '18%',
                      color: 'bg-slate-400',
                      substrate: '85% Lipid Oxidation / 15% Glycogen',
                    },
                    {
                      zone: 2,
                      name: 'Zone 2 · Mitochondrial Capillary Base',
                      hrRange: '125 – 148 bpm',
                      lactate: '1.5 – 2.0 mmol/L',
                      timeShare: '46%',
                      color: 'bg-[#059669]',
                      substrate: '65% Lipid Oxidation / 35% Muscle Glycogen',
                    },
                    {
                      zone: 3,
                      name: 'Zone 3 · Aerobic Tempo / Sweet Spot',
                      hrRange: '149 – 166 bpm',
                      lactate: '2.1 – 3.2 mmol/L',
                      timeShare: '16%',
                      color: 'bg-teal-600',
                      substrate: '38% Lipid / 62% Muscle Glycogen',
                    },
                    {
                      zone: 4,
                      name: 'Zone 4 · Lactate Threshold (LT2)',
                      hrRange: '167 – 181 bpm',
                      lactate: '3.3 – 4.2 mmol/L',
                      timeShare: '14%',
                      color: 'bg-amber-500',
                      substrate: '12% Lipid / 88% Fast Glycolysis',
                    },
                    {
                      zone: 5,
                      name: 'Zone 5 · Peak VO2 Max & Neuromuscular',
                      hrRange: '182 – 196 bpm',
                      lactate: '> 4.5 mmol/L',
                      timeShare: '6%',
                      color: 'bg-[#84CC16]',
                      substrate: '100% Anaerobic Glycolysis & ATP-PCr',
                    },
                  ].map((z) => (
                    <div
                      key={z.zone}
                      onClick={() => setSelectedZoneDetail(z.zone)}
                      className={`py-4 px-3 rounded-xl transition-colors cursor-pointer ${
                        selectedZoneDetail === z.zone ? 'bg-[#F8FAFC]' : 'hover:bg-[#F8FAFC]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${z.color} shrink-0`} />
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">{z.name}</p>
                            <p className="text-xs text-[#64748B]">{z.substrate}</p>
                          </div>
                        </div>
                        <div className="text-right font-mono-metric">
                          <p className="text-sm font-bold text-[#0F172A]">{z.hrRange}</p>
                          <p className="text-xs text-[#64748B]">
                            {z.lactate} · {z.timeShare} volume
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A]">
                    Nocturnal Recovery Architecture
                  </h2>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    8h 14m total sleep duration · 93% sleep stage efficiency
                  </p>

                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#0F172A]">Slow-Wave Deep Sleep (SWS)</span>
                        <span className="font-mono-metric text-[#059669]">2h 08m (26%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-[#059669] h-full" style={{ width: '26%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#0F172A]">REM Neural Consolidation</span>
                        <span className="font-mono-metric text-[#0F172A]">2h 18m (28%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-[#0F172A] h-full" style={{ width: '28%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1.5">
                        <span className="text-[#0F172A]">Light Restorative Sleep</span>
                        <span className="font-mono-metric text-[#64748B]">3h 48m (46%)</span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div className="bg-slate-400 h-full" style={{ width: '46%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[#E2E8F0] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Respiratory Rate</span>
                    <span className="font-mono-metric font-bold text-[#0F172A]">13.8 brpm</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Nocturnal Skin Temp Deviation</span>
                    <span className="font-mono-metric font-bold text-[#059669]">-0.12 °C</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#64748B]">Blood Oxygen Saturation (SpO2)</span>
                    <span className="font-mono-metric font-bold text-[#0F172A]">98.4%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 5: NUTRITION (METABOLIC FUELING & HYDRATION)
           ========================================================= */}
        {activeScreen === 'nutrition' && (
          <div className="space-y-10">
            <div>
              <p className="text-xs font-semibold text-[#64748B]">
                Glycogen Periodization & Sweat Electrolyte Telemetry
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0F172A] mt-1">
                Metabolic Fueling & Hydration Lab
              </h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Carbohydrate Glycogen Load</p>
                <p className="text-3xl font-extrabold font-mono-metric text-[#0F172A] mt-2">
                  {nutritionTotals.carbs} <span className="text-sm font-normal text-[#64748B]">/ 420 g</span>
                </p>
                <p className="text-xs text-[#059669] mt-2">5.8 g/kg high-output day target</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Myofibrillar Protein Intake</p>
                <p className="text-3xl font-extrabold font-mono-metric text-[#0F172A] mt-2">
                  {nutritionTotals.protein} <span className="text-sm font-normal text-[#64748B]">/ 175 g</span>
                </p>
                <p className="text-xs text-[#059669] mt-2">2.4 g/kg leucine-optimized</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Sodium Electrolyte Balance</p>
                <p className="text-3xl font-extrabold font-mono-metric text-[#0F172A] mt-2">
                  {nutritionTotals.sodium} <span className="text-sm font-normal text-[#64748B]">/ 3,200 mg</span>
                </p>
                <p className="text-xs text-[#64748B] mt-2">Calibrated for 920 mg/L sweat concentration</p>
              </div>

              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6">
                <p className="text-xs font-semibold text-[#64748B]">Total Energy Intake</p>
                <p className="text-3xl font-extrabold font-mono-metric text-[#059669] mt-2">
                  {nutritionTotals.kcal.toLocaleString()} <span className="text-sm font-normal text-[#64748B]">kcal</span>
                </p>
                <p className="text-xs text-[#64748B] mt-2">Target: 3,450 kcal eumetabolic equilibrium</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 space-y-6">
                <h2 className="text-xl font-bold text-[#0F172A]">
                  Today’s Timed Fueling Protocol
                </h2>

                <div className="divide-y divide-[#E2E8F0]">
                  {fuelingEntries.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#059669]">
                          {item.time} · {item.timingPhase}
                        </p>
                        <p className="text-sm font-bold text-[#0F172A] mt-0.5">{item.title}</p>
                        <p className="text-xs text-[#64748B] mt-0.5 font-mono-metric">
                          {item.carbsG}g Carbs · {item.proteinG}g Protein · {item.fatG}g Fat · {item.sodiumMg}mg Na+
                        </p>
                      </div>
                      <span className="text-sm font-bold font-mono-metric text-[#0F172A] shrink-0">
                        {item.kcal} kcal
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleAddFueling} className="pt-6 border-t border-[#E2E8F0] space-y-4">
                  <p className="text-xs font-bold text-[#0F172A]">Log Additional Fueling Intake</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      required
                      maxLength={120}
                      value={newMealTitle}
                      onChange={(e) => setNewMealTitle(e.target.value)}
                      placeholder="Meal or hydrogel description..."
                      className="h-11 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    />
                    <select
                      value={newMealPhase}
                      onChange={(e) => setNewMealPhase(e.target.value as FuelingEntry['timingPhase'])}
                      className="h-11 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#059669]"
                    >
                      <option value="Pre-Session">Pre-Session</option>
                      <option value="Intra-Workout">Intra-Workout</option>
                      <option value="Post-Recovery">Post-Recovery</option>
                      <option value="Basal Meal">Basal Meal</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-1">Carbs (g)</label>
                      <input
                        type="number"
                        value={newMealCarbs}
                        onChange={(e) => setNewMealCarbs(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono-metric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-1">Protein (g)</label>
                      <input
                        type="number"
                        value={newMealProtein}
                        onChange={(e) => setNewMealProtein(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono-metric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-1">Fat (g)</label>
                      <input
                        type="number"
                        value={newMealFat}
                        onChange={(e) => setNewMealFat(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono-metric"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#64748B] mb-1">Sodium (mg)</label>
                      <input
                        type="number"
                        value={newMealSodium}
                        onChange={(e) => setNewMealSodium(e.target.value)}
                        className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono-metric"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-11 px-5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    Add Fueling Entry
                  </button>
                </form>
              </div>

              <div className="lg:col-span-5 bg-[#0F172A] text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#84CC16]">
                    <Droplets className="w-4 h-4" />
                    <span>Sweat & Sodium Loss Calculator</span>
                  </div>
                  <h2 className="text-xl font-bold">
                    Session Fluid & Electrolyte Prescription
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Adjust session duration and ambient stadium/lab temperature to compute exact fluid and sodium replacement needs.
                  </p>

                  <div className="pt-4 space-y-5">
                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-300">Session Duration</span>
                        <span className="font-mono-metric font-bold text-[#84CC16]">
                          {sweatDurationMin} min
                        </span>
                      </div>
                      <input
                        type="range"
                        min={30}
                        max={180}
                        step={5}
                        value={sweatDurationMin}
                        onChange={(e) => setSweatDurationMin(Number(e.target.value))}
                        className="w-full accent-[#84CC16] cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-slate-300">Ambient Temperature</span>
                        <span className="font-mono-metric font-bold text-[#84CC16]">
                          {ambientTempC} °C
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={36}
                        value={ambientTempC}
                        onChange={(e) => setAmbientTempC(Number(e.target.value))}
                        className="w-full accent-[#84CC16] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-400">Fluid Replacement</p>
                    <p className="text-3xl font-extrabold font-mono-metric text-white mt-1">
                      {Math.round((sweatDurationMin / 60) * (950 + (ambientTempC - 15) * 32))}{' '}
                      <span className="text-xs font-normal text-slate-400">mL</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Target Sodium (Na+)</p>
                    <p className="text-3xl font-extrabold font-mono-metric text-[#84CC16] mt-1">
                      {Math.round((sweatDurationMin / 60) * (880 + (ambientTempC - 15) * 28))}{' '}
                      <span className="text-xs font-normal text-slate-400">mg</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            SCREEN 6: AI STUDIO (CHAT, LIVE VOICE, MAPS, IMAGE, VEO, LYRIA)
           ========================================================= */}
        {activeScreen === 'ai-studio' && (
          <PerformanceAIStudio
            onUseTranscriptionInWorkout={(text) => {
              setNewLogNotes(text.slice(0, 500));
              setIsLogModalOpen(true);
            }}
          />
        )}
      </main>

      {/* CLEAN EDITORIAL FOOTER */}
      <footer className="mt-16 border-t border-[#E2E8F0] bg-white py-6 px-4 sm:px-8 lg:px-12">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <span>Kinetic Pulse · Bio-Adaptive Athletic Performance Platform</span>
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveScreen('overview')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Command Center
            </button>
            <button
              onClick={() => setActiveScreen('lab')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Protocol Library
            </button>
            <button
              onClick={() => setActiveScreen('ai-studio')}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              AI Performance Studio
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL: LOG WORKOUT SESSION (with gemini-3.5-transcribe mic button) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0F172A]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[#0F172A]">Log Completed Training Session</h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  {currentUser
                    ? 'Saves directly to your authenticated Firestore database.'
                    : 'Sign in with Google to persist sessions across devices.'}
                </p>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-2 rounded-lg text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddWorkoutLog} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                  Session Title
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={newLogTitle}
                  onChange={(e) => setNewLogTitle(e.target.value)}
                  placeholder="e.g., 6×400m Track Threshold Repeats"
                  className="w-full h-12 px-4 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={newLogDiscipline}
                    onChange={(e) =>
                      setNewLogDiscipline(e.target.value as TrainingSessionLog['discipline'])
                    }
                    className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                  >
                    <option value="Track & Sprint">Track & Sprint</option>
                    <option value="Strength">Strength</option>
                    <option value="Cycling">Cycling</option>
                    <option value="Threshold">Threshold</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    required
                    value={newLogDuration}
                    onChange={(e) => setNewLogDuration(e.target.value)}
                    className="w-full h-12 px-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A] focus:outline-none focus:border-[#059669]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Avg HR (bpm)
                  </label>
                  <input
                    type="number"
                    value={newLogAvgHr}
                    onChange={(e) => setNewLogAvgHr(e.target.value)}
                    className="w-full h-12 px-3 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    Norm Power (W)
                  </label>
                  <input
                    type="number"
                    value={newLogWatts}
                    onChange={(e) => setNewLogWatts(e.target.value)}
                    className="w-full h-12 px-3 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                    RPE (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newLogRpe}
                    onChange={(e) => setNewLogRpe(e.target.value)}
                    className="w-full h-12 px-3 bg-white border border-[#CBD5E1] rounded-xl text-sm font-mono-metric text-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#0F172A]">
                    Physiological & Split Notes
                  </label>
                  <button
                    type="button"
                    onClick={toggleModalVoiceRecording}
                    disabled={isModalTranscribing}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                      isModalRecording
                        ? 'bg-[#BA1A1A] text-white animate-pulse'
                        : 'bg-[#F1F5F9] text-[#059669] hover:bg-slate-200'
                    }`}
                  >
                    {isModalTranscribing ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Transcribing...</span>
                      </>
                    ) : isModalRecording ? (
                      <>
                        <Square className="w-3 h-3 fill-current" />
                        <span>Stop Recording</span>
                      </>
                    ) : (
                      <>
                        <Mic className="w-3 h-3" />
                        <span>Dictate Note (gemini-3.5-transcribe)</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  placeholder="Optional split times, lactate readings, or dictate with microphone..."
                  className="w-full p-3.5 bg-white border border-[#CBD5E1] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#059669]"
                />
                {modalTranscribeError && (
                  <p className="text-xs text-[#BA1A1A] mt-1">{modalTranscribeError}</p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="h-11 px-4 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Save Workout to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

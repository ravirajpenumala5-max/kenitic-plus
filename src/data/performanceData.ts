import heroSprintImg from '../assets/images/hero_athlete_sprint_1791443812749.jpg';
import strengthKettlebellImg from '../assets/images/workout_strength_kettlebell_1791443826942.jpg';
import hiitEnduranceImg from '../assets/images/workout_hiit_endurance_1791443837691.jpg';
import athleteAvatarImg from '../assets/images/athlete_profile_avatar_1791443850654.jpg';

export const ASSETS = {
  heroSprint: heroSprintImg,
  strengthKettlebell: strengthKettlebellImg,
  hiitEndurance: hiitEnduranceImg,
  athleteAvatar: athleteAvatarImg,
};

export type TimeframeKey = '7d' | '30d' | '90d' | 'season';

export interface TimeframeMetrics {
  label: string;
  readinessAvg: number;
  readinessDelta: string;
  vo2Max: number;
  vo2Delta: string;
  strainScore: number;
  strainDelta: string;
  activeKcal: number;
  kcalDelta: string;
  weeklyLoadSeries: {
    day: string;
    aerobicLoad: number;
    anaerobicLoad: number;
    recoveryScore: number;
    hrvMs: number;
  }[];
}

export const TIMEFRAME_DATA: Record<TimeframeKey, TimeframeMetrics> = {
  '7d': {
    label: 'Last 7 Days',
    readinessAvg: 94,
    readinessDelta: '+4.2% vs prior week',
    vo2Max: 64.8,
    vo2Delta: '+0.6 mL/kg/min',
    strainScore: 18.4,
    strainDelta: 'Optimal threshold',
    activeKcal: 6840,
    kcalDelta: '+410 kcal target',
    weeklyLoadSeries: [
      { day: 'Mon', aerobicLoad: 78, anaerobicLoad: 42, recoveryScore: 91, hrvMs: 74 },
      { day: 'Tue', aerobicLoad: 92, anaerobicLoad: 68, recoveryScore: 86, hrvMs: 69 },
      { day: 'Wed', aerobicLoad: 54, anaerobicLoad: 18, recoveryScore: 95, hrvMs: 81 },
      { day: 'Thu', aerobicLoad: 108, anaerobicLoad: 84, recoveryScore: 82, hrvMs: 66 },
      { day: 'Fri', aerobicLoad: 64, anaerobicLoad: 24, recoveryScore: 92, hrvMs: 77 },
      { day: 'Sat', aerobicLoad: 124, anaerobicLoad: 95, recoveryScore: 89, hrvMs: 73 },
      { day: 'Sun', aerobicLoad: 88, anaerobicLoad: 52, recoveryScore: 94, hrvMs: 78 },
    ],
  },
  '30d': {
    label: 'Last 30 Days',
    readinessAvg: 91,
    readinessDelta: '+6.8% vs prior month',
    vo2Max: 64.2,
    vo2Delta: '+1.4 mL/kg/min',
    strainScore: 17.9,
    strainDelta: 'Balanced mesocycle',
    activeKcal: 28450,
    kcalDelta: '+1,820 kcal target',
    weeklyLoadSeries: [
      { day: 'Wk 1', aerobicLoad: 82, anaerobicLoad: 48, recoveryScore: 88, hrvMs: 71 },
      { day: 'Wk 2', aerobicLoad: 96, anaerobicLoad: 64, recoveryScore: 85, hrvMs: 68 },
      { day: 'Wk 3', aerobicLoad: 112, anaerobicLoad: 82, recoveryScore: 83, hrvMs: 67 },
      { day: 'Wk 4', aerobicLoad: 74, anaerobicLoad: 38, recoveryScore: 93, hrvMs: 76 },
      { day: 'Wk 5', aerobicLoad: 98, anaerobicLoad: 70, recoveryScore: 90, hrvMs: 74 },
      { day: 'Wk 6', aerobicLoad: 118, anaerobicLoad: 88, recoveryScore: 91, hrvMs: 75 },
      { day: 'Now', aerobicLoad: 104, anaerobicLoad: 72, recoveryScore: 94, hrvMs: 78 },
    ],
  },
  '90d': {
    label: 'Last 90 Days',
    readinessAvg: 89,
    readinessDelta: '+9.1% block gain',
    vo2Max: 63.5,
    vo2Delta: '+2.8 mL/kg/min',
    strainScore: 17.2,
    strainDelta: 'Progressive build',
    activeKcal: 84200,
    kcalDelta: '98.4% adherence',
    weeklyLoadSeries: [
      { day: 'Aug 1', aerobicLoad: 70, anaerobicLoad: 35, recoveryScore: 84, hrvMs: 64 },
      { day: 'Aug 15', aerobicLoad: 85, anaerobicLoad: 50, recoveryScore: 86, hrvMs: 67 },
      { day: 'Sep 1', aerobicLoad: 94, anaerobicLoad: 62, recoveryScore: 88, hrvMs: 70 },
      { day: 'Sep 15', aerobicLoad: 106, anaerobicLoad: 74, recoveryScore: 87, hrvMs: 71 },
      { day: 'Oct 1', aerobicLoad: 115, anaerobicLoad: 86, recoveryScore: 91, hrvMs: 75 },
      { day: 'Oct 4', aerobicLoad: 92, anaerobicLoad: 58, recoveryScore: 93, hrvMs: 77 },
      { day: 'Oct 8', aerobicLoad: 108, anaerobicLoad: 76, recoveryScore: 94, hrvMs: 78 },
    ],
  },
  season: {
    label: '2026 Season',
    readinessAvg: 88,
    readinessDelta: 'Peak competition phase',
    vo2Max: 64.8,
    vo2Delta: '+4.1 mL/kg/min YTD',
    strainScore: 16.8,
    strainDelta: 'Taper calibrated',
    activeKcal: 246800,
    kcalDelta: '312 sessions logged',
    weeklyLoadSeries: [
      { day: 'Base 1', aerobicLoad: 65, anaerobicLoad: 28, recoveryScore: 85, hrvMs: 63 },
      { day: 'Base 2', aerobicLoad: 88, anaerobicLoad: 44, recoveryScore: 87, hrvMs: 66 },
      { day: 'Build 1', aerobicLoad: 104, anaerobicLoad: 68, recoveryScore: 86, hrvMs: 69 },
      { day: 'Build 2', aerobicLoad: 120, anaerobicLoad: 89, recoveryScore: 84, hrvMs: 68 },
      { day: 'Peak 1', aerobicLoad: 114, anaerobicLoad: 94, recoveryScore: 90, hrvMs: 74 },
      { day: 'Taper', aerobicLoad: 78, anaerobicLoad: 62, recoveryScore: 95, hrvMs: 80 },
      { day: 'Race', aerobicLoad: 102, anaerobicLoad: 84, recoveryScore: 94, hrvMs: 78 },
    ],
  },
};

export interface PrescribedStep {
  id: string;
  phase: string;
  title: string;
  prescription: string;
  targetZone: string;
  targetHrBpm: string;
  durationMin: number;
  completed: boolean;
}

export const INITIAL_PRESCRIBED_STEPS: PrescribedStep[] = [
  {
    id: 'step-1',
    phase: '01. Neuromuscular Warmup',
    title: 'Dynamic Mobility & A-Skip Drills',
    prescription: '2x40m progressive build + hip flexor activation',
    targetZone: 'Zone 2 Aerobic',
    targetHrBpm: '128–138 bpm',
    durationMin: 12,
    completed: true,
  },
  {
    id: 'step-2',
    phase: '02. Primary Threshold Block',
    title: '6 × 400m Track Pace Intervals',
    prescription: '68s target split · 90s standing recovery between reps',
    targetZone: 'Zone 4 Threshold',
    targetHrBpm: '172–181 bpm',
    durationMin: 24,
    completed: true,
  },
  {
    id: 'step-3',
    phase: '03. Alactic Power Surge',
    title: '4 × 60m Flying Sprint Accelerations',
    prescription: '98% max velocity · 3 min full phosphagen recovery',
    targetZone: 'Zone 5 Peak Output',
    targetHrBpm: '184–192 bpm',
    durationMin: 14,
    completed: false,
  },
  {
    id: 'step-4',
    phase: '04. Parasympathetic Flush',
    title: 'Incline Tempo Walk & Nasal Down-Regulation',
    prescription: '4s inhale / 8s exhale cadence until HR drops below 110 bpm',
    targetZone: 'Zone 1 Recovery',
    targetHrBpm: '102–115 bpm',
    durationMin: 10,
    completed: false,
  },
];

export interface TrainingSessionLog {
  id: string;
  date: string;
  title: string;
  discipline: 'Track & Sprint' | 'Strength' | 'Cycling' | 'Threshold';
  durationMin: number;
  avgHrBpm: number;
  maxHrBpm: number;
  normalizedPowerWatts: number;
  strainIndex: number;
  rpe: number;
  status: 'Optimal' | 'Peak Stimulus' | 'Recovery';
  notes: string;
}

export const INITIAL_TRAINING_LOGS: TrainingSessionLog[] = [
  {
    id: 'log-101',
    date: 'Oct 07, 2026',
    title: 'VO2 Max Ergometer Repeats (5×4m)',
    discipline: 'Cycling',
    durationMin: 58,
    avgHrBpm: 164,
    maxHrBpm: 188,
    normalizedPowerWatts: 342,
    strainIndex: 19.2,
    rpe: 9,
    status: 'Peak Stimulus',
    notes: 'Held 365W average across all five intervals with minimal cardiac drift (+2.1%).',
  },
  {
    id: 'log-102',
    date: 'Oct 06, 2026',
    title: 'Posterior Chain & Trap Bar Force Velocity',
    discipline: 'Strength',
    durationMin: 52,
    avgHrBpm: 131,
    maxHrBpm: 162,
    normalizedPowerWatts: 280,
    strainIndex: 14.6,
    rpe: 7,
    status: 'Optimal',
    notes: 'Peak concentric bar velocity 1.08 m/s at 165kg load.',
  },
  {
    id: 'log-103',
    date: 'Oct 05, 2026',
    title: 'Lactate Clearance Cruise Intervals',
    discipline: 'Threshold',
    durationMin: 64,
    avgHrBpm: 169,
    maxHrBpm: 179,
    normalizedPowerWatts: 318,
    strainIndex: 17.8,
    rpe: 8,
    status: 'Optimal',
    notes: 'Blood lactate measured at 3.6 mmol/L after rep 4. Smooth cadence at 182 spm.',
  },
  {
    id: 'log-104',
    date: 'Oct 03, 2026',
    title: 'Track 150m Glycolytic Speed Endurance',
    discipline: 'Track & Sprint',
    durationMin: 45,
    avgHrBpm: 156,
    maxHrBpm: 191,
    normalizedPowerWatts: 410,
    strainIndex: 18.5,
    rpe: 9,
    status: 'Peak Stimulus',
    notes: 'Fastest 150m split clocked at 16.42s via optical timing gates.',
  },
  {
    id: 'log-105',
    date: 'Oct 02, 2026',
    title: 'Zone 2 Aerobic Capillary Flush',
    discipline: 'Cycling',
    durationMin: 75,
    avgHrBpm: 134,
    maxHrBpm: 142,
    normalizedPowerWatts: 228,
    strainIndex: 11.4,
    rpe: 4,
    status: 'Recovery',
    notes: 'Strict nasal breathing maintained throughout entire 75-minute ride.',
  },
];

export interface ProtocolTemplate {
  id: string;
  title: string;
  category: 'VO2 Max' | 'Lactate Threshold' | 'Neuromuscular Power' | 'Active Recovery';
  durationMin: number;
  targetStrain: number;
  targetWatts: number;
  targetHrZone: string;
  image: string;
  description: string;
  intervals: {
    name: string;
    durationSec: number;
    targetWatts: number;
    targetHr: number;
    zone: string;
  }[];
}

export const PROTOCOL_LIBRARY: ProtocolTemplate[] = [
  {
    id: 'proto-1',
    title: 'Norwegian 4×4m VO2 Max Protocol',
    category: 'VO2 Max',
    durationMin: 44,
    targetStrain: 19.4,
    targetWatts: 355,
    targetHrZone: 'Zone 5 (90–95% Max HR)',
    image: ASSETS.heroSprint,
    description: 'Four 4-minute high-output intervals separated by 3-minute active recovery valleys to maximize stroke volume and central oxygen delivery.',
    intervals: [
      { name: 'Progressive Aerobic Warmup', durationSec: 480, targetWatts: 210, targetHr: 135, zone: 'Zone 2' },
      { name: 'VO2 Max Interval 01', durationSec: 240, targetWatts: 355, targetHr: 182, zone: 'Zone 5' },
      { name: 'Active Recovery Valley 01', durationSec: 180, targetWatts: 165, targetHr: 138, zone: 'Zone 2' },
      { name: 'VO2 Max Interval 02', durationSec: 240, targetWatts: 355, targetHr: 185, zone: 'Zone 5' },
      { name: 'Active Recovery Valley 02', durationSec: 180, targetWatts: 165, targetHr: 140, zone: 'Zone 2' },
      { name: 'VO2 Max Interval 03', durationSec: 240, targetWatts: 360, targetHr: 187, zone: 'Zone 5' },
    ],
  },
  {
    id: 'proto-2',
    title: 'Ballistic Kettlebell & Barbell Contrast',
    category: 'Neuromuscular Power',
    durationMin: 50,
    targetStrain: 16.2,
    targetWatts: 420,
    targetHrZone: 'Zone 3–4 (Alactic Bursts)',
    image: ASSETS.strengthKettlebell,
    description: 'Post-activation potentiation pairing heavy trap-bar deadlifts (85% 1RM) with explosive kettlebell swings and broad jumps.',
    intervals: [
      { name: 'Thoracic & Hip Capsule Prep', durationSec: 360, targetWatts: 150, targetHr: 118, zone: 'Zone 1' },
      { name: 'Contrast Pair A: Heavy Pull + Swing', durationSec: 420, targetWatts: 410, targetHr: 164, zone: 'Zone 4' },
      { name: 'Neural Rest Interval', durationSec: 180, targetWatts: 110, targetHr: 122, zone: 'Zone 1' },
      { name: 'Contrast Pair B: Split Jerk + Box Drop', durationSec: 420, targetWatts: 435, targetHr: 171, zone: 'Zone 4' },
    ],
  },
  {
    id: 'proto-3',
    title: 'Over-Under Lactate Shuttle Ergometer',
    category: 'Lactate Threshold',
    durationMin: 60,
    targetStrain: 18.6,
    targetWatts: 325,
    targetHrZone: 'Zone 4 (85–90% Max HR)',
    image: ASSETS.hiitEndurance,
    description: 'Alternating 2 minutes at 105% FTP with 2 minutes at 92% FTP to train MCT1 lactate transporters to clear metabolic byproducts under load.',
    intervals: [
      { name: 'Cadence Calibration Ramp', durationSec: 600, targetWatts: 225, targetHr: 140, zone: 'Zone 2' },
      { name: 'Over-Surge (105% Threshold)', durationSec: 120, targetWatts: 345, targetHr: 176, zone: 'Zone 4' },
      { name: 'Under-Clearance (92% Threshold)', durationSec: 120, targetWatts: 302, targetHr: 168, zone: 'Zone 4' },
      { name: 'Over-Surge (105% Threshold)', durationSec: 120, targetWatts: 345, targetHr: 179, zone: 'Zone 4' },
      { name: 'Under-Clearance (92% Threshold)', durationSec: 120, targetWatts: 302, targetHr: 170, zone: 'Zone 4' },
    ],
  },
];

export interface FuelingEntry {
  id: string;
  time: string;
  title: string;
  timingPhase: 'Pre-Session' | 'Intra-Workout' | 'Post-Recovery' | 'Basal Meal';
  carbsG: number;
  proteinG: number;
  fatG: number;
  sodiumMg: number;
  kcal: number;
}

export const INITIAL_FUELING_ENTRIES: FuelingEntry[] = [
  {
    id: 'fuel-1',
    time: '06:30 AM',
    title: 'Sprouted Rolled Oats, Whey Isolate & Manuka Honey',
    timingPhase: 'Pre-Session',
    carbsG: 78,
    proteinG: 34,
    fatG: 8,
    sodiumMg: 420,
    kcal: 520,
  },
  {
    id: 'fuel-2',
    time: '08:15 AM',
    title: 'Dual-Source Maltodextrin + Fructose Hydrogel (1:0.8)',
    timingPhase: 'Intra-Workout',
    carbsG: 60,
    proteinG: 0,
    fatG: 0,
    sodiumMg: 680,
    kcal: 240,
  },
  {
    id: 'fuel-3',
    time: '09:45 AM',
    title: 'Wild Alaskan Sockeye Salmon, Jasmine Rice & Avocado',
    timingPhase: 'Post-Recovery',
    carbsG: 92,
    proteinG: 48,
    fatG: 18,
    sodiumMg: 540,
    kcal: 722,
  },
];

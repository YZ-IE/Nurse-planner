export const CARE_TYPES = [
  {
    id: 'constantes_vitales', label: 'Constantes vitales', emoji: '📊', color: '#06b6d4',
    surveillance: true, grouped: true,
    subFields: [
      { key: 'ta',   label: 'TA (mmHg)',  placeholder: 'Ex: 120/80' },
      { key: 'spo2', label: 'SpO2 (%)',   placeholder: 'Ex: 98' },
      { key: 'temp', label: 'T° (°C)',    placeholder: 'Ex: 37.2' },
      { key: 'fc',   label: 'FC (bpm)',   placeholder: 'Ex: 72' },
    ],
  },
  { id: 'antalgie',  label: 'Antalgie',        emoji: '💊', color: '#f43f5e', surveillance: false },
  { id: 'bilan',     label: 'Bilan sanguin',    emoji: '🧪', color: '#a78bfa', surveillance: true,  valueLabel: 'Tubes / Note',    valuePlaceholder: 'Ex: NFS CRP prélevés' },
  { id: 'diurese',   label: 'Diurèse',         emoji: '💧', color: '#06b6d4', surveillance: true,  valueLabel: 'Volume (mL)',     valuePlaceholder: 'Ex: 350' },
  { id: 'ecg',       label: 'ECG',             emoji: '📈', color: '#a78bfa', surveillance: true,  valueLabel: 'Résultat',        valuePlaceholder: 'Ex: RS FC 72' },
  { id: 'hgt',       label: 'Glycémie (HGT)',  emoji: '🩸', color: '#f97316', surveillance: true,  valueLabel: 'Glycémie (g/L)', valuePlaceholder: 'Ex: 1.2' },
  { id: 'injection', label: 'Injection',        emoji: '💉', color: '#a78bfa', surveillance: false },
  { id: 'pansement', label: 'Pansement',        emoji: '🩹', color: '#06b6d4', surveillance: false },
  { id: 'perfusion', label: 'Perfusion',        emoji: '🫙', color: '#22c55e', surveillance: false },
  { id: 'poids',     label: 'Poids',            emoji: '⚖️', color: '#22c55e', surveillance: true,  valueLabel: 'Poids (kg)',     valuePlaceholder: 'Ex: 68' },
  { id: 'autre',     label: 'Autre',            emoji: '📋', color: '#64748b', surveillance: false },
];

export function getCareType(id) {
  return CARE_TYPES.find(t => t.id === id) || CARE_TYPES[CARE_TYPES.length - 1];
}

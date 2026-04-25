import { useState, useEffect, useRef } from 'react';
import { MedicalDisclaimer } from '../../components/MedicalDisclaimer.jsx';
import { T, s } from '../../theme.js';

const C = '#e879f9';
const DIM = '#1a0a1e';

const CATEGORIES = ['Tous', 'Antalgie', 'Cardio-Vasculaire', 'Sédation', 'Anti-infectieux', 'Diurétique', 'Anticoagulant', 'Endocrinologie'];

const MEDS = [
  {
    id: 'paracetamol',
    name: 'Paracétamol',
    dci: 'Paracétamol',
    specialites: 'Doliprane · Perfalgan · Efferalgan',
    categorie: 'Antalgie',
    icon: '💊',
    color: '#f97316',
    posologie: [
      { pop: 'Adulte (> 50 kg)', dose: '1 g toutes les 6h', max: 'Max 4 g/j' },
      { pop: 'Adulte (< 50 kg)', dose: '500 mg–1 g toutes les 6h', max: 'Max 3 g/j' },
      { pop: 'Pédiatrie', dose: '15 mg/kg/prise toutes les 6h', max: 'Max 60 mg/kg/j' },
    ],
    voies: ['PO', 'IV (perf 15 min)', 'Suppositoire'],
    indications: 'Douleur légère à modérée · Fièvre',
    ci: 'Insuffisance hépatocellulaire sévère',
    surveillance: ['Douleur (EVA)', 'Température', 'Fonction hépatique si traitement prolongé', 'Délai d\'action : 30 min PO · 15 min IV'],
    interactions: 'Anticoagulants oraux (potentialisation) · Alcool (hépatotoxicité)',
    classe: 'Analgésique non opioïde · Antipyrétique',
  },
  {
    id: 'morphine',
    name: 'Morphine',
    dci: 'Sulfate de morphine',
    specialites: 'Morphine · Skenan · Kapanol',
    categorie: 'Antalgie',
    icon: '💉',
    color: '#ef4444',
    posologie: [
      { pop: 'Adulte IV titration', dose: '2–3 mg/5–10 min', max: 'Selon EVA · surveillance' },
      { pop: 'Adulte SC', dose: '0,1 mg/kg/4h', max: 'Adapter selon réponse' },
      { pop: 'SAP IV', dose: '1–5 mg/h', max: 'Selon protocole' },
    ],
    voies: ['IV', 'SC', 'PO', 'SAP'],
    indications: 'Douleur intense · Dyspnée réfractaire · Post-opératoire',
    ci: 'Dépression respiratoire sévère · Iléus paralytique · Hypertension intracrânienne non contrôlée',
    surveillance: ['FR (risque dépression respi < 10/min)', 'SpO₂', 'Score de sédation (RASS)', 'Douleur (EVA)', 'Constipation (prévention systématique)', 'Rétention urinaire', 'Naloxone disponible'],
    interactions: 'Benzodiazépines (dépression SNC) · Alcool · Antidépresseurs IMAO',
    classe: 'Opioïde fort · Palier 3 OMS',
    alerte: '⚠️ Risque de dépression respiratoire — Naloxone 0,4 mg IV en cas d\'urgence',
  },
  {
    id: 'adrenaline',
    name: 'Adrénaline',
    dci: 'Épinéphrine',
    specialites: 'Adrénaline · Anahelp · EpiPen',
    categorie: 'Cardio-Vasculaire',
    icon: '❤️',
    color: '#ef4444',
    posologie: [
      { pop: 'ACR adulte', dose: '1 mg IV/IO toutes les 3–5 min', max: 'Sans limite en RCP' },
      { pop: 'Anaphylaxie IM', dose: '0,3–0,5 mg IM (face antéro-externe cuisse)', max: 'Répéter à 5–15 min si besoin' },
      { pop: 'Choc anaphylactique IV', dose: '0,1–1 mg IVL lent', max: 'Sous monitoring strict' },
      { pop: 'SAP (vasopresseur)', dose: '0,01–1 µg/kg/min', max: 'Titrer selon PAM cible' },
    ],
    voies: ['IV', 'IO', 'IM', 'SAP'],
    indications: 'ACR · Anaphylaxie · Choc septique réfractaire · Bradycardie sévère',
    ci: 'Aucune absolue en urgence vitale',
    surveillance: ['PA, FC en continu', 'SpO₂', 'Diurèse', 'Signes de vasoconstriction distale', 'Glycémie (hyperglycémie possible)', 'ECG (arythmie)'],
    interactions: 'Bêtabloquants (effet réduit) · Halogénés (arythmie)',
    classe: 'Catécholamine · Sympathomimétique direct α+β',
    alerte: '⚠️ Voie IV préférable uniquement si perfusion en cours — sinon IM face antérolatérale cuisse',
  },
  {
    id: 'noradrenaline',
    name: 'Noradrénaline',
    dci: 'Norépinéphrine',
    specialites: 'Noradrénaline · Levophed',
    categorie: 'Cardio-Vasculaire',
    icon: '🫀',
    color: '#ef4444',
    posologie: [
      { pop: 'Adulte SAP', dose: '0,01–3 µg/kg/min', max: 'Titrer selon PAM cible (≥ 65 mmHg)' },
    ],
    voies: ['SAP voie centrale exclusivement'],
    indications: 'Choc septique · Choc vasoplégique · Hypotension réfractaire',
    ci: 'Hypovolémie non corrigée (remplissage préalable indispensable)',
    surveillance: ['PA invasive (KTA) recommandée', 'FC, SpO₂ en continu', 'Diurèse horaire', 'Perfusion distale (ischémie)', 'Glycémie', 'Lactates'],
    interactions: 'IMAO (hypertension sévère) · Antidépresseurs tricycliques',
    classe: 'Catécholamine · Vasopresseur α++',
    alerte: '⚠️ Voie centrale OBLIGATOIRE — nécrose tissulaire en cas d\'extravasation périphérique',
  },
  {
    id: 'furosemide',
    name: 'Furosémide',
    dci: 'Furosémide',
    specialites: 'Lasilix · Furosémide',
    categorie: 'Diurétique',
    icon: '💧',
    color: '#06b6d4',
    posologie: [
      { pop: 'OAP adulte IV', dose: '40–80 mg IV lent (sur 1–2 min)', max: 'Peut répéter à 20–40 min · Max 4 mg/min' },
      { pop: 'Entretien PO', dose: '20–80 mg/j en 1–2 prises', max: 'Adapter à la diurèse' },
      { pop: 'SAP', dose: '10–40 mg/h', max: 'Selon objectif diurétique' },
    ],
    voies: ['IV', 'PO', 'SAP'],
    indications: 'OAP · Œdèmes · HTA · Hyperkaliémie (diurèse forcée) · Insuffisance rénale oligurique',
    ci: 'Hypovolémie · Anurie (sauf en urgence hyperkaliémie) · Allergie sulfamides',
    surveillance: ['Diurèse (objectif ±1–2L selon indication)', 'Ionogramme (K⁺, Na⁺, Mg²⁺)', 'Créatinine', 'PA (hypotension)', 'Ototoxicité (doses élevées IV rapide)'],
    interactions: 'Aminosides (ototoxicité++) · AINS (efficacité réduite) · IEC/Sartans (hypotension)',
    classe: 'Diurétique de l\'anse (inhibiteur Na-K-2Cl)',
  },
  {
    id: 'midazolam',
    name: 'Midazolam',
    dci: 'Midazolam',
    specialites: 'Hypnovel · Midazolam',
    categorie: 'Sédation',
    icon: '😴',
    color: '#818cf8',
    posologie: [
      { pop: 'Sédation légère IV', dose: '1–2,5 mg IVL lent (en 2 min)', max: 'Titrer par paliers de 1 mg' },
      { pop: 'SAP sédation réa', dose: '0,02–0,1 mg/kg/h', max: 'Adapter selon RASS cible' },
      { pop: 'Convulsion IM', dose: '5–10 mg IM', max: 'Ou 10 mg buccal/nasal' },
      { pop: 'Sédation palliative SC', dose: '10–60 mg/j SAP SC', max: 'Selon protocole' },
    ],
    voies: ['IV', 'IM', 'Buccal', 'Nasal', 'SAP'],
    indications: 'Sédation · Anxiolyse · Anticonvulsivant · Induction anesthésique',
    ci: 'Myasthénie · Insuffisance respiratoire sévère · Syndrome d\'apnées du sommeil (relatif)',
    surveillance: ['FR, SpO₂ (risque apnée)', 'Score de sédation RASS', 'PA (hypotension)', 'Flumazénil disponible (antagoniste)', 'Tolérance et dépendance (traitement prolongé)'],
    interactions: 'Morphine (dépression respiratoire++) · Alcool · Inhibiteurs CYP3A4 (erythromycine, kétoconazole)',
    classe: 'Benzodiazépine · Sédatif-hypnotique',
    alerte: '⚠️ Antidote : Flumazénil 0,2 mg IV — à renouveler (demi-vie courte)',
  },
  {
    id: 'heparine',
    name: 'Héparine non fractionnée',
    dci: 'Héparine sodique',
    specialites: 'Héparine sodique Panpharma',
    categorie: 'Anticoagulant',
    icon: '🩸',
    color: '#f43f5e',
    posologie: [
      { pop: 'EP/TVP adulte', dose: 'Bolus 80 UI/kg puis 18 UI/kg/h SAP', max: 'Adapter selon TCA/antiFXa' },
      { pop: 'SCA', dose: 'Bolus 60–70 UI/kg puis 12–15 UI/kg/h', max: 'Selon protocole cardio' },
      { pop: 'Prophylaxie SC', dose: '5000 UI SC toutes les 8–12h', max: 'Selon risque thrombotique' },
    ],
    voies: ['IV SAP', 'SC'],
    indications: 'Traitement TVP/EP · SCA · Prévention thrombose · Circulation extracorporelle',
    ci: 'Allergie héparine · Antécédent TIH · Saignement actif majeur',
    surveillance: ['TCA (cible 2–3x témoin) ou antiFXa (cible 0,3–0,7 UI/ml)', 'NFS (plaquettes × 2/semaine : risque TIH)', 'Saignements (points ponction, hématurie)', 'Créatinine · TP/INR si relais AVK'],
    interactions: 'AINS · Antiplaquettaires (risque hémorragique) · Nitroglycérine IV (résistance)',
    classe: 'Anticoagulant parentéral · Inhibiteur indirect thrombine + FXa',
    alerte: '⚠️ TIH type 2 : chute plaquettes > 50% entre J5–J21 — stopper IMMÉDIATEMENT et contacter médecin',
  },
  {
    id: 'insuline',
    name: 'Insuline rapide',
    dci: 'Insuline humaine ordinaire / Analogue rapide',
    specialites: 'Actrapid · Humalog · NovoRapid',
    categorie: 'Endocrinologie',
    icon: '🩺',
    color: '#22c55e',
    posologie: [
      { pop: 'Hyperglycémie modérée SC', dose: 'Selon protocole correcteur (ex: 2–4 UI SC si > 2 g/L)', max: 'Selon glycémie capillaire' },
      { pop: 'CAD/KAAD IV SAP', dose: '0,1 UI/kg/h IV (ex: 7 UI/h pour 70 kg)', max: 'Arrêt dès glycémie < 2,5 g/L' },
      { pop: 'Hyperkaliémie (protection cardiaque)', dose: '10 UI rapide + G30% 125 ml IV', max: 'Effet 30–60 min' },
    ],
    voies: ['SC', 'IV SAP (urgences uniquement)'],
    indications: 'Diabète · Hyperglycémie · CAD · Hyperkaliémie',
    ci: 'Hypoglycémie',
    surveillance: ['Glycémie capillaire (rythme selon protocole)', 'Signes d\'hypoglycémie (sueurs, tremblement, confusion)', 'Kaliémie (risque hypokaliémie sous insuline)', 'Glycosurie', 'Signes CAD (cétones, pH)'],
    interactions: 'Bêtabloquants (masquent signes hypoglycémie) · Corticoïdes (résistance)',
    classe: 'Hormone hypoglycémiante · Analogue insulinique',
    alerte: '⚠️ Hypoglycémie < 0,7 g/L : G30% 50 ml IVD ou G10% 150 ml · Glucagon 1 mg IM si voie IV impossible',
  },
  {
    id: 'amoxicilline',
    name: 'Amoxicilline',
    dci: 'Amoxicilline (± acide clavulanique)',
    specialites: 'Clamoxyl · Augmentin · Amoxicilline',
    categorie: 'Anti-infectieux',
    icon: '🦠',
    color: '#22c55e',
    posologie: [
      { pop: 'Adulte infections légères PO', dose: '500 mg–1 g × 3/j', max: 'Max 3 g/j' },
      { pop: 'Adulte infections sévères IV', dose: '1–2 g × 3–4/j', max: 'Max 12 g/j (endocardite)' },
      { pop: 'Pédiatrie', dose: '25–100 mg/kg/j en 3 prises', max: 'Max 3–6 g/j' },
    ],
    voies: ['PO', 'IV (perf 30 min)'],
    indications: 'Infections ORL · Pneumopathies communautaires · IU · Endocardite · Infection cutanée',
    ci: 'Allergie pénicillines · Mononucléose infectieuse (éruption)',
    surveillance: ['Signes d\'allergie (urticaire, anaphylaxie)', 'Efficacité clinique (apyrexie, amélioration)', 'Fonction rénale (adapter dose si IR)'],
    interactions: 'Méthotrexate (toxicité++) · Contraceptifs oraux (efficacité réduite) · Anticoagulants AVK',
    classe: 'Antibiotique bêta-lactamine · Aminopénicilline',
  },
  {
    id: 'metronidazole',
    name: 'Métronidazole',
    dci: 'Métronidazole',
    specialites: 'Flagyl · Métronidazole',
    categorie: 'Anti-infectieux',
    icon: '🦠',
    color: '#22c55e',
    posologie: [
      { pop: 'Adulte IV', dose: '500 mg IV toutes les 8h (perf 30–60 min)', max: 'Max 4 g/j' },
      { pop: 'Adulte PO', dose: '500 mg PO × 2–3/j', max: 'Selon indication' },
      { pop: 'C. difficile', dose: '500 mg × 3/j PO pendant 10 j', max: '(Vancomycine si récidive)' },
    ],
    voies: ['IV', 'PO'],
    indications: 'Infections anaérobies · C. difficile · Infections gynécologiques · Abcès cérébral',
    ci: 'Alcool (antabuse) · 1er trimestre grossesse (relatif)',
    surveillance: ['Signes neurologiques (neuropathie périphérique si prolongé)', 'Colorisation brunâtre des urines (normal)', 'Alcool strict interdit pendant et 48h après'],
    interactions: 'Alcool (effet antabuse) · AVK (potentialisation) · Disulfirame',
    classe: 'Antibiotique nitroimidazolé · Anti-anaérobie',
    alerte: '⚠️ Alcool STRICTEMENT INTERDIT pendant le traitement et 48h après (effet antabuse sévère)',
  },
  {
    id: 'dopamine',
    name: 'Dopamine',
    dci: 'Dopamine',
    specialites: 'Dopamine · Intropin',
    categorie: 'Cardio-Vasculaire',
    icon: '🫀',
    color: '#f43f5e',
    posologie: [
      { pop: 'Effet dopaminergique (rénale)', dose: '2–5 µg/kg/min', max: 'Augmentation diurèse' },
      { pop: 'Effet β+ (inotrope)', dose: '5–10 µg/kg/min', max: 'Tachycardie possible' },
      { pop: 'Effet α+ (vasopresseur)', dose: '> 10 µg/kg/min', max: 'Vasoconstriction' },
    ],
    voies: ['SAP voie centrale préférable'],
    indications: 'Choc cardiogénique · Insuffisance cardiaque décompensée',
    ci: 'Phéochromocytome · Tachyarythmies · FV',
    surveillance: ['ECG en continu (arythmies++)', 'PA, FC', 'Diurèse', 'SpO₂'],
    interactions: 'IMAO (hypertension sévère) · Phénytoïne (bradycardie, hypotension)',
    classe: 'Catécholamine · Effet dose-dépendant',
  },
  {
    id: 'naloxone',
    name: 'Naloxone',
    dci: 'Naloxone',
    specialites: 'Narcan · Naloxone',
    categorie: 'Antalgie',
    icon: '🚨',
    color: '#f97316',
    posologie: [
      { pop: 'Surdosage opioïde adulte', dose: '0,4 mg IV toutes les 2–3 min', max: 'Jusqu\'à FR > 12 ou réveil' },
      { pop: 'SAP (prévenir ré-narcotisation)', dose: '0,4–0,8 mg/h IV', max: 'Demi-vie < morphine → surveiller' },
      { pop: 'Antalgie excessive (titration)', dose: '0,04–0,1 mg IV', max: 'Paliers de 5 min · Ne pas supprimer l\'analgésie' },
    ],
    voies: ['IV', 'IM', 'SC', 'Intranasal (kit Nalscue)'],
    indications: 'Surdosage opioïde · Antagonisme opioïde',
    ci: 'Allergie naloxone (très rare)',
    surveillance: ['FR, SpO₂ (objectif FR > 12/min)', 'Conscience', 'Douleur (ne pas lever l\'analgésie brutalement)', 'Sevrage opioïde (agitation, tachycardie, sueurs) si dépendant', 'Ré-narcotisation (demi-vie 60–90 min < opioïdes longs)'],
    interactions: 'Aucune contre-indication médicamenteuse en urgence',
    classe: 'Antagoniste opioïde pur',
    alerte: '⚠️ Demi-vie de 60–90 min : une seconde injection peut être nécessaire — surveiller au minimum 2h',
  },
];

export default function Medicaments({ onBack, onBackOverride }) {
  const [selected, setSelected] = useState(null);


  const [search,   setSearch]   = useState('');
  const [cat,      setCat]      = useState('Tous');

  // Bouton retour Android — inline pour éviter ref avant définition
  useEffect(() => {
    if (!onBackOverride) return;
    onBackOverride(selected ? () => setSelected(null) : onBack);
  }, [selected]);

  const filtered = MEDS.filter(m => {
    const matchCat  = cat === 'Tous' || m.categorie === cat;
    const q         = search.toLowerCase();
    const matchSearch = !q || m.name.toLowerCase().includes(q)
      || m.dci.toLowerCase().includes(q)
      || m.specialites.toLowerCase().includes(q)
      || m.indications.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  if (selected) {
    const med = MEDS.find(m => m.id === selected);
    return <MedFiche med={med} color={C} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column' }}>
      <MedicalDisclaimer level="standard" />
      {/* Header */}
      <div style={{ background: DIM, borderBottom: `1px solid ${C}44`, padding: '14px 16px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ color: C, fontFamily: 'monospace', fontSize: 10, letterSpacing: 3 }}>MODULE</div>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 18 }}>💊 Médicaments</div>
          </div>
        </div>
        {/* Recherche */}
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.muted, fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nom, DCI, spécialité, indication…"
            style={{ ...s.input, paddingLeft: 32, fontSize: 13 }}
          />
        </div>
        {/* Catégories */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              background: cat === c ? C + '33' : T.surface,
              border: `1px solid ${cat === c ? C : T.border}`,
              color: cat === c ? C : T.muted,
              borderRadius: 20, padding: '4px 12px', fontSize: 11,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'system-ui',
            }}>{c}</button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div style={{ padding: '12px 14px', paddingBottom: 40 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: T.muted, fontSize: 13, marginTop: 40 }}>Aucun médicament trouvé</div>
        )}
        {filtered.map(med => (
          <div key={med.id} onClick={() => setSelected(med.id)} style={{
            ...s.card,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            borderLeft: `4px solid ${med.color}`,
          }}>
            <span style={{ fontSize: 26 }}>{med.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: med.color, fontWeight: 700, fontSize: 15 }}>{med.name}</span>
                <span style={{ background: med.color + '22', color: med.color, fontSize: 9, fontFamily: 'monospace', padding: '1px 6px', borderRadius: 8 }}>{med.categorie}</span>
              </div>
              <div style={{ color: T.muted, fontSize: 11, marginTop: 2 }}>{med.dci}</div>
              <div style={{ color: T.muted, fontSize: 11 }}>{med.indications.split('·')[0].trim()}</div>
            </div>
            <span style={{ color: T.muted }}>›</span>
          </div>
        ))}
        <div style={{ marginTop: 16, background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ color: T.muted, fontSize: 11, fontFamily: 'monospace', textAlign: 'center' }}>
            ⚕️ Ces fiches sont indicatives · Toujours vérifier avec le prescripteur et le référentiel de l'établissement
          </div>
        </div>
      </div>
    </div>
  );
}

function MedFiche({ med, color, onBack }) {
  const C2 = med.color;

  return (
    <div style={{ position: 'fixed', inset: 0, background: T.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: DIM, borderBottom: `1px solid ${C2}44`, padding: '12px 16px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: C2, fontSize: 20, cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ color: C2, fontWeight: 700, fontSize: 17 }}>{med.icon} {med.name}</div>
            <div style={{ color: T.muted, fontSize: 11 }}>{med.dci}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px' }}>
        {/* Spécialités */}
        <div style={{ ...s.card, background: C2 + '11', borderColor: C2 + '44', marginBottom: 10 }}>
          <div style={{ color: T.muted, fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>SPÉCIALITÉS</div>
          <div style={{ color: C2, fontSize: 13, fontWeight: 600 }}>{med.specialites}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ ...s.tag(C2), fontSize: 10 }}>{med.classe}</span>
            <span style={{ ...s.tag('#64748b'), fontSize: 10 }}>{med.categorie}</span>
          </div>
        </div>

        {/* Alerte */}
        {med.alerte && (
          <div style={{ background: '#450a0a', border: '1px solid #ef444466', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
            <div style={{ color: '#f87171', fontSize: 12, lineHeight: 1.5 }}>{med.alerte}</div>
          </div>
        )}

        {/* Posologies */}
        <div style={s.card}>
          <div style={{ color: C2, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>POSOLOGIE</div>
          {med.posologie.map((p, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < med.posologie.length - 1 ? '1px solid #1e293b' : 'none' }}>
              <div style={{ color: C2, fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{p.pop}</div>
              <div style={{ color: T.text, fontSize: 13 }}>{p.dose}</div>
              <div style={{ color: T.muted, fontSize: 11, fontFamily: 'monospace', marginTop: 2 }}>{p.max}</div>
            </div>
          ))}
        </div>

        {/* Voies */}
        <div style={{ ...s.card }}>
          <div style={{ color: C2, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>VOIES D'ADMINISTRATION</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {med.voies.map((v, i) => (
              <span key={i} style={{ ...s.tag(C2), fontSize: 11 }}>{v}</span>
            ))}
          </div>
        </div>

        {/* Indications */}
        <div style={s.card}>
          <div style={{ color: C2, fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>INDICATIONS</div>
          <div style={{ color: T.text, fontSize: 13, lineHeight: 1.6 }}>{med.indications}</div>
        </div>

        {/* CI */}
        <div style={{ ...s.card, borderLeft: '3px solid #ef4444' }}>
          <div style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>CONTRE-INDICATIONS</div>
          <div style={{ color: T.text, fontSize: 13, lineHeight: 1.6 }}>{med.ci}</div>
        </div>

        {/* Surveillance IDE */}
        <div style={{ ...s.card, borderLeft: '3px solid #fbbf24' }}>
          <div style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>SURVEILLANCE IDE</div>
          {med.surveillance.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 7 }}>
              <span style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }}>→</span>
              <span style={{ color: T.text, fontSize: 12, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Interactions */}
        <div style={{ ...s.card, borderLeft: '3px solid #f97316' }}>
          <div style={{ color: '#f97316', fontFamily: 'monospace', fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>INTERACTIONS PRINCIPALES</div>
          <div style={{ color: T.muted, fontSize: 12, lineHeight: 1.6 }}>{med.interactions}</div>
        </div>

        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
          <div style={{ color: T.muted, fontSize: 10, fontFamily: 'monospace', textAlign: 'center' }}>
            ⚕️ Fiche indicative · Vérifier avec le prescripteur et la fiche technique officielle
          </div>
        </div>
      </div>
    </div>
  );
}

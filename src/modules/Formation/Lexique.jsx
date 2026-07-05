import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, Input } from '../../ui/index.js';
const C = T.form;
const ENTREES = [
  {term:'ACLS',def:'Advanced Cardiovascular Life Support — protocole de réanimation avancée'},
  {term:'AES',def:'Accident d\'Exposition au Sang — piqûre, coupure ou projection sur muqueuse'},
  {term:'ASAT/ALAT',def:'Transaminases hépatiques (ASAT=GOT, ALAT=GPT) — marqueurs de cytolyse'},
  {term:'ATB',def:'Antibiotique'},
  {term:'AVC',def:'Accident Vasculaire Cérébral — ischémique (80%) ou hémorragique (20%)'},
  {term:'BLS',def:'Basic Life Support — réanimation de base (MCE + bouche-à-bouche)'},
  {term:'CAD',def:'CétoAcidose Diabétique — complication du diabète de type 1'},
  {term:'CAT',def:'Conduite À Tenir'},
  {term:'CIVD',def:'Coagulation Intravasculaire Disséminée — coagulopathie de consommation'},
  {term:'CRP',def:'C-Reactive Protein — protéine inflammatoire (norme < 5 mg/L)'},
  {term:'DASRI',def:'Déchets d\'Activités de Soins à Risques Infectieux — boîtes jaunes'},
  {term:'DCI',def:'Dénomination Commune Internationale — nom générique du médicament'},
  {term:'DEA/DAE',def:'Défibrillateur Externe Automatisé'},
  {term:'DEM',def:'Dissociation Électromécanique — activité électrique sans pouls'},
  {term:'EBLSE',def:'Entérobactéries Productrices de Bêta-Lactamases à Spectre Élargi — bactérie résistante'},
  {term:'ECG',def:'ÉlectroCardioGramme — enregistrement de l\'activité électrique cardiaque'},
  {term:'EP',def:'Embolie Pulmonaire — obstruction d\'une artère pulmonaire par un thrombus'},
  {term:'FAST',def:'Face Arm Speech Time — test de dépistage rapide de l\'AVC'},
  {term:'FA',def:'Fibrillation Auriculaire — arythmie supraventriculaire la plus fréquente'},
  {term:'FV',def:'Fibrillation Ventriculaire — urgence vitale, rythme chaotique ventriculaire'},
  {term:'GCS',def:'Glasgow Coma Scale — évaluation conscience (3-15 pts)'},
  {term:'HbA1c',def:'Hémoglobine glyquée — reflet de l\'équilibre glycémique sur 3 mois'},
  {term:'HBPM',def:'Héparine de Bas Poids Moléculaire (Lovenox®, Fragmine®)'},
  {term:'IDE',def:'Infirmier(e) Diplômé(e) d\'État'},
  {term:'IEC',def:'Inhibiteur de l\'Enzyme de Conversion (ex: périndopril, ramipril)'},
  {term:'IM',def:'Intramusculaire'},
  {term:'IMC',def:'Indice de Masse Corporelle = poids (kg) / taille² (m)'},
  {term:'INR',def:'International Normalized Ratio — mesure de l\'anticoagulation (norme 1 ; cible FA : 2-3)'},
  {term:'IO',def:'IntraOsseux — voie d\'urgence en cas d\'accès veineux impossible'},
  {term:'IPP',def:'Inhibiteur de la Pompe à Protons (oméprazole, pantoprazole)'},
  {term:'IRM',def:'Imagerie par Résonance Magnétique'},
  {term:'ISRS',def:'Inhibiteur Sélectif de la Recapture de la Sérotonine — antidépresseur'},
  {term:'IV',def:'IntraVeineux'},
  {term:'IVL',def:'IntraVeineux Lent (perfusion sur 15-30 min minimum)'},
  {term:'KTC',def:'Cathéter Veineux Central (Katéter TubeCenter)'},
  {term:'MCE',def:'Massage Cardiaque Externe — compressions thoraciques (100-120/min, 5-6 cm)'},
  {term:'MMSE',def:'Mini Mental State Examination — test cognitif (30 pts)'},
  {term:'NAS',def:'Nursing Activities Score — charge en soins infirmiers'},
  {term:'NFS',def:'Numération Formule Sanguine — hémogramme complet'},
  {term:'NGS',def:'Sonde Naso-Gastrique'},
  {term:'OAP',def:'Œdème Aigu du Poumon — urgence respiratoire cardiogénique'},
  {term:'OMI',def:'Œdèmes des Membres Inférieurs'},
  {term:'PA',def:'Pression Artérielle (systolique/diastolique en mmHg)'},
  {term:'PAM',def:'Pression Artérielle Moyenne = (PAS + 2×PAD) / 3 · Cible sepsis : > 65 mmHg'},
  {term:'PAS/PAD',def:'Pression Artérielle Systolique / Diastolique'},
  {term:'PCT',def:'Procalcitonine — marqueur d\'infection bactérienne (norme < 0,1 µg/L)'},
  {term:'PEP',def:'Pression Expiratoire Positive — paramètre de ventilation non invasive'},
  {term:'PFC',def:'Plasma Frais Congelé — utilisé en coagulopathie sévère'},
  {term:'PNO',def:'PneumoThorax'},
  {term:'PO',def:'Per Os — voie orale'},
  {term:'PPSB',def:'Concentré de facteurs de coagulation — antidote rapide des AVK'},
  {term:'PR',def:'Voie Per Rectale'},
  {term:'qSOFA',def:'quick Sepsis-related Organ Failure Assessment — 3 critères (FR, conscience, PA)'},
  {term:'RCP',def:'Réanimation Cardio-Pulmonaire'},
  {term:'ROSC',def:'Return Of Spontaneous Circulation — reprise de l\'activité circulatoire'},
  {term:'SAP',def:'Seringue Auto-Pousseuse — pompe à perfusion'},
  {term:'SCA',def:'Syndrome Coronarien Aigu — infarctus ou angor instable'},
  {term:'SBAR',def:'Situation Background Assessment Recommendation — outil de communication'},
  {term:'SC',def:'Sous-Cutané'},
  {term:'SDRA',def:'Syndrome de Détresse Respiratoire Aiguë'},
  {term:'SpO₂',def:'Saturation pulsée en oxygène (oxymétrie de pouls)'},
  {term:'TCA',def:'Temps de Céphaline Activée — évaluation de la voie intrinsèque de coagulation'},
  {term:'TRC',def:'Temps de Recoloration Cutanée (normal < 3 secondes)'},
  {term:'TP',def:'Taux de Prothrombine — évaluation de la coagulation (norme > 70%)'},
  {term:'TSH',def:'Thyroid Stimulating Hormone — hormone thyréotrope (norme 0,4-4 mUI/L)'},
  {term:'TV',def:'Tachycardie Ventriculaire — urgence cardiologique'},
  {term:'TVP',def:'Thrombose Veineuse Profonde'},
  {term:'VAC',def:'Vacuum-Assisted Closure — thérapie par pression négative pour les plaies'},
  {term:'VAS',def:'Voies Aériennes Supérieures'},
  {term:'VNI',def:'Ventilation Non Invasive — masque CPAP ou BiPAP'},
  {term:'VVP',def:'Voie Veineuse Périphérique'},
  {term:'5B',def:'Règle des 5 Bons : Bon médicament · Bonne dose · Bonne voie · Bon patient · Bon moment'},
];
export default function Lexique() {
  const [search,setSearch]=useState('');
  const filtered=search.trim()?ENTREES.filter(e=>e.term.toLowerCase().includes(search.toLowerCase())||e.def.toLowerCase().includes(search.toLowerCase())):ENTREES;
  return (
    <div style={{padding:'14px'}}>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher une abréviation ou un terme…" style={{marginBottom:12}}/>
      <div style={{color:T.muted,fontSize:tk.font.xs,fontWeight:600,marginBottom:10}}>{filtered.length} entrée(s)</div>
      {filtered.map((e,i)=>(
        <Card key={i} pad="sm" style={{marginBottom:8,display:'flex',gap:12,alignItems:'flex-start'}}>
          <span style={{color:C,fontWeight:700,fontSize:tk.font.base,minWidth:78,flexShrink:0}}>{e.term}</span>
          <span style={{color:T.muted,fontSize:tk.font.sm,lineHeight:1.5}}>{e.def}</span>
        </Card>
      ))}
    </div>
  );
}

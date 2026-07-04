import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Card, Chip, Input } from '../../ui/index.js';
const C = T.orga;
const NORMES = {
  'Hématologie':[
    {param:'Hémoglobine (Hb)',norme:'H: 13-17 g/dL · F: 12-16 g/dL',alerte:'< 7 g/dL : transfusion probable'},
    {param:'Hématocrite (Ht)',norme:'H: 40-54% · F: 36-47%',alerte:''},
    {param:'Globules rouges (GR)',norme:'H: 4,5-6 M/µL · F: 4-5,5 M/µL',alerte:''},
    {param:'Globules blancs (GB)',norme:'4 000-10 000/µL',alerte:'> 20 000 : infection sévère · < 1 000 : aplasie'},
    {param:'Neutrophiles',norme:'1 800-7 500/µL (45-75%)',alerte:'< 500 : aplasie sévère (isolement protecteur)'},
    {param:'Plaquettes',norme:'150 000-400 000/µL',alerte:'< 50 000 : risque hémorragique · < 20 000 : critique'},
    {param:'TP (Taux de prothrombine)',norme:'> 70% (INR < 1,3)',alerte:'< 50% : risque hémorragique · INR > 4 : critique'},
    {param:'TCA (rapport)',norme:'< 1,2 (≈ 26-38 sec)',alerte:'> 2 sous héparine : risque hémorragique'},
    {param:'Fibrinogène',norme:'2-4 g/L',alerte:'< 1 g/L : risque hémorragique sévère'},
    {param:'D-dimères',norme:'< 500 µg/L (< 0,5 mg/L FEU)',alerte:'Élevés : CIVD, EP, thrombose (non spécifique)'},
  ],
  'Biochimie':[
    {param:'Natrémie (Na+)',norme:'136-145 mmol/L',alerte:'< 125 ou > 155 : risque neurologique'},
    {param:'Kaliémie (K+)',norme:'3,5-5 mmol/L',alerte:'< 3 ou > 6 : troubles du rythme'},
    {param:'Chlorémie (Cl-)',norme:'98-106 mmol/L',alerte:''},
    {param:'Calcémie totale',norme:'2,2-2,6 mmol/L (88-104 mg/L)',alerte:'< 1,8 : tétanie · > 3 : crise hypercalcémique'},
    {param:'Magnésémie',norme:'0,75-1,05 mmol/L',alerte:'< 0,5 : arythmie, convulsions'},
    {param:'Phosphorémie',norme:'0,87-1,45 mmol/L',alerte:''},
    {param:'Glycémie à jeun',norme:'0,70-1,10 g/L (3,9-6,1 mmol/L)',alerte:'< 0,5 : hypoglycémie sévère · > 3 : urgence hyperglycémique'},
    {param:'HbA1c',norme:'< 6% (non diabétique)',alerte:'> 8% : déséquilibre chronique'},
    {param:'Créatinine (H)',norme:'59-104 µmol/L',alerte:'> 200 : insuffisance rénale sévère'},
    {param:'Créatinine (F)',norme:'45-84 µmol/L',alerte:''},
    {param:'Urée',norme:'2,5-7,5 mmol/L',alerte:'> 20 mmol/L : insuffisance rénale avancée'},
    {param:'DFG (MDRD/CKD-EPI)',norme:'> 60 mL/min/1,73m²',alerte:'< 30 : IRC sévère (adapter médicaments)'},
  ],
  'Enzymes & Protéines':[
    {param:'Troponine Ic (HS)',norme:'< 14 ng/L (H) · < 9 ng/L (F)',alerte:'Élévation : nécrose myocardique (SCA, EP, myocardite)'},
    {param:'CPK',norme:'< 200 UI/L (H) · < 170 UI/L (F)',alerte:'> 1000 : rhabdomyolyse'},
    {param:'CRP',norme:'< 5 mg/L',alerte:'> 100 : infection bactérienne probable'},
    {param:'Procalcitonine (PCT)',norme:'< 0,1 µg/L',alerte:'> 0,5 : sepsis · > 2 : sepsis sévère'},
    {param:'Albumine',norme:'35-50 g/L',alerte:'< 25 : hypoalbuminémie sévère (œdèmes, pharmacocinétique)'},
    {param:'Protéines totales',norme:'60-80 g/L',alerte:''},
    {param:'Transaminases ASAT',norme:'< 40 UI/L',alerte:'> 3N : hépatopathie significative'},
    {param:'Transaminases ALAT',norme:'< 40 UI/L (H) · < 35 UI/L (F)',alerte:''},
    {param:'GGT',norme:'< 55 UI/L (H) · < 38 UI/L (F)',alerte:'Élevées : hépatopathie, alcool, médicaments'},
    {param:'Bilirubine totale',norme:'< 17 µmol/L (< 10 mg/L)',alerte:'> 50 µmol/L : ictère visible'},
    {param:'Lipase',norme:'< 60 UI/L',alerte:'> 3N : pancréatite probable'},
    {param:'TSH',norme:'0,4-4 mUI/L',alerte:'< 0,1 : hyperthyroïdie · > 10 : hypothyroïdie'},
    {param:'LDH',norme:'< 248 UI/L',alerte:'Élevée : lyse cellulaire (EP, anémie hémolytique, nécrose)'},
  ],
  'Gaz du sang (artériels)':[
    {param:'pH',norme:'7,38-7,42',alerte:'< 7,35 : acidose · > 7,45 : alcalose'},
    {param:'PaO₂',norme:'80-100 mmHg',alerte:'< 60 : insuffisance respiratoire (oxygène requis)'},
    {param:'PaCO₂',norme:'35-45 mmHg',alerte:'> 50 : hypercapnie · < 30 : hyperventilation'},
    {param:'HCO₃-',norme:'22-26 mmol/L',alerte:'< 18 : acidose métabolique · > 28 : alcalose métabolique'},
    {param:'SpO₂',norme:'95-99%',alerte:'< 92% : O₂ requis · < 88% : détresse respiratoire'},
    {param:'Lactates',norme:'< 2 mmol/L',alerte:'> 4 mmol/L : choc, hypoperfusion sévère'},
    {param:'BE (Base Excess)',norme:'-2 à +2 mmol/L',alerte:'< -4 : acidose métabolique · > +4 : alcalose métabolique'},
  ],
};
export default function NormesBio() {
  const [cat,setCat]=useState(Object.keys(NORMES)[0]);
  const [search,setSearch]=useState('');
  const filtered=search.trim()?Object.values(NORMES).flat().filter(n=>n.param.toLowerCase().includes(search.toLowerCase())):NORMES[cat];
  return (
    <div style={{padding:'14px'}}>
      <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un paramètre…" style={{marginBottom:12}}/>
      {!search.trim()&&(
        <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:12}}>
          {Object.keys(NORMES).map(k=>(
            <Chip key={k} color={C} active={cat===k} onClick={()=>setCat(k)}>{k}</Chip>
          ))}
        </div>
      )}
      {filtered.map((n,i)=>(
        <Card key={i} pad="sm" style={{marginBottom:8}}>
          <div style={{color:C,fontWeight:tk.weight.bold,fontSize:tk.font.base,marginBottom:5}}>{n.param}</div>
          <div style={{color:T.text,fontSize:tk.font.base,marginBottom:n.alerte?5:0,fontWeight:tk.weight.med}}>{n.norme}</div>
          {n.alerte&&<div style={{color:T.warning,fontSize:tk.font.sm,lineHeight:1.5}}>⚠️ {n.alerte}</div>}
        </Card>
      ))}
    </div>
  );
}

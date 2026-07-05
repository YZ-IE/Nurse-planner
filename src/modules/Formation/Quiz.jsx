/**
 * Quiz.jsx — Formation v4
 * 5 thèmes · 30+ questions · Sélection par thème ou mélangé
 */

import { useState } from 'react';
import { T, s, tk } from '../../theme.js';
import { Btn, Card, Chip } from '../../ui/index.js';
const C = T.form;

const THEMES = {
  urgences:      { label: 'Urgences & Sepsis',     icon: '🚨', color: '#f43f5e' },
  pharmacologie: { label: 'Pharmacologie IDE',     icon: '💊', color: '#a78bfa' },
  soins:         { label: 'Soins techniques',      icon: '🩺', color: '#06b6d4' },
  surveillance:  { label: 'Surveillance & Scores', icon: '📊', color: '#22c55e' },
  pathologies:   { label: 'Pathologies courantes', icon: '🫀', color: '#f97316' },
};

const QUESTIONS = [
  // ── Urgences & Sepsis ──
  { theme: 'urgences', q: 'Quel est le premier traitement de l\'anaphylaxie ?', opts: ['Corticoïdes IV', 'Antihistaminiques', 'Adrénaline IM 0,5 mg', 'Bronchodilatateurs'], rep: 2, expl: 'L\'adrénaline IM cuisse externe est le seul traitement de 1ère intention. La dose adulte est 0,5 mg IM. Les antihistaminiques et corticoïdes sont adjuvants.' },
  { theme: 'urgences', q: 'Le bundle sepsis 1h comprend :', opts: ['Hémocultures + ATB + Lactates', 'ATB + Corticoïdes + Oxygène', 'Remplissage + ATB + Héparine', 'Hémocultures + Corticoïdes + Vasopresseurs'], rep: 0, expl: 'Bundle 1h : hémocultures AVANT ATB, ATB spectre large, mesure lactates, remplissage si hypotension ou lactates > 4. Chaque heure de retard augmente la mortalité de ~7%.' },
  { theme: 'urgences', q: 'Un qSOFA ≥ 2 correspond à (au moins 2 parmi) :', opts: ['Fièvre, tachycardie, hypotension', 'FR ≥ 22/min, conscience altérée, PAS ≤ 100', 'SpO₂ < 94%, FC > 100, T° > 38,5', 'Glasgow < 10, FR > 25, diurèse < 0,5 mL/kg/h'], rep: 1, expl: 'qSOFA : FR ≥ 22/min, GCS < 15 (altération conscience), PAS ≤ 100 mmHg. Score 0-3. ≥ 2 = risque élevé de mauvaise évolution infectieuse.' },
  { theme: 'urgences', q: 'En cas d\'ACR, le ratio compressions/ventilations est :', opts: ['15:2', '30:2', '15:1', '5:1'], rep: 1, expl: '30 compressions pour 2 insufflations. Fréquence 100-120/min, profondeur ≥ 5 cm. Minimiser les interruptions. Le rapport 30:2 est validé chez l\'adulte.' },
  { theme: 'urgences', q: 'L\'hypoglycémie sévère (patient inconscient) se traite en premier par :', opts: ['Resucrage oral', 'Glucagon 1 mg IM ou SC', 'Glucosé 30% 50 mL IV', 'Insuline rapide'], rep: 2, expl: 'Si abord veineux possible : G30% 30-50 mL IV. Si non : glucagon 1 mg IM/SC. Le resucrage oral est contre-indiqué si trouble de conscience (risque d\'inhalation).' },
  { theme: 'urgences', q: 'Signe d\'une embolie pulmonaire grave :', opts: ['Bradycardie + hypertension', 'Tachycardie + hypotension + désaturation', 'Fièvre + toux + douleur pleurale seule', 'Douleur thoracique + bradycardie'], rep: 1, expl: 'L\'EP grave se présente par tachycardie, hypotension (choc obstructif), désaturation. L\'écho montre une dilatation du VD. Urgence thérapeutique (thrombolyse ou embolectomie).' },

  // ── Pharmacologie IDE ──
  { theme: 'pharmacologie', q: 'L\'antidote de l\'héparine non fractionnée est :', opts: ['Vitamine K', 'Sulfate de protamine', 'Flumazénil', 'Naloxone'], rep: 1, expl: '1 mg protamine pour 100 UI HNF. Vitamine K antagonise les AVK. Flumazénil = antidote benzodiazépines. Naloxone = antidote opioïdes.' },
  { theme: 'pharmacologie', q: 'L\'hypokaliémie potentialise la toxicité de :', opts: ['Paracétamol', 'Warfarine', 'Digoxine', 'Morphine'], rep: 2, expl: 'La digoxine se fixe sur la Na/K-ATPase. L\'hypokaliémie compète avec la digoxine sur ce site et augmente sa toxicité → arythmies.' },
  { theme: 'pharmacologie', q: 'Contre-indication absolue au tramadol :', opts: ['Insuffisance rénale modérée', 'Association aux IMAO', 'Alcoolisme chronique', 'Asthme léger'], rep: 1, expl: 'Association tramadol + IMAO = risque de syndrome sérotoninergique grave. Délai de 14 jours minimum après arrêt d\'un IMAO non sélectif.' },
  { theme: 'pharmacologie', q: 'Le méthotrexate ne doit pas être associé à :', opts: ['Paracétamol', 'AINS / aspirine', 'Fer', 'Calcium'], rep: 1, expl: 'Les AINS et aspirine réduisent l\'élimination rénale du méthotrexate → toxicité sévère. Association formellement contre-indiquée à doses méthotrexate > 20 mg/semaine.' },
  { theme: 'pharmacologie', q: 'La warfarine (Coumadine) est antagonisée par :', opts: ['Vitamine C', 'Vitamine K', 'Vitamine B12', 'Protamine'], rep: 1, expl: 'La vitamine K est l\'antidote des AVK. Elle agit en 6-24h PO, plus rapidement en IV. Dose : 5-10 mg selon l\'urgence et l\'INR cible.' },
  { theme: 'pharmacologie', q: 'L\'amiodarone (Cordarone) peut provoquer :', opts: ['Hyperthyroïdie ou hypothyroïdie', 'Hyperglycémie uniquement', 'Hypokaliémie seulement', 'Aucun effet thyroïdien'], rep: 0, expl: 'L\'amiodarone contient 37% d\'iode. Elle peut induire hypo- ou hyperthyroïdie. Surveillance TSH tous les 6 mois. Photosensibilisation et dépôts cornéens également fréquents.' },

  // ── Soins techniques ──
  { theme: 'soins', q: 'L\'ordre de remplissage des tubes est :', opts: ['EDTA → Citrate → Sec', 'Citrate → Sec → Héparine → EDTA', 'Héparine → Citrate → EDTA → Sec', 'Sec → EDTA → Citrate → Héparine'], rep: 1, expl: 'Ordre international : (hémocultures) → Citrate bleu → Sec/Gel → Héparine vert → EDTA violet → Fluorure gris. Évite la contamination croisée anticoagulants.' },
  { theme: 'soins', q: 'Le sondage urinaire chez la femme adulte utilise :', opts: ['CH 10-12', 'CH 14-16', 'CH 18-20', 'CH 22-24'], rep: 1, expl: 'CH 14-16 standard chez la femme adulte. CH 12-14 femme âgée avec urètre atrophié. Sonde CH 18 si rétention chronique avec résidu > 500 mL. Sonde CH 10-12 chez l\'enfant.' },
  { theme: 'soins', q: 'Combien de temps maintenir la désinfection avant ponction ?', opts: ['10 secondes', '30 s friction + 30 s séchage', '15 secondes', '1 minute'], rep: 1, expl: '4 temps : nettoyage, rinçage, antisepsie (30s friction), séchage (30s). Le séchage est ESSENTIEL : alcool humide → dilution antiseptique → inefficacité.' },
  { theme: 'soins', q: 'Quel calibre de VVP pour une transfusion rapide ?', opts: ['G22', 'G20', 'G18', 'G16 ou G14'], rep: 3, expl: 'G16 : 210 mL/min, G14 : 330 mL/min → adaptés à l\'urgence. G22 : 36 mL/min → insuffisant pour un choc. G18 acceptable pour transfusion standard.' },
  { theme: 'soins', q: 'La pose d\'une NGS : vérification du bon positionnement par :', opts: ['Radiographie thoracique seule', 'Aspiration contenu gastrique + pH < 5 + radio', 'Auscultation bulles en injectant air', 'Couleur des sécrétions'], rep: 1, expl: 'La vérification fiable associe : aspiration liquide gastrique + pH < 5,5 (papier pH) + contrôle radiographique si doute. L\'auscultation seule est insuffisante (risque bronchique).' },
  { theme: 'soins', q: 'Lors d\'une ponction artérielle (gaz du sang), le site de 1er choix est :', opts: ['Artère ulnaire', 'Artère radiale', 'Artère fémorale', 'Artère humérale'], rep: 1, expl: 'L\'artère radiale est préférée (test d\'Allen préalable). Elle est superficielle, accessible, et la circulation collatérale ulnaire permet la sécurité en cas de thrombose.' },

  // ── Surveillance & Scores ──
  { theme: 'surveillance', q: 'Score Norton ≤ 13 correspond à :', opts: ['Risque faible d\'escarre', 'Risque modéré', 'Risque élevé', 'Risque très élevé'], rep: 2, expl: 'Norton : ≥ 18 = faible · 14-17 = modéré · 10-13 = élevé · < 10 = très élevé. ≤ 13 → matelas anti-escarres + retournements/2h.' },
  { theme: 'surveillance', q: 'Le Glasgow ≤ 8 indique :', opts: ['Surveillance simple', 'Protection VAS à discuter', 'Sortie possible', 'Sédation à arrêter'], rep: 1, expl: 'GCS ≤ 8 = conscience sévèrement altérée. Protection des VAS (intubation) à discuter. GCS < 9 est une indication habituelle d\'intubation.' },
  { theme: 'surveillance', q: 'Le score de Morse évalue le risque de :', opts: ['Dénutrition', 'Chute', 'Douleur', 'Escarre'], rep: 1, expl: 'Morse : 0-24 faible · 25-44 modéré · ≥ 45 élevé. 6 critères : chutes antérieures, diagnostic secondaire, aide à la marche, VVP/héparinisation, démarche, état mental.' },
  { theme: 'surveillance', q: 'La NEWS2 détecte précocement :', opts: ['Le risque de chute', 'La dégradation clinique imminente', 'Le niveau de conscience seulement', 'L\'état nutritionnel'], rep: 1, expl: 'NEWS2 (6 paramètres) : FR, SpO2, besoin O2, TA, FC, température + conscience. Score ≥ 7 = risque élevé de dégradation → escalade de soins. Sensibilité supérieure aux signes isolés.' },
  { theme: 'surveillance', q: 'Le score CAM est spécifique du diagnostic de :', opts: ['Démence', 'Delirium (syndrome confusionnel aigu)', 'Dépression', 'Anxiété'], rep: 1, expl: 'CAM (Confusion Assessment Method) : début aigu + fluctuation + inattention + désorganisation/conscience altérée. Sensibilité 94-100%, spécificité 90-95%.' },
  { theme: 'surveillance', q: 'En nutrition parentérale, l\'osmolarité max pour une VVP est :', opts: ['< 500 mOsm/L', '< 800 mOsm/L', '< 1200 mOsm/L', 'Sans limite'], rep: 1, expl: 'Osmolarité ≤ 800 mOsm/L en VVP pour limiter le risque de thrombophlébite. Au-delà, voie centrale obligatoire. Les solutions hyperosmolaires sont sclérosantes pour les veines périphériques.' },

  // ── Pathologies courantes ──
  { theme: 'pathologies', q: 'La position de sécurité après un AVC ischémique est :', opts: ['Trendelenburg', 'Proclive 30° + tête neutre', 'Décubitus latéral strict', 'Flat bed complet'], rep: 1, expl: 'Proclive 30° améliore la pression de perfusion cérébrale. Tête en position neutre évite la compression jugulaire. Éviter Trendelenburg (augmente HTIC).' },
  { theme: 'pathologies', q: 'En post-IDM, la troponine Hs se positive à :', opts: ['Immédiatement', '1-3h après le début des symptômes', '6-12h seulement', '24h'], rep: 1, expl: 'La troponine Hs se positive en 1-3h (pic à 12-24h). Dosage à H0 et H1 ou H0 et H3. La CK-MB est moins spécifique (monte et descend plus vite).' },
  { theme: 'pathologies', q: 'L\'OAP se reconnaît par :', opts: ['Bradypnée + cyanose discrète', 'Orthopnée + crépitants bilatéraux + expectoration rosée', 'Fièvre + toux sèche + douleur thoracique', 'Sibilants + inspiration longue'], rep: 1, expl: 'OAP cardiogénique : dyspnée +++ position assise (orthopnée), crépitants bilatéraux en marée montante, expectorations mousseuses rosées, râles sibilants possibles. SpO2 effondrée.' },
  { theme: 'pathologies', q: 'L\'hyperkaliémie grave (> 6,5 mmol/L) est traitée en urgence par :', opts: ['Furosémide seul', 'Gluconate de calcium IV + bicarbonate + kayexalate', 'Potassium supplémentaire', 'Digoxine'], rep: 1, expl: 'Urgence : gluconate Ca2+ (cardioprotection 10 min) + bicarbonate/insuline+G30% (transfert intracellulaire) + kayexalate ou dialyse si persistance. Monitoring ECG continu.' },
  { theme: 'pathologies', q: 'En cas d\'hémorragie digestive haute, quelle est la position préférentielle ?', opts: ['Trendelenburg', 'Décubitus latéral gauche', 'Proclive 30-45°', 'Décubitus dorsal plat'], rep: 2, expl: 'Position demi-assise (30-45°) réduit le reflux et l\'inhalation. VVP G16+, scope, aspiration gastrique possible. En choc hémorragique : décubitus dorsal + surélévation membres inférieurs temporairement.' },
  { theme: 'pathologies', q: 'Le diabète insipide se caractérise par :', opts: ['Hypoglycémie + soif', 'Polyurie > 3L/j + densité urinaire basse + hypernatrémie', 'Oligurie + hypernatrémie', 'Polyurie + glycosurie'], rep: 1, expl: 'Diabète insipide : déficit ADH (central) ou insensibilité rénale (néphrogénique). Polyurie > 3L/j, urines très diluées (densité < 1005), hypernatrémie par déshydratation hypertonique.' },
];

function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ─── Composant Quiz ───────────────────────────────────────────────────────────

function QuizSession({ questions, onDone }) {
  const [idx,      setIdx]      = useState(0);
  const [answered, setAnswered] = useState(null);
  const [score,    setScore]    = useState(0);

  const q = questions[idx];
  const th = THEMES[q.theme];

  function handleAnswer(i) {
    if (answered !== null) return;
    setAnswered(i);
    if (i === q.rep) setScore(s => s + 1);
  }

  function next() {
    if (idx < questions.length - 1) { setIdx(i => i + 1); setAnswered(null); }
    else onDone(score + (answered === q.rep ? 1 : 0), questions.length);
  }

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Chip color={th.color} active>{th.icon} {th.label}</Chip>
        <span style={{ color: T.muted, fontSize: tk.font.sm, fontWeight: 600 }}>Q{idx + 1}/{questions.length} · {score}✓</span>
      </div>
      <div style={{ background: T.border, borderRadius: 4, height: 4, marginBottom: 16 }}>
        <div style={{ background: C, height: 4, borderRadius: 4, width: `${idx / questions.length * 100}%`, transition: 'width 0.3s' }} />
      </div>

      <Card>
        <div style={{ color: T.text, fontSize: tk.font.md, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>{q.q}</div>
        {q.opts.map((opt, i) => {
          const isCorrect  = i === q.rep;
          const isSelected = answered === i;
          let bg = T.bg, border = T.border, color = T.text;
          if (answered !== null) {
            if (isCorrect)       { bg = T.successDim; border = T.success; color = T.success; }
            else if (isSelected) { bg = T.dangerDim; border = T.danger; color = T.danger; }
            else                 { color = T.muted; }
          }
          return (
            <button key={i} onClick={() => handleAnswer(i)}
              style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', minHeight: tk.touch.min, background: bg, border: `1.5px solid ${border}`, borderRadius: tk.radius.sm, padding: '10px 12px', marginBottom: 8, cursor: answered !== null ? 'default' : 'pointer', textAlign: 'left', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${border}33`, border: `1.5px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: tk.font.xs, fontWeight: 700, flexShrink: 0 }}>
                {String.fromCharCode(65 + i)}
              </div>
              <span style={{ color, fontSize: tk.font.sm }}>{opt}</span>
            </button>
          );
        })}

        {answered !== null && (
          <div style={{ background: answered === q.rep ? T.successDim : T.dangerDim, border: `1px solid ${answered === q.rep ? T.success : T.danger}44`, borderRadius: tk.radius.sm, padding: 12, marginTop: 8 }}>
            <div style={{ color: answered === q.rep ? T.success : T.danger, fontWeight: 700, fontSize: tk.font.sm, marginBottom: 5 }}>
              {answered === q.rep ? '✓ Bonne réponse !' : '✗ Incorrect'}
            </div>
            <div style={{ color: T.muted, fontSize: tk.font.sm, lineHeight: 1.6 }}>{q.expl}</div>
            <Btn color={C} size="md" onClick={next} style={{ marginTop: 10 }}>
              {idx < questions.length - 1 ? 'Suivant →' : 'Résultats'}
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Résultats ────────────────────────────────────────────────────────────────

function Results({ score, total, onRestart }) {
  const pct = Math.round(score / total * 100);
  const pass = pct >= 70;
  const resultColor = pass ? T.success : T.danger;
  return (
    <div style={{ padding: 16 }}>
      <Card dim={pass ? T.successDim : T.dangerDim} style={{ border: `1px solid ${resultColor}44`, textAlign: 'center' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>{pct >= 80 ? '🏆' : pct >= 60 ? '👍' : '📚'}</div>
        <div style={{ color: resultColor, fontSize: 30, fontWeight: 700 }}>{score}/{total}</div>
        <div style={{ color: T.muted, fontSize: tk.font.base, marginTop: 4 }}>{pct}% de bonnes réponses</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm, marginTop: 6 }}>
          {score === total ? 'Parfait !' : pct >= 80 ? 'Excellent !' : pct >= 60 ? 'Bien, continuez !' : 'Révisez les explications.'}
        </div>
        <Btn color={C} size="lg" onClick={onRestart} style={{ marginTop: 16 }}>Recommencer</Btn>
      </Card>
    </div>
  );
}

// ─── Sélection du thème ───────────────────────────────────────────────────────

export default function Quiz() {
  const [mode,   setMode]   = useState(null); // null | 'all' | themeId
  const [result, setResult] = useState(null);
  const [questions, setQuestions] = useState([]);

  function startMode(m) {
    const pool = m === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.theme === m);
    setQuestions(shuffle(pool));
    setMode(m);
    setResult(null);
  }

  if (result) return <Results score={result.score} total={result.total} onRestart={() => { setMode(null); setResult(null); }} />;
  if (mode)   return <QuizSession questions={questions} onDone={(score, total) => setResult({ score, total })} />;

  return (
    <div style={{ padding: 14 }}>
      <div style={{ color: T.text, fontSize: tk.font.lg, fontWeight: 700, marginBottom: 4 }}>Choisissez un thème</div>
      <div style={{ color: T.muted, fontSize: tk.font.sm, marginBottom: 16 }}>{QUESTIONS.length} questions au total</div>

      {/* Tout mélangé */}
      <Card onClick={() => startMode('all')} accent={C}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>🎲</span>
          <div>
            <div style={{ color: C, fontWeight: 700, fontSize: tk.font.base }}>Tout mélangé</div>
            <div style={{ color: T.muted, fontSize: tk.font.xs }}>{QUESTIONS.length} questions · Tous thèmes</div>
          </div>
        </div>
      </Card>

      {/* Par thème */}
      {Object.entries(THEMES).map(([id, th]) => {
        const count = QUESTIONS.filter(q => q.theme === id).length;
        return (
          <Card key={id} onClick={() => startMode(id)} accent={th.color}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 26 }}>{th.icon}</span>
              <div>
                <div style={{ color: th.color, fontWeight: 700, fontSize: tk.font.base }}>{th.label}</div>
                <div style={{ color: T.muted, fontSize: tk.font.xs }}>{count} questions</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

import { useState } from 'react';
import { T, tk } from '../../theme.js';
import { Btn, Card } from '../../ui/index.js';
const C = T.form;

const CAS = [
  {
    titre: 'M. Dupont, 78 ans — Douleur thoracique',
    context: 'M. Dupont, 78 ans, est hospitalisé en cardiologie pour surveillance post-stent. À 14h, il sonne et se plaint d\'une douleur thoracique oppressive 7/10, irradiant dans le bras gauche. Il transpire. FC 98 bpm, PA 95/60 mmHg, SpO₂ 93%.',
    questions: [
      {
        q: 'Quelle est votre 1ère action ?',
        correct: 'Appel médecin URGENT + scope',
        options: ['Appel médecin URGENT + scope', 'Donner un antalgique', 'Mesurer à nouveau la PA', 'Rassurer le patient et observer'],
        explication: 'Devant un tableau de SCA probable (douleur thoracique + irradiation + sueurs + hypotension), l\'appel médecin immédiat et la mise sous scope sont prioritaires. Tout retard peut être fatal.',
      },
      {
        q: 'Quel examen réalisez-vous en priorité ?',
        correct: 'ECG 12 dérivations immédiat',
        options: ['ECG 12 dérivations immédiat', 'Bilan biologique', 'Radio thorax', 'Écho cardiaque'],
        explication: 'L\'ECG 12 dérivations doit être réalisé dans les 10 minutes. Il permet de confirmer ou d\'infirmer un STE (sus-décalage ST) et de guider la prise en charge (thrombolyse, coronarographie).',
      },
      {
        q: 'Quelle position adoptez-vous ?',
        correct: 'Demi-assise (position antalgique)',
        options: ['Demi-assise (position antalgique)', 'Décubitus dorsal strict', 'Trendelenburg', 'Décubitus latéral gauche'],
        explication: 'La position demi-assise diminue le retour veineux, réduit le travail cardiaque et améliore le confort respiratoire. Le Trendelenburg est contre-indiqué en cas d\'insuffisance cardiaque.',
      },
    ],
    conclusion: 'Ce tableau évoque un SCA. Priorités : ECG immédiat, appel médecin, VVP G16, bilan : troponine Hs, NFS, TP/TCA, groupe. Préparer aspirine 250 mg et anticoagulation selon prescription.',
  },
  {
    titre: 'Mme Martin, 65 ans — Fièvre et frissons',
    context: 'Mme Martin, 65 ans, diabétique, revient de salle de bain tremblante. T° 39,8°C, FC 118/min, FR 24/min, PA 88/55 mmHg, SpO₂ 95%, légèrement confuse (GCS 14).',
    questions: [
      {
        q: 'Quel score calculez-vous en priorité ?',
        correct: 'qSOFA (FR ≥ 22, confusion, PAS ≤ 100)',
        options: ['qSOFA (FR ≥ 22, confusion, PAS ≤ 100)', 'Score de Norton', 'Glasgow seul', 'Score Morse'],
        explication: 'Le qSOFA est le score de dépistage rapide du sepsis. Ici il est à 3/3 (FR 24 ≥ 22, confusion, PAS 88 ≤ 100), ce qui impose une prise en charge immédiate.',
      },
      {
        q: 'Quels prélèvements en urgence ?',
        correct: 'Hémocultures x2 + lactates + bilan biologique complet',
        options: ['Hémocultures x2 + lactates + bilan biologique complet', 'ECBU seul', 'NFS seule', 'Attendre la baisse de température'],
        explication: 'Les hémocultures (x2, sites différents) doivent être prélevées AVANT les antibiotiques. Les lactates évaluent l\'hypoperfusion tissulaire. Un lactat > 2 mmol/L signe le choc septique.',
      },
      {
        q: 'Dans quel délai les ATB doivent-ils être administrés ?',
        correct: 'Dans l\'heure qui suit (bundle sepsis 1h)',
        options: ['Dans l\'heure qui suit (bundle sepsis 1h)', 'Dans les 6 heures', 'Après les résultats d\'hémocultures', 'Après l\'antibiogramme'],
        explication: 'Le bundle sepsis impose des ATB à large spectre dans la 1ère heure. Chaque heure de retard augmente la mortalité de ~7%. On n\'attend jamais les résultats bactériologiques pour débuter.',
      },
    ],
    conclusion: 'Sepsis grave avec dysfonction d\'organe. Bundle 1h : hémocultures, ATB spectre large, lactates, remplissage NaCl 30 ml/kg si hypotension, noradrénaline si nécessaire.',
  },
  {
    titre: 'M. Leroy, 55 ans — Sous Warfarine',
    context: 'M. Leroy reçoit de la Warfarine pour FA. INR du jour : 4,8. Aucun saignement visible. Il prend du Paracétamol 2g/j depuis 2 semaines pour douleurs lombaires.',
    questions: [
      {
        q: 'Quelle est la cause probable du surdosage ?',
        correct: 'Potentialisation de la Warfarine par Paracétamol > 2g/j',
        options: ['Potentialisation de la Warfarine par Paracétamol > 2g/j', 'Erreur de dose de Warfarine', 'Alimentation riche en vitamine K', 'Sous-dosage chronique'],
        explication: 'Le Paracétamol à doses > 2g/j potentialise l\'effet anticoagulant de la Warfarine via l\'inhibition du métabolisme hépatique. Cette interaction est sous-estimée en pratique clinique.',
      },
      {
        q: 'INR 4,8 sans saignement : quelle conduite ?',
        correct: 'Arrêt ou adaptation Warfarine + contrôle INR 24-48h selon médecin',
        options: ['Arrêt ou adaptation Warfarine + contrôle INR 24-48h selon médecin', 'Injecter Vitamine K immédiatement', 'Poursuivre le traitement normalement', 'Transfusion PFC d\'emblée'],
        explication: 'En l\'absence de saignement, on adapte la posologie selon prescription médicale et on contrôle l\'INR. La Vitamine K n\'est pas systématique à 4,8 sans hémorragie. Le PFC est réservé aux urgences hémorragiques.',
      },
      {
        q: 'Quels signes vous alerteraient immédiatement ?',
        correct: 'Hématurie, épistaxis, méléna, hématome, céphalées intenses',
        options: ['Hématurie, épistaxis, méléna, hématome, céphalées intenses', 'Légère fatigue', 'Prise de poids de 500g', 'Légère toux sèche'],
        explication: 'Tout saignement spontané (urinaire, digestif, ORL, cutané) ou céphalées intenses (hémorragie cérébrale) doit conduire à un appel médecin immédiat. L\'antidote est la Vitamine K ou le PPSB en urgence.',
      },
    ],
    conclusion: 'Interaction Warfarine-Paracétamol (> 2g/j). Prévenir le médecin. Surveiller tout signe hémorragique. Antidote : Vitamine K (délai 6-24h) ou PPSB si saignement grave.',
  },
  {
    titre: 'M. Bensaid, 42 ans — Post-opératoire J1',
    context: 'M. Bensaid, 42 ans, est en post-op J1 d\'une appendicectomie sous AG. Il signale une douleur EVA 6/10 au site opératoire, FR 22/min, SpO₂ 94% sous air ambiant, T° 37,9°C, légèrement agité.',
    questions: [
      {
        q: 'La SpO₂ à 94% post-AG : quelle est votre priorité ?',
        correct: 'Oxygénothérapie + stimuler la respiration profonde',
        options: ['Oxygénothérapie + stimuler la respiration profonde', 'Appeler immédiatement le réanimateur', 'Donner un bronchodilatateur', 'Ne rien faire, c\'est normal post-op'],
        explication: 'Une SpO₂ 94% en post-op immédiat évoque une atélectasie ou une hypoventilation par douleur. Oxygène + kinésithérapie respiratoire (toux dirigée, spirométrie) sont les 1ers gestes. L\'objectif est SpO₂ ≥ 95%.',
      },
      {
        q: 'EVA 6/10 post-op J1 : quelle analgésie de 1ère intention ?',
        correct: 'Paracétamol + AINS selon prescription (palier 1-2)',
        options: ['Paracétamol + AINS selon prescription (palier 1-2)', 'Morphine IV d\'emblée', 'Attendre que la douleur passe', 'Diazépam pour calmer l\'agitation'],
        explication: 'L\'analgésie multimodale (paracétamol + AINS) est le standard post-op. La morphine est réservée si EVA > 7 ou échec palier 1-2. L\'agitation est souvent due à la douleur non traitée.',
      },
      {
        q: 'T° 37,9°C à J1 post-op : comment interprétez-vous ?',
        correct: 'Fièvre inflammatoire post-op normale — surveiller l\'évolution',
        options: ['Fièvre inflammatoire post-op normale — surveiller l\'évolution', 'Infection du site opératoire certaine', 'Sepsis — hémocultures et ATB immédiats', 'Réaction anesthésique — arrêt de tous traitements'],
        explication: 'Une fièvre < 38,5°C à J1 est quasi systématique et liée à la réponse inflammatoire chirurgicale. Une infection du site opératoire apparaît plutôt à J3-J5. Surveiller l\'évolution thermique.',
      },
    ],
    conclusion: 'Post-op J1 : prioriser analgésie efficace, prévention des atélectasies (kiné respi, mobilisation précoce), et surveillance des signes d\'infection différée (J3-J5).',
  },
  {
    titre: 'Mme Petit, 82 ans — Chute et confusion',
    context: 'Mme Petit, 82 ans, sous Amlodipine et Furosémide, est retrouvée au sol par l\'aide-soignante. Elle est confuse (GCS 13), PA 88/50 mmHg, FC 54 bpm, elle dit avoir eu "un malaise". Pas de traumatisme crânien visible.',
    questions: [
      {
        q: 'Quelle cause suspectez-vous en priorité ?',
        correct: 'Hypotension orthostatique ou effet indésirable médicamenteux',
        options: ['Hypotension orthostatique ou effet indésirable médicamenteux', 'AVC ischémique', 'Hypoglycémie', 'Épilepsie'],
        explication: 'Furosémide (diurétique) + Amlodipine (vasodilatateur) chez une patiente âgée = risque élevé d\'hypotension orthostatique. La bradycardie à 54 bpm oriente aussi vers un effet médicamenteux. Vérifier la glycémie reste important.',
      },
      {
        q: 'Quel examen faites-vous immédiatement au lit ?',
        correct: 'Glycémie capillaire + ECG',
        options: ['Glycémie capillaire + ECG', 'Scanner cérébral', 'Radio du rachis en urgence', 'EEG'],
        explication: 'La glycémie capillaire élimine une hypoglycémie (cause fréquente et réversible de confusion). L\'ECG recherche un trouble du rythme ou de la conduction (bradycardie à 54, bloc ?).',
      },
      {
        q: 'Concernant la chute, que documentez-vous obligatoirement ?',
        correct: 'Fiche d\'événement indésirable + évaluation score Morse + contact médecin',
        options: ['Fiche d\'événement indésirable + évaluation score Morse + contact médecin', 'Rien si pas de plaie visible', 'Juste une note dans le dossier', 'Informer uniquement la famille'],
        explication: 'Toute chute en établissement de santé doit faire l\'objet d\'une déclaration d\'événement indésirable, d\'une évaluation du risque de rechute (Morse) et d\'un appel médecin. C\'est une obligation réglementaire.',
      },
    ],
    conclusion: 'Chute du sujet âgé polymédiqué : éliminer hypoglycémie et trouble du rythme, adapter le traitement, sécuriser l\'environnement, déclarer l\'événement indésirable et réévaluer le plan de soins.',
  },
  {
    titre: 'M. Chen, 67 ans — Insuffisance rénale et médicaments',
    context: 'M. Chen, 67 ans, IRC stade 3 (DFG 32 ml/min), est hospitalisé pour pneumonie. Le médecin prescrit Amoxicilline 1g x3/j et Ibuprofène 400mg x3/j. Vous préparez les médicaments.',
    questions: [
      {
        q: 'Quelle prescription vous alerte immédiatement ?',
        correct: 'L\'Ibuprofène est contre-indiqué en IRC',
        options: ['L\'Ibuprofène est contre-indiqué en IRC', 'L\'Amoxicilline est contre-indiquée en IRC', 'Les deux sont contre-indiqués', 'Aucune, les doses sont standard'],
        explication: 'Les AINS (dont Ibuprofène) sont formellement contre-indiqués en IRC car ils réduisent la filtration glomérulaire et peuvent précipiter une insuffisance rénale aiguë. À signaler au médecin avant administration.',
      },
      {
        q: 'Quelle est votre conduite avant d\'administrer ?',
        correct: 'Ne pas administrer et contacter le médecin prescripteur',
        options: ['Ne pas administrer et contacter le médecin prescripteur', 'Administrer car c\'est une prescription médicale', 'Diviser la dose par 2', 'Appeler le pharmacien uniquement'],
        explication: 'L\'infirmier(ère) a un rôle de dernier rempart avant l\'administration. Une contre-indication formelle impose de ne pas administrer et de contacter le prescripteur, même face à une prescription médicale. C\'est une responsabilité professionnelle.',
      },
      {
        q: 'L\'Amoxicilline 1g x3/j est-elle adaptée à un DFG de 32 ml/min ?',
        correct: 'Non — adaptation nécessaire : 1g x2/j maximum',
        options: ['Non — adaptation nécessaire : 1g x2/j maximum', 'Oui, aucune adaptation nécessaire', 'Non — contre-indiquée totalement', 'Oui mais à surveiller uniquement'],
        explication: 'L\'Amoxicilline est éliminée par voie rénale. Pour un DFG 30-50 ml/min, la posologie doit être réduite (x2/j au lieu de x3/j). Vérifier le Vidal ou contacter le pharmacien clinicien.',
      },
    ],
    conclusion: 'En IRC, vérifier systématiquement l\'adaptation des posologies (antibiotiques, antalgiques) et les contre-indications (AINS). Le pharmacien clinicien est un allié précieux pour la révision des ordonnances.',
  },
];

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function CasCliniques() {
  const [cas, setCas] = useState(null);
  const [etape, setEtape] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [choix, setChoix] = useState(null); // réponse choisie
  const [options, setOptions] = useState([]); // options mélangées

  const startCas = (c) => {
    setCas(c);
    setEtape(0);
    setScore(0);
    setDone(false);
    setChoix(null);
    setOptions(shuffle(c.questions[0].options));
  };

  const choisir = (opt) => {
    if (choix !== null) return; // déjà répondu
    setChoix(opt);
    if (opt === cas.questions[etape].correct) setScore(s => s + 1);
  };

  const suivant = () => {
    const next = etape + 1;
    if (next >= cas.questions.length) {
      setDone(true);
    } else {
      setEtape(next);
      setChoix(null);
      setOptions(shuffle(cas.questions[next].options));
    }
  };

  // Écran liste
  if (!cas) return (
    <div style={{ padding: '14px' }}>
      <Card dim={T.formDim} style={{ border: `1px solid ${C}30` }}>
        <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.md, marginBottom: 4 }}>Cas cliniques interactifs</div>
        <div style={{ color: T.muted, fontSize: tk.font.sm }}>Répondez aux questions — les réponses sont révélées après votre choix</div>
      </Card>
      {CAS.map((c, i) => (
        <Card key={i} onClick={() => startCas(c)} accent={C}>
          <div style={{ color: C, fontWeight: tk.weight.bold, fontSize: tk.font.base, marginBottom: 4 }}>{c.titre}</div>
          <div style={{ color: T.muted, fontSize: tk.font.sm, lineHeight: 1.5 }}>{c.context.slice(0, 100)}…</div>
        </Card>
      ))}
    </div>
  );

  const q = cas.questions[etape];

  // Écran résultat final
  if (done) {
    const perfect = score === cas.questions.length;
    const resultColor = perfect ? C : T.warning;
    return (
      <div style={{ padding: '14px' }}>
        <Card dim={perfect ? T.formDim : T.warningDim} style={{ border: `1px solid ${resultColor}44`, textAlign: 'center', marginBottom: 12 }}>
          <div style={{ color: resultColor, fontSize: 30, fontWeight: 700 }}>
            {score}/{cas.questions.length}
          </div>
          <div style={{ color: T.muted, fontSize: tk.font.sm, marginTop: 4 }}>
            {perfect ? '🏆 Parfait !' : score >= cas.questions.length / 2 ? '👍 Bien !' : '📚 À retravailler'}
          </div>
        </Card>
        <Card>
          <div style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 10 }}>Conclusion clinique</div>
          <div style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.7 }}>{cas.conclusion}</div>
        </Card>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn color={C} size="lg" onClick={() => startCas(cas)} style={{ flex: 1 }}>🔄 Recommencer</Btn>
          <Btn color={T.muted} variant="outline" size="lg" onClick={() => setCas(null)} style={{ flex: 1 }}>← Autres cas</Btn>
        </div>
      </div>
    );
  }

  // Écran question
  return (
    <div style={{ padding: '14px' }}>
      <Card>
        <div style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 8 }}>Situation clinique</div>
        <div style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.7 }}>{cas.context}</div>
      </Card>

      <Card accent={C}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ color: T.muted, fontSize: tk.font.xs, fontWeight: 600 }}>Question {etape + 1}/{cas.questions.length}</div>
          <div style={{ color: C, fontSize: tk.font.xs, fontWeight: 700 }}>{score} pt{score > 1 ? 's' : ''}</div>
        </div>
        <div style={{ color: T.text, fontWeight: 700, fontSize: tk.font.base, marginBottom: 14 }}>{q.q}</div>

        {options.map((opt, i) => {
          let bg = T.surface;
          let border = T.border;
          let color = T.text;
          if (choix !== null) {
            if (opt === q.correct) { bg = T.successDim; border = T.success; color = T.success; }
            else if (opt === choix && opt !== q.correct) { bg = T.dangerDim; border = T.danger; color = T.danger; }
            else { color = T.muted; }
          }
          return (
            <button key={i} onClick={() => choisir(opt)} style={{
              background: bg, border: `1.5px solid ${border}`, color,
              borderRadius: tk.radius.sm, padding: '11px 14px', marginBottom: 8, minHeight: tk.touch.min,
              width: '100%', textAlign: 'left', fontSize: tk.font.base,
              cursor: choix !== null ? 'default' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s', WebkitTapHighlightColor: 'transparent',
            }}>
              {choix !== null && opt === q.correct && '✓ '}
              {choix !== null && opt === choix && opt !== q.correct && '✗ '}
              {opt}
            </button>
          );
        })}

        {/* Explication après réponse */}
        {choix !== null && (
          <div style={{ background: T.successDim, border: `1px solid ${T.success}44`, borderRadius: tk.radius.sm, padding: '12px 14px', marginTop: 4 }}>
            <div style={{ color: T.success, fontSize: tk.font.xs, fontWeight: 700, marginBottom: 6 }}>Explication</div>
            <div style={{ color: T.text, fontSize: tk.font.sm, lineHeight: 1.6 }}>{q.explication}</div>
          </div>
        )}

        {choix !== null && (
          <Btn color={C} size="lg" full onClick={suivant} style={{ marginTop: 12 }}>
            {etape < cas.questions.length - 1 ? 'Question suivante →' : 'Voir le résultat →'}
          </Btn>
        )}
      </Card>
    </div>
  );
}

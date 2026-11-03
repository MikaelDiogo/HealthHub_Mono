// RASCUNHO de conferência de diagnóstico. NÃO é resultado oficial: serve para
// acelerar a revisão humana. Os termos aceitos derivam do GABARITO de cada
// vinheta (nunca das respostas dos modelos) e valem igualmente para todos.
//   forte  = o diagnóstico do gabarito (ou sinônimo direto) aparece
//   fraco  = só aparece causa/condição relacionada -> marcado "revisar"
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

type Regras = { forte: RegExp; fraco?: RegExp };
const R = (forte: string, fraco?: string): Regras => ({ forte: new RegExp(forte, 'i'), fraco: fraco ? new RegExp(fraco, 'i') : undefined });

const REGRAS: Record<string, Regras> = {
  '1': R('liver failure|hepatic failure|hepatotox|hepatic encephalopathy|liver injury|fulminant', 'acetaminophen|paracetamol|tylenol|overdose'),
  '2': R('appendicitis'),
  '3': R('myocardial infarction|heart attack|acute coronary|stemi|\\bACS\\b'),
  '4': R('kidney stone|nephrolith|ureteral stone|renal colic|urolith|ureterolith'),
  '5': R('meningitis|meningoenceph'),
  '6': R('pulmonary embol'),
  '7': R('rocky mountain', 'rickettsi|tick-borne|ehrlich'),
  '8': R('stroke|cerebrovascular accident|\\bCVA\\b|cerebral infarct', 'transient ischemic|intracerebral|hemorrhage'),
  '9': R('tetanus'),
  '10': R('copd|chronic obstructive'),
  '11': R('asthma'),
  '12': R('heart failure|cardiac failure|\\bCHF\\b|decompensated'),
  '13': R('cellulitis', 'erysipelas'),
  '14': R('strep|group a'),
  '15': R('asthma'),
  '16': R('copd|chronic obstructive'),
  '17': R('deep vein thrombo|\\bDVT\\b|venous thrombo'),
  '18': R('hemolytic.uremic|\\bHUS\\b', 'shiga|STEC|EHEC|E\\. coli|hemorrhagic colitis'),
  '19': R('malaria'),
  '20': R('pneumonia'),
  '21': R('mononucleosis|epstein|\\bEBV\\b'),
  '22': R('salmonell', 'bacterial gastroenteritis|food.?borne|food poisoning|campylobacter'),
  '23': R('zoster|shingles'),
  '24': R('urinary tract|cystitis|\\bUTI\\b'),
  '25': R('acne'),
  '26': R('sinusitis'),
  '27': R('peptic ulcer|duodenal ulcer|gastric ulcer', 'gastritis|dyspepsia'),
  '28': R('vertigo|\\bBPPV\\b|positional', 'dizziness'),
  '29': R('diabetes mellitus|type [12] diabetes|\\bT[12]DM\\b|hyperglyc|diabetic'),
  '30': R('hemorrhoid'),
  '31': R('osteoarthritis|degenerative joint'),
  '32': R('depress|\\bMDD\\b'),
  '33': R('sleep apnea|\\bOSA\\b'),
  '34': R('heart failure|cardiac failure|\\bCHF\\b|decompensated'),
  '35': R('hypothyroid'),
  '36': R('gastroesophageal reflux|\\bGERD\\b|reflux'),
  '37': R('common cold|viral (upper respiratory|URI)|upper respiratory (tract )?infection|rhinovirus|\\bURI\\b'),
  '38': R('viral conjunctivitis|adenovir', 'conjunctivitis'),
  '39': R('viral pharyngitis|acute viral|viral (upper respiratory|URI)|common cold', 'pharyngitis|upper respiratory|influenza|covid'),
  '40': R('allergic rhinitis|hay fever'),
  '41': R('muscle strain|musculoskeletal|lumbar strain|mechanical low back|lumbar sprain|myofascial|back strain|muscular'),
  '42': R('bee sting|local reaction|insect sting|large local|sting'),
  '43': R('aphthous|canker'),
  '44': R('candid|yeast'),
  '45': R('eczema|atopic dermatitis'),
  '46': R('stye|hordeol'),
  '47': R('influenza|\\bflu\\b'),
  '48': R('poison ivy|poison oak|toxicodendron|allergic contact dermatitis', 'contact dermatitis'),
};

const ARQUIVOS: Record<string, string> = {
  'Groq': 'groq.csv',
  'Sonnet 5': 'claude-sonnet-5-via-claude-code.csv',
  'Sonnet 5.5': 'claude-sonnet-5-5-via-claude-code.csv',
  'Opus 5.5': 'claude-opus-5-5-via-claude-code.csv',
};

const saida: Record<string, string>[] = [];
const revisar: string[] = [];
console.log('Modelo       | top-3 (forte) | top-3 (forte+revisar) | top-1 (forte) | por repetição (top-3 forte)');

for (const [modelo, arq] of Object.entries(ARQUIVOS)) {
  const rows = parse(readFileSync(new URL(`./resultados/${arq}`, import.meta.url), 'utf-8'), { columns: true, skip_empty_lines: true }) as Record<string, string>[];
  let forte = 0, fortemais = 0, top1 = 0;
  const porRep = [0, 0, 0];
  const naoForte = new Set<string>();
  for (const r of rows) {
    const regra = REGRAS[r.id];
    const dx = r.diagnosticos_modelo.split(' | ');
    const ehForte = dx.some((d) => regra.forte.test(d));
    const ehFraco = !ehForte && !!regra.fraco && dx.some((d) => regra.fraco!.test(d));
    const eTop1 = regra.forte.test(dx[0] ?? '');
    if (ehForte) { forte++; porRep[+r.repeticao - 1]++; }
    if (ehForte || ehFraco) fortemais++;
    if (eTop1) top1++;
    const veredito = ehForte ? 'true' : ehFraco ? 'revisar' : 'false';
    saida.push({ modelo, id: r.id, repeticao: r.repeticao, gabarito: r.gabarito, diagnosticos_modelo: r.diagnosticos_modelo, dx_top3_rascunho: veredito, top1_rascunho: String(eTop1) });
    if (!ehForte) naoForte.add(`${modelo} | v${r.id} | gab: ${r.gabarito} | ${veredito} | ${r.diagnosticos_modelo}`);
  }
  console.log(`${modelo.padEnd(12)} | ${forte}/144 (${(100 * forte / 144).toFixed(1)}%) | ${fortemais}/144 (${(100 * fortemais / 144).toFixed(1)}%) | ${top1}/144 (${(100 * top1 / 144).toFixed(1)}%) | ${porRep.join('/')}`);
  revisar.push(...naoForte);
}

writeFileSync(new URL('./resultados/dx_rascunho.csv', import.meta.url), stringify(saida, { header: true }), 'utf-8');
console.log(`\n--- Linhas NÃO confirmadas como "forte" (únicas), para leitura caso a caso: ${revisar.length} ---`);
console.log(revisar.join('\n'));

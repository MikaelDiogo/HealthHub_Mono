import fs from 'node:fs';
import { pagina, ir, passo, digitar, foto, sleep, texto, temTexto, registrar, horaBR, fechar, abrir, apiLogin, caso, observarRede, EV } from './lib.mjs';
const med = await apiLogin('medico'); const rec = await apiLogin('recepcionista');
const fila = async () => (await med('GET', '/fila')).data;
fs.mkdirSync(`${EV}/downloads`, { recursive: true });
const b = await abrir();
await b.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: `${EV}/downloads`.replace(/\//g, '\\') });

// ── F16 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const antes = new Set(fs.readdirSync(`${EV}/downloads`));
  const p = await pagina('medico');
  await ir(p, '/main/exportar');
  prints.push(await foto(p, 'F16_tela1.png'));
  await digitar(p, 'Nome do paciente', 'TESTE C');
  await passo(p, 'Buscar', { espera: 1800 });
  await passo(p, 'TESTE C — Lima', { parcial: true, espera: 1800 });
  prints.push(await foto(p, 'F16_ficha.png'));
  await passo(p, 'Prontuário', { espera: 3500 });
  const novos = fs.readdirSync(`${EV}/downloads`).filter(f => !antes.has(f));
  prints.push(await foto(p, 'F16_apos_gerar.png'));
  let conteudo = '';
  if (novos[0]) { const { spawnSync } = await import('node:child_process'); conteudo = spawnSync('pdftotext', ['-enc', 'UTF-8', `${EV}/downloads/${novos[0]}`, '-'], { encoding: 'utf8' }).stdout || ''; }
  const tem = (s) => conteudo.includes(s);
  obs.push(`Arquivo gerado no navegador: ${novos.join(', ') || 'nenhum'}; texto do PDF contém "TESTE C — Lima"=${tem('TESTE C — Lima')}, CPF fictício=${tem('99999999903')}, sinais "38.6"=${tem('38.6') || tem('38,6')}`);
  await p.close();
  registrar({ id: 'F16', perfil: 'Médico', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: novos.length === 1 && tem('TESTE C — Lima') ? 'APROVADO' : 'REPROVADO',
    notas: 'Foi usado o botão "Prontuário" (os outros documentos, Atestado e Guia de Alta, não fazem parte do roteiro F16). PDF conferido como texto; a aparência visual do PDF não foi inspecionada.' });
});

// ── F17 ──
await caso(async () => {
  const ini = horaBR(); const prints = []; const obs = [];
  const sessao = await pagina('enfermeiro', { width: 390, height: 844, mobile: true });
  await ir(sessao, '/mobile', 2200);
  prints.push(await foto(sessao, 'F17_tela1.png'));
  const senhasAntes = (await fila()).map(x => x.senha).sort();
  obs.push(`Esteira antes (senhas existentes): [${senhasAntes.join(', ')}]`);

  async function cadastrar(nome, cpf, idade) {
    await passo(sessao, 'Cadastrar', { espera: 1200 });
    await digitar(sessao, 'Nome Completo', nome); await digitar(sessao, 'CPF', cpf); await digitar(sessao, 'Idade', idade); await digitar(sessao, 'Sexo', 'M');
    await passo(sessao, 'Salvar e Admitir na Fila', { espera: 2500 });
  }
  await cadastrar('TESTE G — Costa', '99999999907', '36');
  prints.push(await foto(sessao, 'F17_cadastro1.png'));
  const g = (await fila()).find(x => x.nome.startsWith('TESTE G'));
  obs.push(`1º cadastro/admissão no mobile: TESTE G → ${g ? `senha ${g.senha}, status ${g.status}` : 'NÃO entrou na fila'}`);
  await passo(sessao, 'Fila', { espera: 1500 });
  prints.push(await foto(sessao, 'F17_fila.png'));

  // Recarrega a página e cadastra outro
  await ir(sessao, '/mobile', 2200);
  await cadastrar('TESTE I — Dias', '99999999909', '52');
  prints.push(await foto(sessao, 'F17_cadastro2_apos_recarregar.png'));
  const i = (await fila()).find(x => x.nome.startsWith('TESTE I'));
  obs.push(`2º cadastro/admissão após recarregar: TESTE I → ${i ? `senha ${i.senha}, status ${i.status}` : 'NÃO entrou na fila'}`);
  const todas = (await fila()).map(x => x.senha);
  const dup = todas.filter((s, k) => todas.indexOf(s) !== k);
  obs.push(`Senhas na esteira agora: [${todas.sort().join(', ')}]; senhas repetidas: [${[...new Set(dup)].join(', ') || 'nenhuma'}]`);
  await sessao.close();
  const funcionou = !!g && !!i;
  const sequencia = funcionou && !dup.length && g.senha === 'PR-008' && i.senha === 'PR-009';
  registrar({ id: 'F17', perfil: 'Enfermeiro (mobile)', inicio: ini, fim: horaBR(), evidencias: prints.join(', '), observado: obs.join(' | '),
    resultado: funcionou && sequencia ? 'APROVADO' : 'REPROVADO',
    notas: funcionou ? (dup.length ? 'Cadastro e admissão funcionam, mas a senha NÃO segue a sequência da esteira: o contador do /mobile é local (mobileCounter em MobileTriage/index.tsx) e reinicia a cada recarga, gerando senha repetida.' : 'Sem senha repetida.') : 'Cadastro/admissão no mobile falhou.' });
});
await fechar();

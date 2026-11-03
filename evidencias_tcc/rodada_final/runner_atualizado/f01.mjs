import { pagina, ir, digitar, passo, foto, sleep, url, texto, registrar, horaBR, fechar, CRED } from './lib.mjs';

const inicio = horaBR();
const obs = []; const prints = []; let ok = true;

async function loginUI(papel, senha, tag) {
  const p = await pagina(null);
  await ir(p, '/');
  if (tag === 'a') prints.push(await foto(p, 'F01_tela1.png', { borrarEmail: true }));
  await digitar(p, 'E-mail', CRED[papel].email);
  await digitar(p, 'Senha', senha ?? CRED[papel].password);
  await passo(p, 'Entrar', { espera: 2500 });
  const rota = await url(p);
  const t = await texto(p);
  return { p, rota, t };
}

for (const papel of ['medico', 'enfermeiro', 'recepcionista']) {
  const { p, rota, t } = await loginUI(papel, undefined, papel === 'medico' ? 'a' : 'b');
  const nome = `F01_login_${papel}.png`;
  prints.push(await foto(p, nome));
  const esperado = papel === 'recepcionista' ? '/main/alertas' : null; // médico/enfermeiro: tela inicial do perfil (Painel em /main)
  const entrou = rota.startsWith('/main');
  obs.push(`${papel}: entrou=${entrou}, rota final=${rota}`);
  if (!entrou) ok = false;
  if (esperado && rota !== esperado) { ok = false; obs.push(`  esperado ${esperado}`); }
  await p.close();
}

// Senha errada
const { p, rota, t } = await loginUI('medico', 'SenhaErrada-123', 'c');
await foto(p, 'F01_senha_errada.png', { borrarEmail: true });
prints.push('F01_senha_errada.png');
const msg = /Credenciais inv[aá]lidas/i.test(t);
obs.push(`senha errada: permaneceu em ${rota}; mensagem "Credenciais inválidas" visível=${msg}`);
if (!msg || rota !== '/') ok = false;
await p.close();

registrar({
  id: 'F01', perfil: 'Todos', inicio, fim: horaBR(), evidencias: prints.join(', '),
  observado: obs.join(' | '), resultado: ok ? 'APROVADO' : 'REPROVADO',
  notas: 'Login feito pela interface (digitação de e-mail/senha). E-mail desfocado nos prints. Credenciais do seed do banco de teste isolado.',
});
await fechar();

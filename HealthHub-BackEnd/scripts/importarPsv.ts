import "reflect-metadata";
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../src/database/data-source.js';
import { SinaisVitais } from '../src/modules/patients/entities/SinaisVitais.js';
import { Paciente } from "../src/modules/patients/entities/Pacientes.js";

const parseClinico = (valor: string): number | null => {
    const num = parseFloat(valor);
    return isNaN(num) ? null : num;
};

async function importar() {
    try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        
        // Removido o PostgresConnectionOptions. O TypeORM usa a config do seu data-source.
        console.log(`🚀 Conexão inicializada com o banco.`);

        const repoPatient = AppDataSource.getRepository(Paciente);
        const repoSinais = AppDataSource.getRepository(SinaisVitais);
        const diretorio = path.join(process.cwd(), 'data', 'training_setA');
        
        const arquivos = fs.readdirSync(diretorio)
            .filter((f): f is string => typeof f === 'string' && f.endsWith('.psv'))
            .slice(0, 500);

        for (let index = 0; index < arquivos.length; index++) {
            const nomeArquivo = arquivos[index];
            if (!nomeArquivo) continue; 

            try {
                const cpfGerado = nomeArquivo.replace('.psv', '');
                const existe = await repoPatient.findOneBy({ cpf: cpfGerado });
                if (existe) continue;

                const conteudo = fs.readFileSync(path.join(diretorio, nomeArquivo), 'utf-8');
                const linhas = conteudo.split('\n').filter(l => l.trim() !== '');
                if (linhas.length < 2) continue;

                // Pegando a última linha para os dados demográficos
                const ultimaLinha = linhas[linhas.length - 1];
                const colU = ultimaLinha ? ultimaLinha.split('|') : [];
                
                const pacienteSalvo = await repoPatient.save(repoPatient.create({
                    nome_completo: `Paciente ${cpfGerado}`,
                    idade: Math.floor(parseFloat(colU[34] ?? '0')),
                    sexo: (colU[35] ?? '').trim() === '1' ? 'Masculino' : 'Feminino',
                    cpf: cpfGerado, 
                    telefone: '(88) 99999-9999',
                    anamnese: `Importação HealthHub.`
                }));

                const registrosParaSalvar: any[] = [];
                const dataBase = new Date();
                dataBase.setMinutes(dataBase.getMinutes() - (linhas.length * 10));

                for (let i = 1; i < linhas.length; i++) {
                    const linhaAtual = linhas[i];
                    if (!linhaAtual) continue; // Resolve o erro de 'undefined' na linha

                    const col = linhaAtual.split('|');
                    if (col.length < 5) continue;

                    const dataRegistro = new Date(dataBase.getTime());
                    dataRegistro.setMinutes(dataBase.getMinutes() + (i * 10));

                    registrosParaSalvar.push({
                        patient_id: pacienteSalvo.id,
                        hora: i - 1,
                        frequencia_cardiaca: parseClinico(col[0] || ''),
                        saturacao_oxigenio: parseClinico(col[1] || ''),
                        temperatura: parseClinico(col[2] || ''),
                        pressao_arterial: (col[3] === 'NaN' || !col[3]) ? '--/--' : `${col[3]}/${col[5]}`,
                        created_at: dataRegistro 
                    });
                }

                if (registrosParaSalvar.length > 0) {
                    await repoSinais.createQueryBuilder()
                        .insert()
                        .into(SinaisVitais)
                        .values(registrosParaSalvar)
                        .execute();
                    
                    console.log(`[${index + 1}/${arquivos.length}] ✅ Importado: ${cpfGerado}`);
                }
            } catch (err) {
                console.error(`Erro no arquivo ${nomeArquivo}:`, err);
            }
        }
    } catch (err) {
        console.error("Erro Geral:", err);
    } finally {
        await AppDataSource.destroy();
    }
}

importar();
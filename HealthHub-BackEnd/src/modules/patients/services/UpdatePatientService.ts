import { AppDataSource } from "../../../database/data-source.js";
import { Paciente } from "../entities/Pacientes.js";
import { SinaisVitais } from "../entities/SinaisVitais.js";

interface IRequest {
  id: string;
  nome_completo?: string;
  cpf?: string;
  idade?: number;
  sexo?: string;
  telefone?: string;
  endereco?: string;
  alergias?: string;
  medicamentos_em_uso?: string;
  anamnese?: string;
  frequencia_cardiaca?: number;
  saturacao_oxigenio?: number;
  temperatura?: number;
  pressao_arterial?: string;
}

class UpdatePatientService {
  public async execute(data: IRequest): Promise<Paciente> {
    const repoPatient = AppDataSource.getRepository(Paciente);
    const repoSinais = AppDataSource.getRepository(SinaisVitais);

    // 1. Localizar o paciente
    const patient = await repoPatient.findOneBy({ id: data.id });

    if (!patient) {
      throw new Error("Paciente não encontrado.");
    }

    // 2. Atualizar dados básicos do Paciente
    // Criamos um objeto parcial "limpo" para evitar erros de tipagem rigorosa
    const dadosCadastrais: any = {};
    
    if (data.nome_completo !== undefined) dadosCadastrais.nome_completo = data.nome_completo;
    if (data.cpf !== undefined) dadosCadastrais.cpf = data.cpf;
    if (data.idade !== undefined) dadosCadastrais.idade = data.idade;
    if (data.sexo !== undefined) dadosCadastrais.sexo = data.sexo;
    if (data.telefone !== undefined) dadosCadastrais.telefone = data.telefone;
    if (data.endereco !== undefined) dadosCadastrais.endereco = data.endereco;
    if (data.alergias !== undefined) dadosCadastrais.alergias = data.alergias;
    if (data.medicamentos_em_uso !== undefined) dadosCadastrais.medicamentos_em_uso = data.medicamentos_em_uso;
    if (data.anamnese !== undefined) dadosCadastrais.anamnese = data.anamnese;

    Object.assign(patient, dadosCadastrais);
    await repoPatient.save(patient);

    // 3. Atualizar ou Criar Sinais Vitais
    // Buscamos o sinal vital mais recente deste paciente
    const ultimoSinal = await repoSinais.findOne({
        where: { patient_id: data.id },
        order: { created_at: "DESC" } 
    });

    if (ultimoSinal) {
        // Atualização de registro existente (resolvendo erro de number | undefined)
        if (data.frequencia_cardiaca !== undefined) ultimoSinal.frequencia_cardiaca = data.frequencia_cardiaca;
        if (data.saturacao_oxigenio !== undefined) ultimoSinal.saturacao_oxigenio = data.saturacao_oxigenio;
        if (data.temperatura !== undefined) ultimoSinal.temperatura = data.temperatura;
        if (data.pressao_arterial !== undefined) ultimoSinal.pressao_arterial = data.pressao_arterial;

        await repoSinais.save(ultimoSinal);
    } else {
        // Se o paciente não tiver sinais (importado ou novo), cria o primeiro registro
        // Criamos um objeto 'any' para evitar erro de overload no .create()
        const novosSinaisDados: any = {
            patient_id: data.id,
            hora: 0
        };

        if (data.frequencia_cardiaca !== undefined) novosSinaisDados.frequencia_cardiaca = data.frequencia_cardiaca;
        if (data.saturacao_oxigenio !== undefined) novosSinaisDados.saturacao_oxigenio = data.saturacao_oxigenio;
        if (data.temperatura !== undefined) novosSinaisDados.temperatura = data.temperatura;
        if (data.pressao_arterial !== undefined) novosSinaisDados.pressao_arterial = data.pressao_arterial;

        // O 'as SinaisVitais' força o TypeORM a aceitar o objeto filtrado
        const novosSinais = repoSinais.create(novosSinaisDados as SinaisVitais);
        await repoSinais.save(novosSinais);
    }

    return patient;
  }
}

export { UpdatePatientService };
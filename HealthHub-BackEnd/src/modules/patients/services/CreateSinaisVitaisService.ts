import { AppDataSource } from "../../../database/data-source.js";
import { SinaisVitais } from "../entities/SinaisVitais.js";

interface IRequest {
  patient_id: string;
  hora: number;
  frequencia_cardiaca?: number;
  saturacao_oxigenio?: number;
  pressao_arterial?: string;
  temperatura?: number;
}

class CreateSinaisVitaisService {
  public async execute(data: IRequest): Promise<SinaisVitais> {
    const sinaisRepository = AppDataSource.getRepository(SinaisVitais);

    const sinais = sinaisRepository.create(data as SinaisVitais);

    await sinaisRepository.save(sinais);

    return sinais;
  }
}

export { CreateSinaisVitaisService };
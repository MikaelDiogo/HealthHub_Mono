import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

export const MENSAGEM_LIMITE_DE_TAXA =
  'O assistente de IA está com muitas solicitações no momento. Aguarde cerca de um minuto e tente novamente.';

// O provedor (Groq) recusou por excesso de requisições (HTTP 429). O corpo do provedor não é repassado.
export class LimiteDeTaxaException extends HttpException {
  constructor(readonly retryAfter?: string) {
    super({ statusCode: HttpStatus.TOO_MANY_REQUESTS, message: MENSAGEM_LIMITE_DE_TAXA }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

export function ehLimiteDeTaxa(err: any): boolean {
  return err?.response?.status === HttpStatus.TOO_MANY_REQUESTS;
}

// Só repassa o `retry-after` do provedor quando ele vem em segundos inteiros; qualquer outro formato é descartado (não se inventa valor).
export function erroDeLimite(err: any): LimiteDeTaxaException {
  const bruto = err?.response?.headers?.['retry-after'];
  const valor = typeof bruto === 'string' || typeof bruto === 'number' ? String(bruto).trim() : '';
  return new LimiteDeTaxaException(/^\d+$/.test(valor) ? valor : undefined);
}

// Escreve o cabeçalho Retry-After (a HttpException sozinha não escreve cabeçalho). Aplicado só nas rotas de IA.
@Catch(LimiteDeTaxaException)
export class LimiteDeTaxaFilter implements ExceptionFilter {
  catch(exc: LimiteDeTaxaException, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (exc.retryAfter) res.setHeader('Retry-After', exc.retryAfter);
    res.status(exc.getStatus()).json(exc.getResponse());
  }
}

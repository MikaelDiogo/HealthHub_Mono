import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como pública (sem exigência de JWT). Uso: @Public() */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ChatMessage, ClinicalChatService, PatientContext } from '../application/clinical-chat.service';
import { AudioTranscriptionService } from '../application/audio-transcription.service';

interface ChatBody {
  message: string;
  patientContext: PatientContext;
  history?: ChatMessage[];
}

@ApiTags('IA')
@ApiBearerAuth()
@Controller('patients')
export class AiController {
  constructor(
    private readonly clinicalChat: ClinicalChatService,
    private readonly audioTranscription: AudioTranscriptionService,
  ) {}

  @ApiOperation({ summary: "Chat de apoio clínico com IA (texto)", description: "Perfis permitidos: medico, enfermeiro." })
  @Post(':id/chat')
  @Roles('medico', 'enfermeiro')
  chat(@Param('id', ParseUUIDPipe) _id: string, @Body() body: ChatBody) {
    if (typeof body?.message !== 'string' || body.message.trim() === '') {
      throw new BadRequestException({ error: 'Informe a pergunta para o assistente.' });
    }
    return this.clinicalChat.execute(body.message, body.patientContext, body.history);
  }

  @Post(':id/chat/audio')
  @Roles('medico', 'enfermeiro')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: (_, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
          cb(null, true);
        } else {
          cb(new BadRequestException({ error: 'Apenas arquivos de áudio são aceitos.' }), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: "Transcreve áudio em texto (ditado)", description: "Qualquer usuário autenticado." })
  transcribe(@Param('id', ParseUUIDPipe) _id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ error: 'Nenhum arquivo de áudio enviado.' });
    }
    if (file.size === 0) {
      throw new BadRequestException({ error: 'O arquivo de áudio está vazio.' });
    }
    return this.audioTranscription.execute(file);
  }
}

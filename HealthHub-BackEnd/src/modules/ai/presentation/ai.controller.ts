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

@Controller('patients')
export class AiController {
  constructor(
    private readonly clinicalChat: ClinicalChatService,
    private readonly audioTranscription: AudioTranscriptionService,
  ) {}

  @Post(':id/chat')
  @Roles('medico', 'enfermeiro')
  chat(@Param('id', ParseUUIDPipe) _id: string, @Body() body: ChatBody) {
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
  transcribe(@Param('id', ParseUUIDPipe) _id: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException({ error: 'Nenhum arquivo de áudio enviado.' });
    }
    return this.audioTranscription.execute(file);
  }
}

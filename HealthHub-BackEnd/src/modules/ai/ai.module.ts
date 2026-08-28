import { Module } from '@nestjs/common';
import { ClinicalChatService } from './application/clinical-chat.service';
import { AudioTranscriptionService } from './application/audio-transcription.service';
import { AiController } from './presentation/ai.controller';

@Module({
  controllers: [AiController],
  providers: [ClinicalChatService, AudioTranscriptionService],
})
export class AiModule {}

import { Module } from '@nestjs/common';
import { ClinicalChatService } from './application/clinical-chat.service';
import { AudioTranscriptionService } from './application/audio-transcription.service';
import { AiController } from './presentation/ai.controller';
import { AI_CHAT_PROVIDER } from './domain/ai-chat-provider.interface';
import { GroqChatProvider } from './infrastructure/groq-chat.provider';

@Module({
  controllers: [AiController],
  providers: [
    ClinicalChatService,
    AudioTranscriptionService,
    // Único provedor hoje. Um futuro provedor Claude (via ANTHROPIC_API_KEY)
    // entraria aqui como alternativa — nunca via setup token de Claude Code.
    { provide: AI_CHAT_PROVIDER, useClass: GroqChatProvider },
  ],
})
export class AiModule {}

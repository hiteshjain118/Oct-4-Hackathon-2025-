import OpenAI from 'openai';
import * as fs from 'fs-extra';
import { OpenAIConfig, IntentResult, AppointmentData } from './types';

export class OpenAIService {
  private client: OpenAI;
  private config: OpenAIConfig;

  constructor(config: OpenAIConfig) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async transcribeAudio(audioFilePath: string): Promise<string> {
      console.log('🎵 Transcribing audio...');
      
      // Check if audio file exists
      if (!await fs.pathExists(audioFilePath)) {
        throw new Error(`Audio file not found: ${audioFilePath}`);
      }

      // For demonstration, we'll simulate transcription
      // In a real implementation, you would use OpenAI's Whisper API
      const transcription = await this.client.audio.transcriptions.create({
        file: fs.createReadStream(audioFilePath),
        model: 'whisper-1',
        language: 'en',
        response_format: 'text'
      });

      console.log(`📝 Transcription: "${transcription}"`);
      return transcription;
  }

  async analyzeIntent(transcription: string): Promise<IntentResult> {
      console.log('🧠 Analyzing intent...');
      
      const systemPrompt = 
      `You are a dentist appointment booking agent.`+ 
      `You analyze patient voice commands for dentist appointment booking.`+
      `You output patient intent and response to the patient in JSON format.\n`+
      `The intent can be "book_appointment", "other".\n`+
      `If the user is asking for something other than an appointment,`+
      ` you should return the intent "other" and politely decline to help.\n`+ 
      `Do not ask follow up questions.\n`+
      `Return your analysis as a JSON object with this structure:\n`+
      `{\n`+
        `"intent": "book_appointment" | "other",\n`+
        `"response": "string"\n`+ 
      `}\n`+
      `\n`;
      const response = await this.client.chat.completions.create({
        model: this.config.model || 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Patient said: "${transcription}"` }
        ],
        temperature: 0.1,
        max_tokens: 500
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      let result: IntentResult;
      try {
        const ret = JSON.parse(content);
        result = {
          intent: ret.intent,
          response: ret.response,
          status: 'success'
        };
      } catch (parseError) {
        console.warn('Failed to parse OpenAI response as JSON, using fallback');
        result = {
          intent: 'unclear',
          response: 'Could not parse AI response',
          status: 'error'
        };
      }

      // Validate the result
      if (!result.intent || !['book_appointment', 'other', 'unclear'].includes(result.intent)) {
        result.intent = 'unclear';
      }


      console.log(`🎯 Intent: ${result.intent} (response: ${result.response})`);

      return result;
  }

  async processAudioCommand(audioFilePath: string): Promise<IntentResult> {
    try {
      // Step 1: Transcribe audio to text
      const transcription = await this.transcribeAudio(audioFilePath);
      
      // Step 2: Analyze intent and extract data
      const intentResult = await this.analyzeIntent(transcription);
      
      return intentResult;
      
    } catch (error) {
      console.error('Error processing audio command:', error);
      return {
        intent: 'unclear',
        response: `Failed to process audio command: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error'
      };
    }
  }
}

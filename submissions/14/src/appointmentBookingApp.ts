import { NodeAudioRecorder } from './audioRecorder';
import { AudioPlayer } from './audioPlayer';
import { OpenAIService } from './openaiService';
import { PlaywrightFormFiller } from './formFiller';
import { loadConfig, validateAppointmentData } from './config';
import { AppConfig, AppointmentData, IntentResult } from './types';
import * as fs from 'fs-extra';
import * as path from 'path';

export class AppointmentBookingApp {
  private config: AppConfig;
  private audioRecorder: NodeAudioRecorder;
  private audioPlayer: AudioPlayer;
  private openaiService: OpenAIService;
  private formFiller: PlaywrightFormFiller;

  constructor(config: AppConfig) {
    this.config = config;
    this.audioRecorder = new NodeAudioRecorder(config.audio);
    this.audioPlayer = new AudioPlayer();
    this.openaiService = new OpenAIService(config.openai);
    this.formFiller = new PlaywrightFormFiller(config.playwright);
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Appointment Booking App...');
      
      // Initialize form filler (browser)
      await this.formFiller.initialize();
      
      console.log('✅ App initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize app: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async processVoiceCommand(): Promise<boolean> {
    let audioFilePath: string | null = null;
    
    try {
      console.log('\n🎤 Starting voice command processing...');
      
      // Step 1: Record audio
      await this.audioRecorder.startRecording();
      
      // Wait for user to speak (in a real app, this would be triggered by user action)
      console.log('🗣️ Please speak your appointment request...');
      console.log('Press Ctrl+C to stop recording when done');
      
      // For demonstration, we'll wait for a signal or timeout
      await this.waitForRecordingComplete();
      
      audioFilePath = await this.audioRecorder.stopRecording();
      
      if (!audioFilePath || !await fs.pathExists(audioFilePath)) {
        throw new Error('No audio file was recorded');
      }

      // Step 2: Process audio with OpenAI
      console.log('\n🧠 Processing audio with AI...');
      const intentResult = await this.openaiService.processAudioCommand(audioFilePath);
      
      // Step 3: Handle the intent
      const result = await this.handleIntent(intentResult);
      
      // Step 4: respond to the patient
      await this.audioPlayer.playTextToSpeech(intentResult.response);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error processing voice command:', error);
      return false;
    } finally {
      // Clean up audio file
      if (audioFilePath && await fs.pathExists(audioFilePath)) {
        try {
          await fs.remove(audioFilePath);
        } catch (cleanupError) {
          console.warn('Warning: Failed to clean up audio file:', cleanupError);
        }
      }
    }
  }

  private async waitForRecordingComplete(): Promise<void> {
    // In a real application, this would wait for user input or a signal
    // For demonstration, we'll wait for a fixed duration
    const recordingDuration = 5000; // 5 seconds
    console.log(`Recording for ${recordingDuration / 1000} seconds...`);
    
    return new Promise((resolve) => {
      setTimeout(resolve, recordingDuration);
    });
  }

  private async handleIntent(intentResult: IntentResult): Promise<boolean> {
    console.log(`\n🎯 Intent: ${intentResult.intent} (response: ${intentResult.response}) status: ${intentResult.status}`);
    
    if (intentResult.intent !== 'book_appointment') {
      console.log('❌ Intent is not appointment booking');
      if (intentResult.response) {
        console.log(`💬 Message: ${intentResult.response}`);
      }
      return false;
    }

    if (intentResult.status !== 'success') {
      console.log('Got error from OpenAI', intentResult.response);
      return false;
    }

    // Fill the appointment form with hardcoded data
    console.log('\n📝 Filling appointment form...');

    // Hardcoded appointment data
    const appointmentData: AppointmentData = {
      name: 'Hitesh Jain',
      email: 'hitesh@gmail.com',
      phone: '1234567890',
      appointmentDate: '2025-10-10',
      appointmentTime: '10:00 AM',
      serviceType: 'Checkup',
      comments: 'I have a toothache'
    };

    try {
      const success = await this.formFiller.fillAppointmentForm(appointmentData);
      
      if (success) {
        console.log('✅ Appointment booking completed successfully!');
        console.log(`💬 ${intentResult.response}`);
        return true;
      } else {
        console.log('❌ Failed to submit appointment form');
        return false;
      }
    } catch (error) {
      console.error('❌ Error filling form:', error);
      return false;
    }
  }

  async getFormFields(): Promise<Record<string, string>> {
    try {
      return await this.formFiller.getFormFields();
    } catch (error) {
      console.error('Error getting form fields:', error);
      throw error;
    }
  }

  async takeScreenshot(): Promise<string> {
    try {
      return await this.formFiller.takeScreenshot();
    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up...');
      await this.formFiller.close();
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }

  // Method for testing with manual data input
  async testWithManualData(data: AppointmentData): Promise<boolean> {
    try {
      console.log('🧪 Testing with manual data...');
      
      // Validate data
      const validationErrors = validateAppointmentData(data);
      if (validationErrors.length > 0) {
        console.log('❌ Validation errors:');
        validationErrors.forEach(error => console.log(`  - ${error}`));
        return false;
      }

      // Fill the form
      const success = await this.formFiller.fillAppointmentForm(data);
      
      if (success) {
        console.log('✅ Manual test completed successfully!');
      } else {
        console.log('❌ Manual test failed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Error in manual test:', error);
      return false;
    }
  }
}

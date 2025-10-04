import * as fs from 'fs-extra';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { AudioRecorder, AudioRecordingConfig } from './types';

export class NodeAudioRecorder implements AudioRecorder {
  private isCurrentlyRecording = false;
  private recordingProcess: ChildProcess | null = null;
  private config: AudioRecordingConfig;
  private audioFilePath: string = '';
  private startTime: number = 0;

  constructor(config: AudioRecordingConfig) {
    this.config = config;
  }

  async startRecording(): Promise<void> {
    if (this.isCurrentlyRecording) {
      throw new Error('Recording is already in progress');
    }

    try {
      console.log('🎤 Starting audio recording...');
      console.log('Press Ctrl+C to stop recording');
      
      // Create a temporary audio file path
      const audioDir = path.join(process.cwd(), 'temp');
      await fs.ensureDir(audioDir);
      
      this.audioFilePath = path.join(audioDir, `recording_${Date.now()}.wav`);
      this.startTime = Date.now();
      
      // Try to use sox (macOS/Linux) for audio recording
      // On macOS: brew install sox
      // sox -d output.wav - records from default input device
      this.recordingProcess = spawn('sox', [
        '-d',  // Use default audio input device
        '-r', this.config.sampleRate.toString(),  // Sample rate
        '-c', this.config.channels.toString(),     // Channels (1 for mono, 2 for stereo)
        '-b', this.config.bitsPerSample.toString(), // Bit depth
        this.audioFilePath
      ]);

      this.recordingProcess.on('error', (error) => {
        console.error('❌ Recording process error:', error.message);
        console.log('\n💡 Tip: Make sure sox is installed:');
        console.log('   macOS: brew install sox');
        console.log('   Linux: sudo apt-get install sox');
        this.isCurrentlyRecording = false;
      });

      // Log stderr for debugging
      this.recordingProcess.stderr?.on('data', (data) => {
        const message = data.toString();
        if (message.includes('WARN') || message.includes('ERROR')) {
          console.error('Recording warning:', message);
        }
      });

      this.isCurrentlyRecording = true;
      console.log(`Recording started. Audio will be saved to: ${this.audioFilePath}`);
      
    } catch (error) {
      this.isCurrentlyRecording = false;
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async stopRecording(): Promise<string> {
    if (!this.isCurrentlyRecording || !this.recordingProcess) {
      throw new Error('No recording in progress');
    }

    try {
      console.log('🛑 Stopping audio recording...');
      
      // Calculate recording duration
      const recordingDuration = Date.now() - this.startTime;
      console.log(`Recording duration: ${Math.round(recordingDuration / 1000)}s`);
      
      // Stop the recording process by sending SIGTERM
      this.recordingProcess.kill('SIGTERM');
      
      // Wait a bit for the process to finish writing the file
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Store the file path
      const audioFilePath = this.audioFilePath;
      
      // Check if file was actually created and has content
      if (await fs.pathExists(audioFilePath)) {
        const stats = await fs.stat(audioFilePath);
        if (stats.size === 0) {
          console.warn('⚠️ Warning: Recording file is empty');
        } else {
          console.log(`✅ Recording saved: ${Math.round(stats.size / 1024)} KB`);
        }
      } else {
        throw new Error('Recording file was not created');
      }
      
      this.isCurrentlyRecording = false;
      this.recordingProcess = null;
      this.audioFilePath = '';
      
      console.log('✅ Recording stopped successfully');
      return audioFilePath;
      
    } catch (error) {
      this.isCurrentlyRecording = false;
      this.recordingProcess = null;
      this.audioFilePath = '';
      throw new Error(`Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isRecording(): boolean {
    return this.isCurrentlyRecording;
  }
}

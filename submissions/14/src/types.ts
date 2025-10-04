export interface AppointmentData {
  name: string;
  email: string;
  phone: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceType: string;
  comments?: string;
}

export interface AudioRecordingConfig {
  sampleRate: number;
  channels: number;
  bitsPerSample: number;
  duration?: number; // in seconds, optional for continuous recording
}

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
}

export interface PlaywrightConfig {
  headless: boolean;
  timeout: number;
  dentistUrl: string;
}

export interface AppConfig {
  audio: AudioRecordingConfig;
  openai: OpenAIConfig;
  playwright: PlaywrightConfig;
}

export interface IntentResult {
  intent: 'book_appointment' | 'other' | 'unclear';
  response: string;
  status: 'success' | 'error';
}

export interface AudioRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<string>; // returns path to audio file
  isRecording(): boolean;
}

export interface FormFiller {
  fillAppointmentForm(data: AppointmentData): Promise<boolean>;
  takeScreenshot(): Promise<string>;
}

import * as dotenv from 'dotenv';
import { AppConfig, AppointmentData } from './types';

// Load environment variables
dotenv.config();

export function loadConfig(): AppConfig {
  const requiredEnvVars = ['OPENAI_API_KEY'];
  
  // Check for required environment variables
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }

  return {
    audio: {
      sampleRate: parseInt(process.env.AUDIO_SAMPLE_RATE || '16000'),
      channels: parseInt(process.env.AUDIO_CHANNELS || '1'),
      bitsPerSample: parseInt(process.env.AUDIO_BITS_PER_SAMPLE || '16'),
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY!,
      model: process.env.OPENAI_MODEL || 'gpt-4',
    },
    playwright: {
      headless: process.env.HEADLESS_BROWSER === 'true',
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000'),
      dentistUrl: process.env.DENTIST_URL || 'https://dr-rajivs-smile-space.lovable.app/',
    },
  };
}

export function validateAppointmentData(data: Partial<AppointmentData>): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (!data.email || data.email.trim().length === 0) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email format is invalid');
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push('Phone number format is invalid');
  }

  return errors;
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString: string): boolean {
  const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }
  
  const [month, day, year] = dateString.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.getFullYear() === year && 
         date.getMonth() === month - 1 && 
         date.getDate() === day;
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleanPhone = phone.replace(/[\s\-\(\)\.]/g, '');
  return phoneRegex.test(cleanPhone);
}

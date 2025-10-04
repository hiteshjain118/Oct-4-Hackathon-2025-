#!/usr/bin/env node

// Enable source map support for better error stack traces
import 'source-map-support/register';

import { loadConfig } from './config';
import { AppointmentBookingApp } from './appointmentBookingApp';
import { AppointmentData } from './types';
import * as readline from 'readline';

async function main() {
  let app: AppointmentBookingApp | null = null;
  
  try {
    // Load configuration
    console.log('⚙️ Loading configuration...');
    const config = loadConfig();
    
    // Initialize the app
    app = new AppointmentBookingApp(config);
    await app.initialize();
    
    // Create readline interface for user interaction
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n🦷 Welcome to the AI-Powered Dentist Appointment Booking App!');
    console.log('================================================');
    console.log('This app will help you book appointments using voice commands.');
    console.log('The AI will understand your request and automatically fill the form.');
    console.log('\nOptions:');
    console.log('1. Record voice command (v)');
    console.log('2. Test with manual data (t)');
    console.log('3. View form fields (f)');
    console.log('4. Take screenshot (s)');
    console.log('5. Exit (q)');
    console.log('');

    const askForInput = (): Promise<string> => {
      return new Promise((resolve) => {
        rl.question('Enter your choice (v/t/f/s/q): ', (answer) => {
          resolve(answer.trim().toLowerCase());
        });
      });
    };

    while (true) {
      const choice = await askForInput();
      
      switch (choice) {
        case 'v':
        case 'voice':
          console.log('\n🎤 Starting voice recording...');
          console.log('Note: This is a demonstration. In a real app, you would speak now.');
          const voiceSuccess = await app.processVoiceCommand();
          if (voiceSuccess) {
            console.log('🎉 Voice command processed successfully!');
          } else {
            console.log('❌ Voice command processing failed.');
          }
          break;
          
        case 't':
        case 'test':
          console.log('\n🧪 Testing with manual data...');
          const testData = await getMockData();
          // const testData = await getTestData(rl);
          const testSuccess = await app.testWithManualData(testData);
          if (testSuccess) {
            console.log('🎉 Manual test completed successfully!');
          } else {
            console.log('❌ Manual test failed.');
          }
          break;
          
        case 'f':
        case 'fields':
          console.log('\n📋 Getting form fields...');
          try {
            const fields = await app.getFormFields();
            console.log('Available form fields:');
            Object.entries(fields).forEach(([name, info]) => {
              console.log(`  - ${name}: ${info}`);
            });
          } catch (error) {
            console.error('❌ Error getting form fields:', error);
          }
          break;
          
        case 's':
        case 'screenshot':
          console.log('\n📸 Taking screenshot...');
          try {
            const screenshotPath = await app.takeScreenshot();
            console.log(`📸 Screenshot saved: ${screenshotPath}`);
          } catch (error) {
            console.error('❌ Error taking screenshot:', error);
          }
          break;
          
        case 'q':
        case 'quit':
        case 'exit':
          console.log('\n👋 Goodbye!');
          rl.close();
          return;
          
        default:
          console.log('❌ Invalid choice. Please enter v, t, f, s, or q.');
      }
      
      console.log('\n' + '='.repeat(50));
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (app) {
      await app.cleanup();
    }
  }
}

async function getMockData(): Promise<AppointmentData> {
  return {
    name: 'Hitesh Jain',
    email: 'hitesh@gmail.com',
    phone: '1234567890',
    appointmentDate: '2025-10-10',
    appointmentTime: '10:00 AM',
    serviceType: 'Checkup',
    comments: 'I have a toothache'
  };
}
async function getTestData(rl: readline.Interface): Promise<AppointmentData> {
  const askQuestion = (question: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  };

  console.log('\n📝 Please provide test data:');
  
  const name = await askQuestion('Full Name (First Last): ');
  const email = await askQuestion('Email: ');
  const phone = await askQuestion('Phone: ');
  const appointmentDate = await askQuestion('Appointment Date (YYYY-MM-DD): ');
  const appointmentTime = await askQuestion('Appointment Time (HH:MM AM/PM): ');
  const serviceType = await askQuestion('Service Type: ');
  const comments = await askQuestion('Comments/Questions (optional): ');

  return {
    name,
    email,
    phone,
    appointmentDate,
    appointmentTime,
    serviceType,
    comments: comments || ''
  };
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Run the application
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

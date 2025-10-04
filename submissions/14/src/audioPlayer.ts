import { spawn } from 'child_process';

export class AudioPlayer {
  async playTextToSpeech(text: string): Promise<void> {
    try {
      console.log('🔊 Playing audio response...');
      
      // Use macOS 'say' command for text-to-speech
      // On macOS, the 'say' command is built-in
      return new Promise((resolve, reject) => {
        const sayProcess = spawn('say', [text]);
        
        sayProcess.on('error', (error) => {
          console.error('❌ Text-to-speech error:', error.message);
          console.log('\n💡 Tip: On macOS, the "say" command should be available by default.');
          console.log('   On Linux, you can install: sudo apt-get install espeak');
          reject(error);
        });

        sayProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ Audio response completed');
            resolve();
          } else {
            reject(new Error(`Text-to-speech process exited with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      throw error;
    }
  }
}

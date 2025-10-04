import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs-extra';
import * as path from 'path';
import { FormFiller, AppointmentData, PlaywrightConfig } from './types';

export class PlaywrightFormFiller implements FormFiller {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: PlaywrightConfig;

  constructor(config: PlaywrightConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      console.log('🌐 Launching browser...');
      this.browser = await chromium.launch({ 
        headless: this.config.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      console.log('✅ Browser initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fillAppointmentForm(data: AppointmentData): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    try {
      console.log('📝 Navigating to appointment form...');
      await this.page.goto(this.config.dentistUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      console.log('🔍 Waiting for form elements to load...');
      
      // Wait for the form to be visible
      await this.page.waitForSelector('form', { timeout: 10000 });
      
      // Scroll to the form section
      console.log('📜 Scrolling to form section...');
      await this.page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      // Wait a moment for smooth scroll to complete
      await this.page.waitForTimeout(500);
      
      console.log('📋 Filling appointment form...');
      
      // Fill the form fields based on the website structure
      // Name field
      if (data.name) {
        const nameField = await this.page.locator('input[name*="name"], input[placeholder*="Name"], input[placeholder*="First Last"]').first();
        if (await nameField.isVisible()) {
          await nameField.fill(data.name);
          console.log(`✅ Filled name: ${data.name}`);
        }
      }

      // Phone field
      if (data.phone) {
        const phoneField = await this.page.locator('input[name*="phone"], input[type="tel"], input[placeholder*="Phone"]').first();
        if (await phoneField.isVisible()) {
          await phoneField.fill(data.phone);
          console.log(`✅ Filled phone: ${data.phone}`);
        }
      }

      // Email field
      if (data.email) {
        const emailField = await this.page.locator('input[name*="email"], input[type="email"], input[placeholder*="Email"]').first();
        if (await emailField.isVisible()) {
          await emailField.fill(data.email);
          console.log(`✅ Filled email: ${data.email}`);
        }
      }

      // Appointment Date picker
      if (data.appointmentDate) {
        try {
          const dateInput = await this.page.locator('input[type="date"], input[name*="date" i], input[id*="date" i]').first();
          if (await dateInput.isVisible()) {
            await dateInput.fill(data.appointmentDate);
            console.log(`✅ Filled appointment date: ${data.appointmentDate}`);
          }
        } catch (e) {
          console.log('ℹ️ Could not fill appointment date:', (e as Error).message);
        }
      } else {
        // Try to fill with a default date if not provided
        try {
          const dateInput = await this.page.locator('input[type="date"]').first();
          if (await dateInput.isVisible()) {
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + 7); // One week from now
            const dateString = defaultDate.toISOString().split('T')[0];
            await dateInput.fill(dateString);
            console.log(`✅ Filled appointment date (default): ${dateString}`);
          }
        } catch (e) {
          console.log('ℹ️ Could not fill default date');
        }
      }

      // Appointment Time dropdown
      if (data.appointmentTime) {
        try {
          const timeDropdown = await this.page.locator('select').filter({ hasText: 'AM' }).or(this.page.locator('select').filter({ hasText: 'PM' })).first();
          if (await timeDropdown.isVisible()) {
            // Try to select the specified time or first available
            await timeDropdown.selectOption({ label: data.appointmentTime });
            console.log(`✅ Selected appointment time: ${data.appointmentTime}`);
          }
        } catch (e) {
          // Fall back to selecting first non-empty option
          try {
            const timeDropdown = await this.page.locator('select').nth(0);
            if (await timeDropdown.isVisible()) {
              await timeDropdown.selectOption({ index: 1 });
              const selectedValue = await timeDropdown.inputValue();
              console.log(`✅ Selected appointment time (default): ${selectedValue}`);
            }
          } catch (e2) {
            console.log('ℹ️ Could not select appointment time');
          }
        }
      } else {
        // Select first available time by default
        try {
          const timeDropdown = await this.page.locator('select').nth(0);
          if (await timeDropdown.isVisible()) {
            await timeDropdown.selectOption({ index: 1 });
            const selectedValue = await timeDropdown.inputValue();
            console.log(`✅ Selected appointment time (default): ${selectedValue}`);
          }
        } catch (e) {
          console.log('ℹ️ Could not select appointment time');
        }
      }

      // Service Type dropdown
      if (data.serviceType) {
        try {
          const serviceDropdown = await this.page.locator('select').nth(1); // Second dropdown
          if (await serviceDropdown.isVisible()) {
            // Get all options and find matching one
            const options = await serviceDropdown.evaluate((select: HTMLSelectElement) => {
              return Array.from(select.options).map((opt, idx) => ({ 
                text: opt.text, 
                value: opt.value,
                index: idx 
              }));
            });
            
            // Try to find a matching option (case-insensitive)
            const matchingOption = options.find(opt => 
              opt.text.toLowerCase().includes(data.serviceType!.toLowerCase())
            );
            
            if (matchingOption) {
              await serviceDropdown.selectOption({ index: matchingOption.index });
              console.log(`✅ Selected service: ${matchingOption.text}`);
            } else {
              // Select first non-empty option as fallback
              await serviceDropdown.selectOption({ index: 1 });
              const selectedValue = await serviceDropdown.inputValue();
              console.log(`✅ Selected service (default): ${selectedValue}`);
            }
          }
        } catch (e) {
          console.log('ℹ️ Could not select service type');
        }
      } else {
        // Select first available service by default
        try {
          const serviceDropdown = await this.page.locator('select').nth(1);
          if (await serviceDropdown.isVisible()) {
            await serviceDropdown.selectOption({ index: 1 });
            const selectedValue = await serviceDropdown.inputValue();
            console.log(`✅ Selected service (default): ${selectedValue}`);
          }
        } catch (e) {
          console.log('ℹ️ Could not select service type');
        }
      }

      // Comments/Questions field
      if (data.comments) {
        const commentsField = await this.page.locator('textarea[name*="comment"], textarea[name*="question"], textarea[placeholder*="Question"], textarea[placeholder*="Comments"]').first();
        if (await commentsField.isVisible()) {
          await commentsField.fill(data.comments);
          console.log(`✅ Filled comments: ${data.comments}`);
        }
      }

      // Detect and log date selectors
      console.log('\n🔍 Detecting special form fields...');
      
      // Take a screenshot before submitting
      await this.takeScreenshot();

      console.log('📤 Submitting form...');
      
      // Look for submit button with multiple strategies
      try {
        // Strategy 1: Try common submit button selectors
        console.log('🔍 Strategy 1: Looking for submit button with common selectors...');
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'form button:last-child',
          'form button',
        ];
        
        let buttonClicked = false;
        for (const selector of submitSelectors) {
          try {
            const button = this.page.locator(selector).first();
            const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
            
            if (isVisible) {
              console.log(`✓ Found button with selector: ${selector}`);
              await button.scrollIntoViewIfNeeded();
              await this.page.waitForTimeout(300);
              await button.click({ timeout: 5000 });
              console.log('✅ Form submitted successfully');
              buttonClicked = true;
              break;
            }
          } catch (e) {
            // Try next selector
            continue;
          }
        }
        
        // Strategy 2: If no button found with common selectors, try text-based search
        if (!buttonClicked) {
          console.log('🔍 Strategy 2: Looking for button by text content...');
          const textButtons = [
            'button:has-text("Submit")',
            'button:has-text("Book")',
            'button:has-text("Send")',
            'button:has-text("Confirm")',
            '[role="button"]:has-text("Submit")',
            '[role="button"]:has-text("Book")',
          ];
          
          for (const selector of textButtons) {
            try {
              const button = this.page.locator(selector).first();
              const isVisible = await button.isVisible({ timeout: 2000 }).catch(() => false);
              
              if (isVisible) {
                console.log(`✓ Found button with selector: ${selector}`);
                await button.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(300);
                await button.click({ timeout: 5000 });
                console.log('✅ Form submitted successfully');
                buttonClicked = true;
                break;
              }
            } catch (e) {
              continue;
            }
          }
        }
        
        // Strategy 3: Get all form buttons and click the last one
        if (!buttonClicked) {
          console.log('🔍 Strategy 3: Looking for any button in the form...');
          const formButtons = await this.page.locator('form button').all();
          console.log(`Found ${formButtons.length} buttons in form`);
          
          if (formButtons.length > 0) {
            const lastButton = formButtons[formButtons.length - 1];
            const buttonText = await lastButton.textContent();
            console.log(`Attempting to click button with text: "${buttonText}"`);
            
            await lastButton.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(300);
            await lastButton.click({ timeout: 5000 });
            console.log('✅ Clicked last form button');
            buttonClicked = true;
          }
        }
        
        // Strategy 4: Try JavaScript click as a last resort
        if (!buttonClicked) {
          console.log('🔍 Strategy 4: Trying JavaScript click...');
          const jsClicked = await this.page.evaluate(() => {
            const form = document.querySelector('form');
            if (!form) return false;
            
            // Try to find submit button
            const buttons = Array.from(form.querySelectorAll('button, input[type="submit"]'));
            const submitButton = buttons.find(btn => {
              const text = btn.textContent?.toLowerCase() || '';
              const type = btn.getAttribute('type')?.toLowerCase() || '';
              return type === 'submit' || text.includes('submit') || text.includes('book') || text.includes('send');
            }) || buttons[buttons.length - 1]; // fallback to last button
            
            if (submitButton) {
              (submitButton as HTMLElement).click();
              return true;
            }
            return false;
          });
          
          if (jsClicked) {
            console.log('✅ Form submitted via JavaScript');
            buttonClicked = true;
          }
        }
        
        if (buttonClicked) {
          // Wait for any confirmation or redirect
          await this.page.waitForTimeout(2000);
          
          // Take another screenshot after submission
          await this.takeScreenshot();
          
          return true;
        } else {
          console.error('❌ Could not find or click submit button with any strategy');
          return false;
        }
        
      } catch (error) {
        console.error('❌ Error clicking submit button:', error);
        return false;
      }

    } catch (error) {
      console.error('Error filling form:', error);
      await this.takeScreenshot(); // Take screenshot for debugging
      throw new Error(`Failed to fill appointment form: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async takeScreenshot(): Promise<string> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      const screenshotsDir = path.join(process.cwd(), 'screenshots');
      await fs.ensureDir(screenshotsDir);
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = path.join(screenshotsDir, `appointment-form-${timestamp}.png`);
      
      await this.page.screenshot({ 
        path: screenshotPath,
        fullPage: true 
      });
      
      console.log(`📸 Screenshot saved: ${screenshotPath}`);
      return screenshotPath;
      
    } catch (error) {
      console.error('Error taking screenshot:', error);
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('🔒 Browser closed successfully');
    } catch (error) {
      console.error('Error closing browser:', error);
      throw new Error(`Failed to close browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to extract field name from element
  private async getFieldName(element: any): Promise<string> {
    let fieldName = await element.getAttribute('name') || await element.getAttribute('id');
    
    if (!fieldName) {
      fieldName = await element.evaluate((el: any) => {
        const id = el.id;
        const labelFor = id ? document.querySelector(`label[for="${id}"]`) : null;
        const parentLabel = el.closest('label');
        const label = labelFor || parentLabel;
        if (label) {
          return label.textContent?.trim().replace(/[:\*]/g, '') || '';
        }
        
        // For select elements, try to infer from options
        if (el.tagName.toLowerCase() === 'select') {
          const selectEl = el as HTMLSelectElement;
          const options = Array.from(selectEl.options).map((opt: any) => opt.text || '').filter((t: string) => t.trim());
          const allOptionsText = options.join(' ');
          
          if (allOptionsText.includes('AM') || allOptionsText.includes('PM') || /\d+:\d+/.test(allOptionsText)) {
            return 'appointment_time';
          } else if (allOptionsText.includes('Checkup') || allOptionsText.includes('Cleaning') || allOptionsText.includes('Consultation') || 
                     allOptionsText.includes('Extraction') || allOptionsText.includes('Root Canal') || allOptionsText.includes('Whitening')) {
            return 'service_type';
          }
        }
        
        return '';
      });
    }
    
    return fieldName;
  }

  async getFormFields(): Promise<Record<string, string>> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    try {
      await this.page.goto(this.config.dentistUrl, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      await this.page.waitForSelector('form', { timeout: 10000 });

      // Scroll to the form section
      console.log('📜 Scrolling to form section...');
      await this.page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      // Wait a moment for smooth scroll to complete
      await this.page.waitForTimeout(500);

      // Get all form fields and their attributes
      const fields = await this.page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return {};

        const inputs = form.querySelectorAll('input, textarea, select');
        const fieldInfo: Record<string, string> = {};

        inputs.forEach((input: Element, index: number) => {
          const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          
          // Try to get a meaningful name from multiple sources
          let name = element.name || element.id;
          
          // If no name/id, try to get from aria-label
          if (!name) {
            name = element.getAttribute('aria-label') || '';
          }
          
          // If still no name, try to find associated label
          if (!name) {
            const labelFor = element.id ? document.querySelector(`label[for="${element.id}"]`) : null;
            const parentLabel = element.closest('label');
            const label = labelFor || parentLabel;
            if (label) {
              name = label.textContent?.trim().replace(/[:\*]/g, '').toLowerCase().replace(/\s+/g, '_') || '';
            }
          }
          
          // If still no name, try data attributes
          if (!name) {
            name = element.getAttribute('data-name') || element.getAttribute('data-field') || '';
          }
          
          // For select elements, try to infer from option texts
          if (!name && element.tagName.toLowerCase() === 'select') {
            const selectEl = element as HTMLSelectElement;
            // Get all non-empty option texts
            const options = Array.from(selectEl.options).map(opt => opt.text || '').filter(t => t.trim());
            const allOptionsText = options.join(' ');
            
            // Check if it looks like time options (AM/PM) or service options
            if (allOptionsText.includes('AM') || allOptionsText.includes('PM') || /\d+:\d+/.test(allOptionsText)) {
              name = 'appointment_time';
            } else if (allOptionsText.includes('Checkup') || allOptionsText.includes('Cleaning') || allOptionsText.includes('Consultation')) {
              name = 'service_type';
            } else if (allOptionsText.includes('Extraction') || allOptionsText.includes('Root Canal') || allOptionsText.includes('Whitening')) {
              name = 'service_type';
            }
          }
          
          // Fallback to field index
          if (!name) {
            name = `field_${index}`;
          }
          
          const type = element.type || element.tagName.toLowerCase();
          const placeholder = 'placeholder' in element ? element.placeholder || '' : '';
          
          // For select elements, include available options
          if (element.tagName.toLowerCase() === 'select') {
            const selectEl = element as HTMLSelectElement;
            const options = Array.from(selectEl.options).map(opt => opt.text || opt.value).filter(o => o);
            fieldInfo[name] = `${type} - placeholder: "${placeholder}" | Options: [${options.join(', ')}]`;
          } else {
            fieldInfo[name] = `${type} - placeholder: "${placeholder}"`;
          }
        });

        return fieldInfo;
      });

      console.log('📋 Available form fields:', fields);
      
      // Detect special fields
      // await this.detectAndLogSpecialFields();
      
      return fields;
      
    } catch (error) {
      console.error('Error getting form fields:', error);
      throw new Error(`Failed to get form fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Helper method to detect and log special form fields
  private async detectAndLogSpecialFields(): Promise<void> {
    if (!this.page) return;

    console.log('\n🔍 Special form fields detected:');
    
    // Click date picker button if it exists
    await this.clickDatePickerButton();
    
    // Detect date selectors
    await this.logFieldType(
      'date',
      '📅 Date Selector',
      `input[type="date"], input[name*="date" i], input[id*="date" i], input[placeholder*="date" i], 
       select[name*="date" i], [class*="date-picker"], [class*="datepicker"], [class*="date-input"]`,
      'date_field'
    );
    
    // Detect time selectors
    await this.logFieldType(
      'time',
      '⏰ Time Selector',
      'input[type="time"], input[name*="time" i], input[id*="time" i], select[name*="time" i]',
      'time_field'
    );
    
    // Detect dropdowns
    await this.logDropdowns();
    
    console.log('');
  }

  // Helper method to click date picker button
  private async clickDatePickerButton(): Promise<void> {
    if (!this.page) return;
    
    const dateButtons = await this.page.locator(`
      button[aria-label*="date" i], button:has-text("date"), button:has-text("calendar"),
      button:has-text("Select Date"), button:has-text("Choose Date"), [class*="date-picker"],
      [class*="datepicker"], [class*="date-button"], [role="button"]:has-text("date")
    `).all();
    
    for (const btn of dateButtons) {
      if (await btn.isVisible()) {
        console.log('📅 Found date picker button, clicking to reveal date selector...');
        try {
          await btn.click();
          await this.page.waitForTimeout(500);
        } catch (e) {
          // Button might not be clickable, that's okay
        }
      }
    }
  }

  // Helper method to log field type
  private async logFieldType(fieldType: string, icon: string, selector: string, defaultName: string): Promise<void> {
    if (!this.page) return;
    
    const elements = await this.page.locator(selector).all();
    for (const element of elements) {
      if (await element.isVisible()) {
        const fieldName = await this.getFieldName(element) || defaultName;
        const type = await element.getAttribute('type') || 'select';
        const placeholder = await element.getAttribute('placeholder') || '';
        console.log(`${icon} - name: "${fieldName}", type: "${type}", placeholder: "${placeholder}"`);
      }
    }
  }

  // Helper method to log dropdowns with options
  private async logDropdowns(): Promise<void> {
    if (!this.page) return;
    
    const dropdowns = await this.page.locator('select').all();
    for (const dropdown of dropdowns) {
      if (await dropdown.isVisible()) {
        const fieldName = await this.getFieldName(dropdown) || 'dropdown_field';
        const placeholder = await dropdown.getAttribute('placeholder') || '';
        console.log(`📋 Dropdown - name: "${fieldName}", type: "select-one", placeholder: "${placeholder}"`);
        
        const options = await dropdown.evaluate((select: HTMLSelectElement) => {
          return Array.from(select.options).map(opt => opt.text || opt.value).filter(o => o);
        });
        console.log(`   Available options: ${options.join(', ')}`);
      }
    }
  }
}

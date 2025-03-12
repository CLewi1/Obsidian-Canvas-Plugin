import { App, PluginSettingTab, Setting } from 'obsidian';
import MyPlugin from './main';

export interface MyPluginSettings {
    mySetting: string;
    canvasApiUrl: string;
    canvasApiToken: string;
    useProxy: boolean;
    corsProxyUrl: string;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
    mySetting: 'default',
    canvasApiUrl: 'https://canvas.instructure.com',
    canvasApiToken: '',
    useProxy: false,
    corsProxyUrl: 'https://cors-anywhere.herokuapp.com/'
}

export class SampleSettingTab extends PluginSettingTab {
    plugin: MyPlugin;

    constructor(app: App, plugin: MyPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        containerEl.createEl('h2', {text: 'Canvas LMS API Settings'});

        new Setting(containerEl)
            .setName('Canvas API URL')
            .setDesc("Your Canvas instance URL (e.g., https://'your school'.instructure.com)")
            .addText(text => text
                .setPlaceholder('https://canvas.instructure.com')
                .setValue(this.plugin.settings.canvasApiUrl)
                .onChange(async (value) => {
                    this.plugin.settings.canvasApiUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Canvas API Token')
            .setDesc('Your Canvas API access token')
            .addText(text => text
                .setPlaceholder('Enter your API token')
                .setValue(this.plugin.settings.canvasApiToken)
                .onChange(async (value) => {
                    this.plugin.settings.canvasApiToken = value;
                    await this.plugin.saveSettings();
                }));
        
        // Add CORS proxy settings
        new Setting(containerEl)
            .setName('Use CORS Proxy')
            .setDesc('Enable if you are experiencing CORS errors (403 Forbidden)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.useProxy)
                .onChange(async (value) => {
                    this.plugin.settings.useProxy = value;
                    await this.plugin.saveSettings();
                    // Update the disabled state of the CORS proxy URL input
                    containerEl.querySelector('.cors-proxy-url input')?.toggleAttribute('disabled', !value);
                }));
                
        new Setting(containerEl)
            .setName('CORS Proxy URL')
            .setDesc('URL for a CORS proxy service (e.g., https://cors-anywhere.herokuapp.com/)')
            .addText(text => text
                .setPlaceholder('https://cors-anywhere.herokuapp.com/')
                .setValue(this.plugin.settings.corsProxyUrl)
                .setDisabled(!this.plugin.settings.useProxy)
                .onChange(async (value) => {
                    this.plugin.settings.corsProxyUrl = value;
                    await this.plugin.saveSettings();
                }))
            .settingEl.addClass('cors-proxy-url');
        
        // Add a test connection button
        new Setting(containerEl)
            .setName('Test Connection')
            .setDesc('Test your Canvas API connection')
            .addButton(button => button
                .setButtonText('Test')
                .onClick(async () => {
                    const statusText = containerEl.createEl('div', {
                        text: 'Testing connection...',
                        cls: 'canvas-api-status'
                    });
                    
                    try {
                        const success = await this.plugin.testCanvasConnection();
                        if (success) {
                            statusText.setText('✅ Connection successful!');
                            statusText.className = 'canvas-api-status success';
                        } else {
                            statusText.setText('❌ Connection failed. Check your settings and try again.');
                            statusText.className = 'canvas-api-status error';
                        }
                    } catch (error) {
                        statusText.setText(`❌ Connection failed: ${error.message || 'Unknown error'}`);
                        statusText.className = 'canvas-api-status error';
                    }
                    
                    // Remove status message after 5 seconds
                    setTimeout(() => {
                        statusText.remove();
                    }, 5000);
                }));
        
    }
}

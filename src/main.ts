import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { CanvasAPI } from './canvasApi';
import { SampleSettingTab, MyPluginSettings, DEFAULT_SETTINGS } from './settings';

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	canvasApi: CanvasAPI;

	async onload() {
		await this.loadSettings();
		this.canvasApi = new CanvasAPI(this.settings);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('graduation-cap', 'Canvas LMS', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			this.fetchCanvasData(true);
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Canvas LMS Ready');

		// Add Canvas API related commands
		this.addCommand({
			id: 'fetch-canvas-courses',
			name: 'Fetch Canvas Courses (Console)',
			callback: () => {
				this.fetchCanvasData(false);
			}
		});

		this.addCommand({
			id: 'fetch-canvas-courses-to-note',
			name: 'Fetch Canvas Courses (Insert in Note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fetchCanvasData(true);
			}
		});

		this.addCommand({
			id: 'fetch-canvas-profile',
			name: 'Fetch Canvas User Profile (Console)',
			callback: () => {
				this.fetchCanvasUserProfile(false);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-profile-to-note',
			name: 'Fetch Canvas User Profile (Insert in Note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fetchCanvasUserProfile(true);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-events',
			name: 'Fetch Canvas Upcoming Events (Console)',
			callback: () => {
				this.fetchCanvasEvents(false);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-events-to-note',
			name: 'Fetch Canvas Upcoming Events (Insert in Note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fetchCanvasEvents(true);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-todo',
			name: 'Fetch Canvas Todo Items (Console)',
			callback: () => {
				this.fetchCanvasTodoItems(false);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-todo-to-note',
			name: 'Fetch Canvas Todo Items (Insert in Note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fetchCanvasTodoItems(true);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-grades',
			name: 'Fetch Canvas Course Grades (Console)',
			callback: () => {
				this.fetchCanvasGrades(false);
			}
		});
		
		this.addCommand({
			id: 'fetch-canvas-grades-to-note',
			name: 'Fetch Canvas Course Grades (Insert in Note)',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.fetchCanvasGrades(true);
			}
		});
		
		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	// Helper method to get the active editor
	private getActiveEditor(): Editor | null {
		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (activeView) {
			return activeView.editor;
		}
		return null;
	}

	// Helper method to format a date string
	private formatDate(dateStr: string): string {
		if (!dateStr) return 'No date';
		const date = new Date(dateStr);
		return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
	}

	// Helper method to insert text into the current document
	private insertTextIntoCurrentDocument(text: string): boolean {
		const editor = this.getActiveEditor();
		if (editor) {
			const cursor = editor.getCursor();
			editor.replaceRange(text, cursor);
			return true;
		}
		new Notice('No active document to insert text into');
		return false;
	}

	// Test connection to Canvas API
	async testCanvasConnection(): Promise<boolean> {
		try {
			new Notice('Testing Canvas API connection...');
			const isConnected = await this.canvasApi.testConnection();
			if (isConnected) {
				new Notice('Canvas API connection successful!');
				return true;
			} else {
				new Notice('Failed to connect to Canvas API.');
				return false;
			}
		} catch (error) {
			console.error('Connection test error:', error);
			new Notice(`Connection test failed: ${error.message || 'Unknown error'}`);
			return false;
		}
	}

	// Methods to interact with Canvas API
	async fetchCanvasData(insertIntoNote: boolean = false) {
		try {
			new Notice('Fetching Canvas courses...');
			const courses = await this.canvasApi.getCourses('student', 'active');
			console.log('Canvas Courses:', courses);
			
			let outputText = '';
			
			if (courses && courses.length > 0) {
				// Display courses in console in a structured way
				console.log('\n=== Active Courses ===');
				outputText += '## Canvas Active Courses\n\n';
				
				courses.forEach(course => {
					console.log(`Course: ${course.name} (ID: ${course.id})`);
					outputText += `- **${course.name}** (ID: ${course.id})\n`;
				});
				
				// Fetch assignments for each course
				for (const course of courses) {
					console.log(`\n=== Assignments for ${course.name} ===`);
					outputText += `\n### Assignments for ${course.name}\n\n`;
					
					const assignments = await this.canvasApi.getCourseAssignments(course.id);
					
					if (assignments && assignments.length > 0) {
						let completedCount = 0;
						let pendingCount = 0;
						
						outputText += '| Assignment | Due Date | Status |\n';
						outputText += '| --- | --- | --- |\n';
						
						assignments.forEach(assignment => {
							if (assignment.due_at) {
								// Check if assignment has been submitted
								const status = assignment.has_submitted_submissions ? 
									'✅ Completed' : '⏳ Pending';
									
								if (assignment.has_submitted_submissions) {
									completedCount++;
									console.log(`Completed: ${assignment.name} (Due: ${assignment.due_at})`);
								} else {
									pendingCount++;
									console.log(`Not Completed: ${assignment.name} (Due: ${assignment.due_at})`);
								}
								
								outputText += `| ${assignment.name} | ${this.formatDate(assignment.due_at)} | ${status} |\n`;
							}
						});
						
						outputText += `\n**Summary:** ${completedCount} completed, ${pendingCount} pending assignments\n\n`;
					} else {
						console.log('No assignments found for this course.');
						outputText += 'No assignments found for this course.\n\n';
					}
				}
			}
			
			new Notice(`Fetched ${courses.length} courses`);
			
			if (insertIntoNote) {
				if (this.insertTextIntoCurrentDocument(outputText)) {
					new Notice('Canvas courses data inserted into note');
				}
			}
		} catch (error) {
			console.error('Error fetching Canvas data:', error);
			new Notice(`Failed to fetch Canvas data: ${error.message || 'Unknown error'}`);
		}
	}
	
	async fetchCanvasUserProfile(insertIntoNote: boolean = false) {
		try {
			new Notice('Fetching Canvas user profile...');
			const profile = await this.canvasApi.getUserProfile();
			
			console.log('\n=== User Profile ===');
			console.log(`Name: ${profile.name}`);
			console.log(`ID: ${profile.id}`);
			console.log(`Email: ${profile.primary_email || profile.email}`);
			console.log(`Login ID: ${profile.login_id}`);
			
			let outputText = '';
			outputText += '## Canvas User Profile\n\n';
			outputText += `- **Name:** ${profile.name}\n`;
			outputText += `- **ID:** ${profile.id}\n`;
			outputText += `- **Email:** ${profile.primary_email || profile.email}\n`;
			outputText += `- **Login ID:** ${profile.login_id}\n\n`;
			
			new Notice(`Fetched profile for ${profile.name}`);
			
			if (insertIntoNote) {
				if (this.insertTextIntoCurrentDocument(outputText)) {
					new Notice('Canvas profile data inserted into note');
				}
			}
		} catch (error) {
			console.error('Error fetching Canvas user profile:', error);
			new Notice(`Failed to fetch user profile: ${error.message || 'Unknown error'}`);
		}
	}
	
	async fetchCanvasEvents(insertIntoNote: boolean = false) {
		try {
			new Notice('Fetching Canvas upcoming events...');
			const events = await this.canvasApi.getUpcomingEvents();
			
			console.log('\n=== Upcoming Events ===');
			
			let outputText = '';
			outputText += '## Canvas Upcoming Events\n\n';
			
			if (events && events.length > 0) {
				outputText += '| Event | Date | Course |\n';
				outputText += '| --- | --- | --- |\n';
				
				events.forEach(event => {
					console.log(`${event.title} (Date: ${event.start_at})`);
					outputText += `| ${event.title} | ${this.formatDate(event.start_at)} | ${event.context_name || 'N/A'} |\n`;
				});
			} else {
				console.log('No upcoming events found.');
				outputText += 'No upcoming events found.\n';
			}
			
			new Notice(`Fetched ${events.length} upcoming events`);
			
			if (insertIntoNote) {
				if (this.insertTextIntoCurrentDocument(outputText)) {
					new Notice('Canvas events data inserted into note');
				}
			}
		} catch (error) {
			console.error('Error fetching Canvas events:', error);
			new Notice(`Failed to fetch events: ${error.message || 'Unknown error'}`);
		}
	}
	
	async fetchCanvasTodoItems(insertIntoNote: boolean = false) {
		try {
			new Notice('Fetching Canvas todo items...');
			const todos = await this.canvasApi.getTodoItems();
			
			console.log('\n=== Todo Items ===');
			
			let outputText = '';
			outputText += '## Canvas Todo Items\n\n';
			
			if (todos && todos.length > 0) {
				outputText += '| Assignment | Course | Due Date |\n';
				outputText += '| --- | --- | --- |\n';
				
				todos.forEach(todo => {
					console.log(`${todo.assignment.name} (Course: ${todo.context_name})`);
					outputText += `| ${todo.assignment.name} | ${todo.context_name} | ${this.formatDate(todo.assignment.due_at)} |\n`;
				});
			} else {
				console.log('No todo items found.');
				outputText += 'No todo items found.\n';
			}
			
			new Notice(`Fetched ${todos.length} todo items`);
			
			if (insertIntoNote) {
				if (this.insertTextIntoCurrentDocument(outputText)) {
					new Notice('Canvas todo items inserted into note');
				}
			}
		} catch (error) {
			console.error('Error fetching Canvas todo items:', error);
			new Notice(`Failed to fetch todo items: ${error.message || 'Unknown error'}`);
		}
	}
	
	async fetchCanvasGrades(insertIntoNote: boolean = false) {
		try {
			new Notice('Fetching Canvas course grades...');
			const courses = await this.canvasApi.getCourseGrades();
			
			console.log('\n=== Course Grades ===');
			
			let outputText = '';
			outputText += '## Canvas Course Grades\n\n';
			outputText += '| Course | Grade | Score |\n';
			outputText += '| --- | --- | --- |\n';
			
			if (courses && courses.length > 0) {
				courses.forEach(course => {
					if (course.enrollments && course.enrollments.length > 0) {
						const enrollment = course.enrollments[0];
						const grade = enrollment.computed_current_grade || 'N/A';
						const score = enrollment.computed_current_score || 'N/A';
						
						console.log(`${course.name}: ${grade || score || 'No grade'}`);
						outputText += `| ${course.name} | ${grade} | ${score} |\n`;
					} else {
						console.log(`${course.name}: No grade information`);
						outputText += `| ${course.name} | No grade | No score |\n`;
					}
				});
			} else {
				console.log('No courses with grades found.');
				outputText += 'No courses with grades found.\n';
			}
			
			new Notice(`Fetched grades for ${courses.length} courses`);
			
			if (insertIntoNote) {
				if (this.insertTextIntoCurrentDocument(outputText)) {
					new Notice('Canvas grades data inserted into note');
				}
			}
		} catch (error) {
			console.error('Error fetching Canvas grades:', error);
			new Notice(`Failed to fetch grades: ${error.message || 'Unknown error'}`);
		}
	}

	onunload() {
		// Clean up any resources if needed
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Recreate API instance with new settings
		this.canvasApi = new CanvasAPI(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

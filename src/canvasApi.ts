import { MyPluginSettings } from './settings';
import { requestUrl, RequestUrlResponse, Notice } from 'obsidian';

export class CanvasAPI {
    private apiUrl: string;
    private accessToken: string;
    private useProxy: boolean;
    private corsProxyUrl: string;

    constructor(settings: MyPluginSettings) {
        this.apiUrl = settings.canvasApiUrl.replace(/\/$/, ''); // Remove trailing slash
        this.accessToken = settings.canvasApiToken;
        this.useProxy = settings.useProxy;
        this.corsProxyUrl = settings.corsProxyUrl;
    }

    /**
     * Make a request to the Canvas API
     * @param endpoint API endpoint (e.g., '/api/v1/courses')
     * @param method HTTP method ('GET', 'POST', 'PUT', 'DELETE')
     * @param params Query parameters
     * @param data Request body for POST/PUT requests
     * @returns JSON response from the API
     */
    private async _request(
        endpoint: string, 
        method: string = 'GET', 
        params: Record<string, any> = {}, 
        data: any = null
    ): Promise<any> {
        try {
            // Ensure endpoint starts with '/'
            if (!endpoint.startsWith('/')) {
                endpoint = '/' + endpoint;
            }
            
            // Ensure endpoint includes api/v1 path
            if (!endpoint.includes('/api/v1')) {
                endpoint = '/api/v1' + endpoint;
            }
            
            // Build the full URL
            let url = `${this.apiUrl}${endpoint}`;
            
            // Add query parameters
            if (Object.keys(params).length > 0) {
                const queryParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    queryParams.append(key, String(value));
                });
                url += `?${queryParams.toString()}`;
            }
            
            // Use CORS proxy if enabled
            if (this.useProxy && this.corsProxyUrl) {
                url = `${this.corsProxyUrl}${encodeURIComponent(url)}`;
                console.log(`Using proxy URL: ${url}`);
            }
            
            // Set headers
            const headers: Record<string, string> = {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            };
            
            console.log(`Making ${method} request to: ${url}`);
            
            // Make the request
            const response: RequestUrlResponse = await requestUrl({
                url: url,
                method: method,
                headers: headers,
                body: data ? JSON.stringify(data) : undefined,
                throw: false
            });
            
            console.log(`Response status: ${response.status}`);
            
            // Handle error responses
            if (response.status >= 400) {
                console.error(`Error ${response.status}:`, response.text);
                throw new Error(`Canvas API request failed: ${response.status} - ${response.text}`);
            }
            
            return response.json;
        } catch (error) {
            console.error('Canvas API request failed:', error);
            throw error;
        }
    }

    /**
     * Get the current user's profile
     * @returns User profile object
     */
    async getUserProfile(): Promise<any> {
        return this._request('/users/self');
    }
    
    /**
     * Get courses for the current user
     * @param enrollmentType Filter by enrollment type
     * @param enrollmentState Filter by enrollment state
     * @returns List of courses
     */
    async getCourses(enrollmentType?: string, enrollmentState?: string): Promise<any[]> {
        const params: Record<string, any> = {
            per_page: 50
        };
        
        if (enrollmentType) {
            params.enrollment_type = enrollmentType;
        }
        
        if (enrollmentState) {
            params.enrollment_state = enrollmentState;
        }
        
        return this._request('/courses', 'GET', params);
    }
    
    /**
     * Get assignments for a specific course
     * @param courseId Course ID
     * @returns List of assignments
     */
    async getCourseAssignments(courseId: string | number): Promise<any[]> {
        return this._request(`/courses/${courseId}/assignments`, 'GET', { per_page: 50 });
    }
    
    /**
     * Get modules for a specific course
     * @param courseId Course ID
     * @returns List of modules
     */
    async getCourseModules(courseId: string | number): Promise<any[]> {
        return this._request(`/courses/${courseId}/modules`, 'GET', { per_page: 50 });
    }
    
    /**
     * Get upcoming events for the current user
     * @returns List of upcoming events
     */
    async getUpcomingEvents(): Promise<any[]> {
        return this._request('/users/self/upcoming_events');
    }
    
    /**
     * Get todo items for the current user
     * @returns List of todo items
     */
    async getTodoItems(): Promise<any[]> {
        return this._request('/users/self/todo');
    }
    
    /**
     * Get course grades for the current user
     * @returns List of courses with grade information
     */
    async getCourseGrades(): Promise<any[]> {
        return this._request('/courses', 'GET', { 
            include: ['total_scores', 'current_grading_period_scores'],
            enrollment_type: 'student',
            enrollment_state: 'active',
            per_page: 50
        });
    }
    
    /**
     * Test connection to Canvas API
     * @returns True if connection is successful
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.getUserProfile();
            return true;
        } catch (error) {
            return false;
        }
    }
}

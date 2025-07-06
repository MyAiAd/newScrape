import { GoogleAuth } from 'google-auth-library';
import { sheets_v4, google } from 'googleapis';

export interface LeadData {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  email?: string;
  linkedinUrl?: string;
  companyName: string;
  jobTitle: string;
  jobUrl: string;
  jobLocation?: string;
  jobSalary?: string;
  leadScore?: number;
  qualificationNotes?: string;
}

export interface ExportOptions {
  sheetName?: string;
  includeHeaders?: boolean;
  clearExisting?: boolean;
}

export class GoogleSheetsService {
  private sheets: sheets_v4.Sheets;
  private auth: GoogleAuth;

  constructor() {
    // Initialize Google Auth
    this.auth = new GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        project_id: process.env.GOOGLE_SHEETS_PROJECT_ID,
      },
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file'
      ],
    });

    // Initialize Sheets API
    this.sheets = google.sheets({ version: 'v4', auth: this.auth });
  }

  async createSpreadsheet(title: string): Promise<{ spreadsheetId: string; url: string }> {
    try {
      const response = await this.sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: title,
          },
        },
      });

      const spreadsheetId = response.data.spreadsheetId!;
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      return { spreadsheetId, url };
    } catch (error) {
      console.error('Error creating spreadsheet:', error);
      throw new Error('Failed to create spreadsheet');
    }
  }

  async exportLeads(
    spreadsheetId: string,
    leads: LeadData[],
    options: ExportOptions = {}
  ): Promise<void> {
    const {
      sheetName = 'Leads',
      includeHeaders = true,
      clearExisting = false
    } = options;

    try {
      // Get or create sheet
      await this.ensureSheetExists(spreadsheetId, sheetName);

      // Clear existing data if requested
      if (clearExisting) {
        await this.clearSheet(spreadsheetId, sheetName);
      }

      // Prepare data
      const headers = [
        'Full Name',
        'First Name',
        'Last Name',
        'Title',
        'Email',
        'LinkedIn URL',
        'Company',
        'Job Title',
        'Job URL',
        'Job Location',
        'Job Salary',
        'Lead Score',
        'Qualification Notes',
        'Date Added'
      ];

      const rows = leads.map(lead => [
        lead.fullName || '',
        lead.firstName || '',
        lead.lastName || '',
        lead.title || '',
        lead.email || '',
        lead.linkedinUrl || '',
        lead.companyName,
        lead.jobTitle,
        lead.jobUrl,
        lead.jobLocation || '',
        lead.jobSalary || '',
        lead.leadScore?.toString() || '',
        lead.qualificationNotes || '',
        new Date().toISOString().split('T')[0] // Current date
      ]);

      // Combine headers and data
      const values = includeHeaders ? [headers, ...rows] : rows;

      // Write to sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:N`,
        valueInputOption: 'RAW',
        requestBody: {
          values,
        },
      });

      // Format the sheet
      await this.formatSheet(spreadsheetId, sheetName);

    } catch (error) {
      console.error('Error exporting leads:', error);
      throw new Error('Failed to export leads to Google Sheets');
    }
  }

  private async ensureSheetExists(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      // Get spreadsheet info
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const existingSheet = response.data.sheets?.find(
        sheet => sheet.properties?.title === sheetName
      );

      if (!existingSheet) {
        // Create new sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });
      }
    } catch (error) {
      console.error('Error ensuring sheet exists:', error);
      throw error;
    }
  }

  private async clearSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
      });
    } catch (error) {
      console.error('Error clearing sheet:', error);
      throw error;
    }
  }

  private async formatSheet(spreadsheetId: string, sheetName: string): Promise<void> {
    try {
      // Get sheet ID
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const sheet = response.data.sheets?.find(
        s => s.properties?.title === sheetName
      );

      if (!sheet || !sheet.properties?.sheetId) return;

      const sheetId = sheet.properties.sheetId;

      // Apply formatting
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            // Freeze header row
            {
              updateSheetProperties: {
                properties: {
                  sheetId,
                  gridProperties: {
                    frozenRowCount: 1,
                  },
                },
                fields: 'gridProperties.frozenRowCount',
              },
            },
            // Format header row
            {
              repeatCell: {
                range: {
                  sheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.2,
                      blue: 0.8,
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1,
                        green: 1,
                        blue: 1,
                      },
                      bold: true,
                    },
                  },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat)',
              },
            },
            // Auto-resize columns
            {
              autoResizeDimensions: {
                dimensions: {
                  sheetId,
                  dimension: 'COLUMNS',
                },
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error('Error formatting sheet:', error);
      // Don't throw - formatting is nice to have but not critical
    }
  }

  async getSpreadsheetInfo(spreadsheetId: string): Promise<{
    title: string;
    sheets: string[];
    url: string;
  }> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId,
      });

      const title = response.data.properties?.title || 'Untitled';
      const sheets = response.data.sheets?.map(s => s.properties?.title || '') || [];
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      return { title, sheets, url };
    } catch (error) {
      console.error('Error getting spreadsheet info:', error);
      throw new Error('Failed to get spreadsheet information');
    }
  }

  async shareSpreadsheet(spreadsheetId: string, email: string, role: 'reader' | 'writer' | 'owner' = 'writer'): Promise<void> {
    try {
      const drive = google.drive({ version: 'v3', auth: this.auth });
      
      await drive.permissions.create({
        fileId: spreadsheetId,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email,
        },
      });
    } catch (error) {
      console.error('Error sharing spreadsheet:', error);
      throw new Error('Failed to share spreadsheet');
    }
  }
} 
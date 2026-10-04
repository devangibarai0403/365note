const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// ==========================================
// ALL 144 CLASS SESSIONS FROM ALL 5 UPDATED DOCX FILES
// ==========================================

const records = [
  // ==================== 1. AERO (23 records) ====================
  // June 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-06', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-12', 'From Time': '05:00 PM', 'To Time': '06:30 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-13', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-20', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-21', 'From Time': '09:30 PM', 'To Time': '10:30 PM', 'Hours': 1, 'Hourly Rate': 250, 'Total Amount': 250, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-27', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375, 'Notes': 'English' },
  // July 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-04', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-08', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-10', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-18', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-25', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  // August 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-01', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-09', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-15', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-22', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-27', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  // September 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-05', 'From Time': '08:15 AM', 'To Time': '10:15 AM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-08', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-12', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-18', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-25', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500, 'Notes': 'English' },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-26', 'From Time': '06:30 PM', 'To Time': '07:30 PM', 'Hours': 1, 'Hourly Rate': 250, 'Total Amount': 250, 'Notes': 'English' },
  // October 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-10-02', 'From Time': '09:30 AM', 'To Time': '10:30 AM', 'Hours': 1, 'Hourly Rate': 250, 'Total Amount': 250, 'Notes': 'English' },

  // ==================== 2. FOUNDATION CLASSES (16 records) ====================
  // April 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-02', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-06', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-09', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-13', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-16', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-23', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  // June 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-11', 'From Time': '08:00 PM', 'To Time': '09:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-16', 'From Time': '08:00 PM', 'To Time': '09:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-30', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Science 9th' },
  // July 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-08', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-09', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-14', 'From Time': '07:00 PM', 'To Time': '08:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-31', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Science 9th' },
  // August 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-08-06', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Science 9th' },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-08-15', 'From Time': '03:30 PM', 'To Time': '06:00 PM', 'Hours': 2.5, 'Hourly Rate': 300, 'Total Amount': 750, 'Notes': 'Science 9th' },
  // September 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-09-02', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450, 'Notes': 'Science 9th' },

  // ==================== 3. NAKSHATRA CLASSES (34 records) ====================
  // April 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-12', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': '10th Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-19', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': '10th Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-26', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': '10th Sci 2' },
  // May 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-05-31', 'From Time': '11:00 AM', 'To Time': '12:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450, 'Notes': '10th Sci 2' },
  // June 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-07', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': '10th Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-06-14', 'From Time': '10:00 AM', 'To Time': '11:00 AM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-14', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-21', 'From Time': '11:00 AM', 'To Time': '12:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-22', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'Sci 2' },
  // July 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-05', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-05', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-12', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-12', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-19', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-19', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-26', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-26', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-30', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  // August 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-02', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-02', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-16', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-16', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-23', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-23', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-30', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-30', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300, 'Notes': 'English' },
  // September 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-06', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-09', 'From Time': '04:30 PM', 'To Time': '07:30 PM', 'Hours': 3, 'Hourly Rate': 300, 'Total Amount': 900, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-23', 'From Time': '05:00 PM', 'To Time': '07:30 PM', 'Hours': 2.5, 'Hourly Rate': 300, 'Total Amount': 750, 'Notes': 'Sci 2' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Writing Skills', 'Date': '2026-09-24', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'Writing Skills' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-09-24', 'From Time': '06:00 PM', 'To Time': '07:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450, 'Notes': '9th Eng' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-29', 'From Time': '05:00 PM', 'To Time': '07:30 PM', 'Hours': 2.5, 'Hourly Rate': 300, 'Total Amount': 750, 'Notes': 'Sci 2' },
  // October 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Writing Skills', 'Date': '2026-10-01', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'Writing Skills' },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-10-01', 'From Time': '06:00 PM', 'To Time': '07:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450, 'Notes': '9th Eng' },

  // ==================== 4. SCOREUP ACADEMY (17 records) ====================
  // July 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-13', 'From Time': '06:00 PM', 'To Time': '07:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-17', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-20', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-24', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-28', 'From Time': '06:00 PM', 'To Time': '07:30 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-31', 'From Time': '06:00 PM', 'To Time': '07:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  // August 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-03', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-07', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-10', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-14', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-17', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-21', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-24', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-31', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525, 'Notes': 'English' },
  // September 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-09-04', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-09-07', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-09-28', 'From Time': '06:00 PM', 'To Time': '07:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },

  // ==================== 5. SHIKSHA NIKETAN ACADEMY (54 records) ====================
  // April 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-01', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-03', 'From Time': '04:00 PM', 'To Time': '05:30 PM', 'Hours': 1.5, 'Hourly Rate': 400, 'Total Amount': 600, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-04', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-08', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-14', 'From Time': '03:30 PM', 'To Time': '05:30 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-18', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-22', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-25', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-26', 'From Time': '04:00 PM', 'To Time': '05:00 PM', 'Hours': 1, 'Hourly Rate': 400, 'Total Amount': 400, 'Notes': 'Science' },
  // May 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-01', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-02', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-03', 'From Time': '01:00 PM', 'To Time': '03:00 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-09', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-09', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-10', 'From Time': '04:00 PM', 'To Time': '05:30 PM', 'Hours': 1.5, 'Hourly Rate': 400, 'Total Amount': 600, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-10', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-16', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-30', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  // June 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-06', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-13', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-14', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-20', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-21', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-22', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-27', 'From Time': '03:00 PM', 'To Time': '04:10 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-06-27', 'From Time': '04:10 PM', 'To Time': '05:10 PM', 'Hours': 1, 'Hourly Rate': 400, 'Total Amount': 400, 'Notes': 'Science' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-28', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  // July 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-04', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-05', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-12', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-18', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-19', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-25', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-26', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  // August 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-01', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-02', 'From Time': '04:00 PM', 'To Time': '05:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-11', 'From Time': '05:30 PM', 'To Time': '08:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-13', 'From Time': '05:30 PM', 'To Time': '08:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-16', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-22', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-23', 'From Time': '03:00 PM', 'To Time': '07:00 PM', 'Hours': 4, 'Hourly Rate': 350, 'Total Amount': 1400, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-25', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-29', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-30', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  // September 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-05', 'From Time': '10:30 AM', 'To Time': '12:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-06', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-11', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-17', 'From Time': '04:30 PM', 'To Time': '07:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-19', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-20', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-26', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-27', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-30', 'From Time': '04:30 PM', 'To Time': '06:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700, 'Notes': 'English' },
  // October 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-10-03', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050, 'Notes': 'English' },
];

function makeWorkbook(rows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [
    { wch: 25 }, // Class Name
    { wch: 14 }, // Subject
    { wch: 14 }, // Date
    { wch: 14 }, // From Time
    { wch: 14 }, // To Time
    { wch: 10 }, // Hours
    { wch: 14 }, // Hourly Rate
    { wch: 14 }, // Total Amount
    { wch: 22 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, ws, 'Class Records');
  return wb;
}

// 1. Write Master All Classes Import Files
const wbAll = makeWorkbook(records);
const allFiles = [
  path.join('public', 'few_months_excel', 'All_Classes_Records_Updated.xlsx'),
  path.join('public', 'few_months_excel', 'classes_import_all_updated.xlsx'),
  path.join('public', 'few_months_excel', 'records.xlsx'),
  path.join('public', 'classes_few_months_record', 'All_Classes_Records_Updated.xlsx'),
  path.join('public', 'classes_few_months_record', 'records.xlsx'),
];

allFiles.forEach(f => {
  try {
    XLSX.writeFile(wbAll, f);
    console.log('Saved:', f);
  } catch (e) {
    console.log('Skipped (locked):', f);
  }
});

// 2. Also write individual sheets for each class
const classNames = [...new Set(records.map(r => r['Class Name']))];
classNames.forEach(cName => {
  const classRows = records.filter(r => r['Class Name'] === cName);
  const wbClass = makeWorkbook(classRows);
  const safeName = cName.replace(/[^a-zA-Z0-9_-]/g, '_');
  
  const target1 = path.join('public', 'few_months_excel', `${safeName}.xlsx`);
  const target2 = path.join('public', 'classes_few_months_record', `${cName}.xlsx`);
  
  try {
    XLSX.writeFile(wbClass, target1);
    console.log('Saved class sheet:', target1);
  } catch (e) {
    console.log('Skipped (locked):', target1);
  }
  
  try {
    XLSX.writeFile(wbClass, target2);
    console.log('Saved class sheet:', target2);
  } catch (e) {
    console.log('Skipped (locked):', target2);
  }
});

console.log('==============================================');
console.log('TOTAL SESSIONS ACROSS ALL CLASSES:', records.length);
const totalH = records.reduce((a, b) => a + b.Hours, 0);
const totalA = records.reduce((a, b) => a + b['Total Amount'], 0);
console.log('TOTAL HOURS:', totalH);
console.log('TOTAL AMOUNT: Rs.', totalA);
console.log('==============================================');

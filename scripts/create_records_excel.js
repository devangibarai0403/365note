const XLSX = require('xlsx');
const path = require('path');

// Complete 136 records parsed from the 5 docx files
const records = [
  // ==================== 1. AERO (22 records) ====================
  // June 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-06', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-12', 'From Time': '05:00 PM', 'To Time': '06:30 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-13', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-20', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-21', 'From Time': '09:30 PM', 'To Time': '10:30 PM', 'Hours': 1, 'Hourly Rate': 250, 'Total Amount': 250 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-06-27', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375 },
  // July 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-04', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-08', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-10', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-18', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-07-25', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  // August 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-01', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-09', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-15', 'From Time': '06:30 PM', 'To Time': '08:00 PM', 'Hours': 1.5, 'Hourly Rate': 250, 'Total Amount': 375 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-22', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-08-27', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  // September 2026
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-05', 'From Time': '08:15 AM', 'To Time': '10:15 AM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-08', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-12', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-18', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-25', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 250, 'Total Amount': 500 },
  { 'Class Name': 'Aero', 'Subject': 'English', 'Date': '2026-09-26', 'From Time': '06:30 PM', 'To Time': '07:30 PM', 'Hours': 1, 'Hourly Rate': 250, 'Total Amount': 250 },

  // ==================== 2. FOUNDATION CLASSES (16 records) ====================
  // April 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-02', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-06', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-09', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-13', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-16', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-04-23', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  // June 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-11', 'From Time': '08:00 PM', 'To Time': '09:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-16', 'From Time': '08:00 PM', 'To Time': '09:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-06-30', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  // July 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-08', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-09', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-14', 'From Time': '07:00 PM', 'To Time': '08:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-07-31', 'From Time': '07:30 PM', 'To Time': '08:30 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  // August 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-08-06', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-08-15', 'From Time': '03:30 PM', 'To Time': '06:00 PM', 'Hours': 2.5, 'Hourly Rate': 300, 'Total Amount': 750 },
  // September 2026
  { 'Class Name': 'Foundation Classes', 'Subject': 'Science', 'Date': '2026-09-02', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450 },

  // ==================== 3. NAKSHATRA CLASSES (31 records) ====================
  // April 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-12', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-19', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-04-26', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  // May 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-05-31', 'From Time': '11:00 AM', 'To Time': '12:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450 },
  // June 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-07', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-06-14', 'From Time': '10:00 AM', 'To Time': '11:00 AM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-14', 'From Time': '11:00 AM', 'To Time': '01:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-21', 'From Time': '11:00 AM', 'To Time': '12:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-06-22', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  // July 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-05', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-05', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-12', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-12', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-19', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-19', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-26', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-07-26', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-07-30', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  // August 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-02', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-02', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-16', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-16', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-23', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-23', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-08-30', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-08-30', 'From Time': '12:00 PM', 'To Time': '01:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  // September 2026
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-06', 'From Time': '10:00 AM', 'To Time': '12:00 PM', 'Hours': 2, 'Hourly Rate': 300, 'Total Amount': 600 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-09', 'From Time': '04:30 PM', 'To Time': '07:30 PM', 'Hours': 3, 'Hourly Rate': 300, 'Total Amount': 900 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'Science', 'Date': '2026-09-23', 'From Time': '05:00 PM', 'To Time': '07:30 PM', 'Hours': 2.5, 'Hourly Rate': 300, 'Total Amount': 750 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-09-24', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 300, 'Total Amount': 300 },
  { 'Class Name': 'Nakshatra Classes', 'Subject': 'English', 'Date': '2026-09-24', 'From Time': '06:00 PM', 'To Time': '07:30 PM', 'Hours': 1.5, 'Hourly Rate': 300, 'Total Amount': 450 },

  // ==================== 4. SCOREUP ACADEMY (16 records) ====================
  // July 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-13', 'From Time': '06:00 PM', 'To Time': '07:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-17', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-20', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-24', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-28', 'From Time': '06:00 PM', 'To Time': '07:30 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-07-31', 'From Time': '06:00 PM', 'To Time': '07:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  // August 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-03', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-07', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-10', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-14', 'From Time': '06:00 PM', 'To Time': '08:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-17', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-21', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-24', 'From Time': '05:30 PM', 'To Time': '07:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-08-31', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525 },
  // September 2026
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-09-04', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'ScoreUp Academy', 'Subject': 'English', 'Date': '2026-09-07', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },

  // ==================== 5. SHIKSHA NIKETAN ACADEMY (51 records) ====================
  // April 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-01', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-03', 'From Time': '04:00 PM', 'To Time': '05:30 PM', 'Hours': 1.5, 'Hourly Rate': 400, 'Total Amount': 600 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-04', 'From Time': '05:30 PM', 'To Time': '06:30 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-08', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-14', 'From Time': '03:30 PM', 'To Time': '05:30 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-18', 'From Time': '05:00 PM', 'To Time': '07:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-22', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-04-25', 'From Time': '05:00 PM', 'To Time': '08:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-04-26', 'From Time': '04:00 PM', 'To Time': '05:00 PM', 'Hours': 1, 'Hourly Rate': 400, 'Total Amount': 400 },
  // May 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-01', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-02', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-03', 'From Time': '01:00 PM', 'To Time': '03:00 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-09', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 400, 'Total Amount': 800 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-09', 'From Time': '05:00 PM', 'To Time': '06:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-05-10', 'From Time': '04:00 PM', 'To Time': '05:30 PM', 'Hours': 1.5, 'Hourly Rate': 400, 'Total Amount': 600 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-10', 'From Time': '05:30 PM', 'To Time': '07:00 PM', 'Hours': 1.5, 'Hourly Rate': 350, 'Total Amount': 525 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-16', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-05-30', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  // June 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-06', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-13', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-14', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-20', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-21', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-22', 'From Time': '06:30 PM', 'To Time': '08:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-27', 'From Time': '03:00 PM', 'To Time': '04:10 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'Science', 'Date': '2026-06-27', 'From Time': '04:10 PM', 'To Time': '05:10 PM', 'Hours': 1, 'Hourly Rate': 400, 'Total Amount': 400 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-06-28', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  // July 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-04', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-05', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-12', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-18', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-19', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-25', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-07-26', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  // August 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-01', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-02', 'From Time': '04:00 PM', 'To Time': '05:00 PM', 'Hours': 1, 'Hourly Rate': 350, 'Total Amount': 350 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-11', 'From Time': '05:30 PM', 'To Time': '08:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-13', 'From Time': '05:30 PM', 'To Time': '08:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-16', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-22', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-23', 'From Time': '03:00 PM', 'To Time': '07:00 PM', 'Hours': 4, 'Hourly Rate': 350, 'Total Amount': 1400 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-25', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-29', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-08-30', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  // September 2026
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-05', 'From Time': '10:30 AM', 'To Time': '12:30 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-06', 'From Time': '04:00 PM', 'To Time': '07:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-11', 'From Time': '03:00 PM', 'To Time': '05:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-17', 'From Time': '04:30 PM', 'To Time': '07:30 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-19', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-20', 'From Time': '04:00 PM', 'To Time': '06:00 PM', 'Hours': 2, 'Hourly Rate': 350, 'Total Amount': 700 },
  { 'Class Name': 'Shiksha Niketan Academy', 'Subject': 'English', 'Date': '2026-09-26', 'From Time': '03:00 PM', 'To Time': '06:00 PM', 'Hours': 3, 'Hourly Rate': 350, 'Total Amount': 1050 },
];

console.log(`Writing ${records.length} records to Excel...`);

// Create worksheet
const ws = XLSX.utils.json_to_sheet(records);

// Set column widths for beautiful presentation
ws['!cols'] = [
  { wch: 25 }, // Class Name
  { wch: 15 }, // Subject
  { wch: 14 }, // Date
  { wch: 12 }, // From Time
  { wch: 12 }, // To Time
  { wch: 8 },  // Hours
  { wch: 12 }, // Hourly Rate
  { wch: 14 }, // Total Amount
];

// Create workbook
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Class Records');

const targetPath = path.join(__dirname, '..', 'public', 'few_months_excel', 'records.xlsx');
XLSX.writeFile(wb, targetPath);

console.log(`Successfully wrote ${records.length} records to ${targetPath}`);

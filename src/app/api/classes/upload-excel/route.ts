import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { calculateDurationHours, formatTimeDisplay } from '@/lib/time-utils';

function parseExcelDate(val: any): string | null {
  if (!val) return null;

  // If already Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }

  // If number (Excel serial date number, e.g. 45199)
  if (typeof val === 'number') {
    const dateObj = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(dateObj.getTime())) {
      return dateObj.toISOString().split('T')[0];
    }
  }

  // If string e.g. "2026-09-28" or "28/09/2026" or "28-09-2026"
  if (typeof val === 'string') {
    const s = val.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      const day = dmy[1].padStart(2, '0');
      const month = dmy[2].padStart(2, '0');
      const year = dmy[3];
      return `${year}-${month}-${day}`;
    }

    // Attempt Date parse
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  return null;
}

function parseExcelTime(val: any): { fromTime: string; toTime: string } {
  if (!val) return { fromTime: '10:00 AM', toTime: '11:00 AM' };

  const str = String(val).trim();
  // Check if contains separator like "-" or "to"
  const parts = str.split(/\s*[-–—to]\s*/i);
  if (parts.length >= 2) {
    return {
      fromTime: formatTimeDisplay(parts[0]),
      toTime: formatTimeDisplay(parts[1]),
    };
  }

  return {
    fromTime: formatTimeDisplay(str),
    toTime: formatTimeDisplay(str),
  };
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Admin access required for Excel import' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Please upload an Excel file (.xlsx or .xls)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 });
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json({ error: 'No data rows found in Excel sheet' }, { status: 400 });
    }

    // Fetch existing classes and subjects for validation
    const existingClassesRes = await query<{ id: string; name: string; hourly_rate: number }>(
      'SELECT id, name, hourly_rate FROM public.classes'
    );
    const existingSubjectsRes = await query<{ id: string; class_id: string; subject_name: string; hourly_rate: number }>(
      'SELECT id, class_id, subject_name, hourly_rate FROM public.class_subjects'
    );

    const classMap = new Map<string, { id: string; name: string; rate: number }>();
    existingClassesRes.rows.forEach(c => {
      classMap.set(c.name.trim().toLowerCase(), {
        id: c.id,
        name: c.name,
        rate: Number(c.hourly_rate),
      });
    });

    const subjectsByClassId = new Map<string, Array<{ id: string; name: string; rate: number }>>();
    existingSubjectsRes.rows.forEach(s => {
      if (!subjectsByClassId.has(s.class_id)) {
        subjectsByClassId.set(s.class_id, []);
      }
      subjectsByClassId.get(s.class_id)!.push({
        id: s.id,
        name: s.subject_name,
        rate: Number(s.hourly_rate),
      });
    });

    let importedCount = 0;
    let skippedDuplicateCount = 0;
    const errors: { row: number; error: string; data?: any }[] = [];

    // Process each row
    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      const rowNumber = i + 2; // header is row 1

      // Find class name column
      const rawClassName =
        row['Class Name'] || row['Class'] || row['Course'] || row['className'] || '';
      const trimmedClassName = String(rawClassName).trim();

      if (!trimmedClassName) {
        errors.push({ row: rowNumber, error: 'Missing Class Name' });
        continue;
      }

      const matchedClass = classMap.get(trimmedClassName.toLowerCase());
      if (!matchedClass) {
        errors.push({
          row: rowNumber,
          error: `Class "${trimmedClassName}" does not exist in Admin classes. Please add it first.`,
        });
        continue;
      }

      // Check for subject column
      const rawSubjectName = row['Subject'] || row['Subject Name'] || row['subject'] || '';
      const trimmedSubjectName = String(rawSubjectName).trim();
      const classSubjects = subjectsByClassId.get(matchedClass.id) || [];
      let matchedSubject = trimmedSubjectName
        ? classSubjects.find(s => s.name.toLowerCase() === trimmedSubjectName.toLowerCase())
        : null;

      if (!matchedSubject && classSubjects.length > 0) {
        matchedSubject = classSubjects[0];
      }

      // Parse Date
      const rawDate = row['Date'] || row['Class Date'] || row['date'] || row['DATE'];
      const recordDate = parseExcelDate(rawDate);
      if (!recordDate) {
        errors.push({
          row: rowNumber,
          error: `Invalid or missing Date: "${rawDate}"`,
        });
        continue;
      }

      // Parse Time & Hours
      let fromTime = '10:00 AM';
      let toTime = '11:00 AM';

      if (row['From Time'] && row['To Time']) {
        fromTime = formatTimeDisplay(String(row['From Time']));
        toTime = formatTimeDisplay(String(row['To Time']));
      } else if (row['Time']) {
        const parsed = parseExcelTime(row['Time']);
        fromTime = parsed.fromTime;
        toTime = parsed.toTime;
      }

      let hours = 0;
      const rawHours = row['Hours'] || row['Duration'] || row['Total Hours'] || row['hours'];
      if (rawHours !== undefined && rawHours !== '' && !isNaN(Number(rawHours))) {
        hours = Number(rawHours);
      } else {
        hours = calculateDurationHours(fromTime, toTime);
      }

      if (hours <= 0) {
        hours = 1; // sensible fallback
      }

      // Hourly rate from matched subject or matched class definition or from excel row if provided
      const rawRate = row['Hourly Rate'] || row['Rate'] || row['hourly_rate'];
      const hourlyRate = rawRate && !isNaN(Number(rawRate))
        ? Number(rawRate)
        : matchedSubject
        ? matchedSubject.rate
        : matchedClass.rate;
      const totalAmount = Math.round(hours * hourlyRate * 100) / 100;

      // Insert record with duplicate avoidance
      try {
        const dupCheck = await query(
          `SELECT id FROM public.class_records 
           WHERE class_name = $1 
             AND record_date = $2 
             AND from_time = $3 
             AND to_time = $4`,
          [matchedClass.name, recordDate, fromTime, toTime]
        );

        if (dupCheck.rows.length > 0) {
          skippedDuplicateCount++;
          continue;
        }

        await query(
          `INSERT INTO public.class_records 
            (class_id, class_name, subject_id, subject_name, record_date, from_time, to_time, hours, hourly_rate, total_amount, imported_from_excel, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            matchedClass.id,
            matchedClass.name,
            matchedSubject ? matchedSubject.id : null,
            matchedSubject ? matchedSubject.name : null,
            recordDate,
            fromTime,
            toTime,
            hours,
            hourlyRate,
            totalAmount,
            true,
            'excel_import',
          ]
        );

        importedCount++;
      } catch (err: any) {
        errors.push({
          row: rowNumber,
          error: `Database insertion error: ${err.message}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${importedCount} records imported successfully.${skippedDuplicateCount > 0 ? ` ${skippedDuplicateCount} duplicates skipped.` : ''}`,
      totalProcessed: rawRows.length,
      importedCount,
      skippedDuplicateCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 50), // return up to 50 detailed errors
    });
  } catch (error: any) {
    console.error('Excel upload error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process Excel file' }, { status: 500 });
  }
}

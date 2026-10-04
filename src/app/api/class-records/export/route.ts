import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getMonthDateRange } from '@/lib/time-utils';
import * as XLSX from 'xlsx';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (user.role === 'shrikesh') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g. '2026-09' or 'all'
  const className = searchParams.get('class_name');
  const subjectName = searchParams.get('subject_name');

  try {
    let sql = `
      SELECT 
        id, 
        class_name, 
        subject_name,
        TO_CHAR(record_date, 'YYYY-MM-DD') as record_date, 
        from_time, 
        to_time, 
        hours, 
        hourly_rate, 
        total_amount, 
        notes, 
        imported_from_excel, 
        created_by, 
        created_at
      FROM public.class_records
      WHERE 1=1
    `;
    const params: any[] = [];

    if (month && month !== 'all') {
      const { startDate, endDate } = getMonthDateRange(month);
      params.push(startDate);
      params.push(endDate);
      sql += ` AND record_date >= $${params.length - 1} AND record_date <= $${params.length}`;
    }

    if (className) {
      params.push(className);
      sql += ` AND class_name = $${params.length}`;
    }

    if (subjectName) {
      params.push(subjectName);
      sql += ` AND subject_name = $${params.length}`;
    }

    sql += ' ORDER BY record_date ASC, created_at ASC';

    const res = await query(sql, params);
    const rows = res.rows;

    // Build worksheet rows
    let totalHours = 0;
    let totalEarnings = 0;

    const dataRows = rows.map((r: any, idx: number) => {
      const h = Number(r.hours || 0);
      const rate = Number(r.hourly_rate || 0);
      const amt = Number(r.total_amount || 0);
      totalHours += h;
      totalEarnings += amt;

      return {
        '#': idx + 1,
        'Date': r.record_date,
        'Class Name': r.class_name,
        'Subject': r.subject_name || '-',
        'From Time': r.from_time,
        'To Time': r.to_time,
        'Duration (Hrs)': h,
        'Hourly Rate (₹)': rate,
        'Total Amount (₹)': amt,
        'Notes / Topics': r.notes || '',
        'Source': r.imported_from_excel ? 'Excel Import' : 'Manual Entry',
        'Logged By': r.created_by,
      };
    });

    // Add empty row and summary row
    dataRows.push({
      '#': '',
      'Date': '',
      'Class Name': '',
      'Subject': '',
      'From Time': '',
      'To Time': 'TOTAL:',
      'Duration (Hrs)': Math.round(totalHours * 100) / 100,
      'Hourly Rate (₹)': '',
      'Total Amount (₹)': Math.round(totalEarnings * 100) / 100,
      'Notes / Topics': `${rows.length} total sessions`,
      'Source': '',
      'Logged By': '',
    } as any);

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(dataRows);

    // Auto-fit column widths
    worksheet['!cols'] = [
      { wch: 5 },  // #
      { wch: 12 }, // Date
      { wch: 26 }, // Class Name
      { wch: 16 }, // Subject
      { wch: 12 }, // From Time
      { wch: 12 }, // To Time
      { wch: 15 }, // Duration (Hrs)
      { wch: 16 }, // Hourly Rate (₹)
      { wch: 18 }, // Total Amount (₹)
      { wch: 30 }, // Notes
      { wch: 15 }, // Source
      { wch: 12 }, // Logged By
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Class Sessions');

    // Also build a Monthly Summary Sheet
    const monthlyAgg: Record<string, { count: number; hours: number; earnings: number }> = {};
    for (const r of rows) {
      const m = r.record_date.slice(0, 7);
      if (!monthlyAgg[m]) {
        monthlyAgg[m] = { count: 0, hours: 0, earnings: 0 };
      }
      monthlyAgg[m].count += 1;
      monthlyAgg[m].hours += Number(r.hours || 0);
      monthlyAgg[m].earnings += Number(r.total_amount || 0);
    }

    const summaryRows = Object.keys(monthlyAgg).sort().map(m => ({
      'Month': m,
      'Sessions': monthlyAgg[m].count,
      'Total Hours': Math.round(monthlyAgg[m].hours * 100) / 100,
      'Total Earnings (₹)': Math.round(monthlyAgg[m].earnings * 100) / 100,
    }));

    if (summaryRows.length > 0) {
      const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
      summarySheet['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Monthly Summary');
    }

    // Generate buffer
    const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const filename =
      month && month !== 'all'
        ? `class_records_${month.replace('-', '_')}.xlsx`
        : `all_class_records.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Export class records error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

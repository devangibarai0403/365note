export type UserRole = 'admin' | 'devangi' | 'shrikesh';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  pin_code?: string;
  avatar_url?: string;
  created_at: string;
}

export interface ClassItem {
  id: string;
  name: string;
  hourly_rate: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassRecord {
  id: string;
  class_id?: string;
  class_name: string;
  record_date: string;
  from_time: string;
  to_time: string;
  hours: number;
  hourly_rate: number;
  total_amount: number;
  notes?: string;
  imported_from_excel: boolean;
  created_by: string;
  created_at: string;
}

export interface SchoolItem {
  id: string;
  name: string;
  monthly_salary: number;
  joining_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  documents?: SchoolDocument[];
}

export interface SchoolDocument {
  id: string;
  school_id: string;
  document_title: string;
  document_type: string;
  file_url: string;
  file_name: string;
  file_size?: number;
  created_at: string;
}

export type AttendanceStatus = 'working' | 'leave_by_school' | 'leave_by_office' | 'leave_taken';

export interface SchoolDailyStatus {
  id: string;
  school_id: string;
  school_name?: string;
  status_date: string;
  status: 'working' | 'leave_by_school' | 'leave_taken';
  user_id: string;
  note?: string;
  created_at: string;
}

export interface OfficeItem {
  id: string;
  company_name: string;
  location?: string;
  notes?: string;
  created_at: string;
}

export interface OfficeDailyStatus {
  id: string;
  office_id?: string;
  status_date: string;
  status: 'working' | 'leave_by_office' | 'leave_taken';
  user_id: string;
  note?: string;
  created_at: string;
}

export type PaymentMode = 'Cash' | 'Online';

export interface DailyKharcha {
  id: string;
  user_id: string;
  expense_date: string;
  amount: number;
  spent_on: string;
  payment_mode: PaymentMode;
  category?: string;
  created_at: string;
}

export type TransactionType = 'received' | 'sent';

export interface FamilyMoneyTransaction {
  id: string;
  user_id: string;
  transaction_date: string;
  transaction_type: TransactionType;
  person_name: string;
  amount: number;
  reason?: string;
  created_at: string;
}

export interface AdminCalendarNote {
  id: string;
  note_date: string;
  title?: string;
  note: string;
  tag: string;
  created_at: string;
  updated_at: string;
}

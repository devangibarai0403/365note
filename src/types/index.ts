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

export interface ClassSubject {
  id: string;
  class_id: string;
  subject_name: string;
  hourly_rate: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClassItem {
  id: string;
  name: string;
  hourly_rate: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subjects?: ClassSubject[];
}

export interface ClassRecord {
  id: string;
  class_id?: string;
  class_name: string;
  subject_id?: string;
  subject_name?: string;
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

export interface ClassPayment {
  id: string;
  class_id?: string;
  class_name: string;
  month: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_date: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export type ClassPaymentStatus = 'full_paid' | 'in_balance' | 'pending' | 'no_classes' | 'overpaid';

export interface MonthlyClassPaymentSummary {
  class_id?: string;
  class_name: string;
  month: string;
  monthly_records_count: number;
  monthly_hours: number;
  total_billed: number;
  total_paid: number;
  cash_paid: number;
  online_paid: number;
  balance_due: number;
  status: ClassPaymentStatus;
  payments: ClassPayment[];
}

export interface SchoolItem {
  id: string;
  name: string;
  monthly_salary: number;
  paid_leaves_days?: number;
  per_leave_cut?: number;
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

export type AttendanceStatus = 'working' | 'leave_by_school' | 'leave_by_office' | 'leave_taken' | 'half_day';

export interface SchoolDailyStatus {
  id: string;
  school_id: string;
  school_name?: string;
  status_date: string;
  status: 'working' | 'leave_by_school' | 'leave_taken' | 'half_day';
  user_id: string;
  note?: string;
  created_at: string;
}

export interface OfficeItem {
  id: string;
  company_name: string;
  location?: string;
  monthly_salary?: number;
  paid_leaves_days?: number;
  per_leave_cut?: number;
  notes?: string;
  created_at: string;
}

export interface OfficeDailyStatus {
  id: string;
  office_id?: string;
  status_date: string;
  status: 'working' | 'leave_by_office' | 'leave_taken' | 'half_day';
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
  payment_mode: PaymentMode;
  reason?: string;
  created_at: string;
}

export interface UserBalance {
  user_id: string;
  initial_cash: number;
  initial_online: number;
  available_cash: number;
  available_online: number;
  total_available: number;
  cash_received: number;
  cash_sent: number;
  online_received: number;
  online_sent: number;
  classes_cash?: number;
  classes_online?: number;
  salary_cash?: number;
  salary_online?: number;
  kharcha_cash?: number;
  kharcha_online?: number;
  updated_at?: string;
}

export interface SalaryPayment {
  id: string;
  user_id: string;
  type: 'school' | 'office';
  school_id?: string | null;
  office_id?: string | null;
  source_name: string;
  month: string;
  amount: number;
  payment_mode: PaymentMode;
  payment_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MonthlySalarySummary {
  month: string;
  base_salary: number;
  leaves_taken: number;
  paid_leaves_days: number;
  unpaid_leaves: number;
  leave_deduction: number;
  net_estimated_salary: number;
  previous_balance: number;
  total_receivable: number;
  total_received: number;
  balance_remaining: number;
  is_balanced: boolean;
  payments: SalaryPayment[];
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

export type TaskStatus = 'todo' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UserTask {
  id: string;
  user_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  task_date: string;
  completed_at?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  Palette,
  Plus,
  Search,
  Check,
  CreditCard,
  Banknote,
  Trash2,
  Edit3,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Coins,
} from 'lucide-react';
import { ResinOrder, ResinExpense, ResinPaymentMode, ResinOrderStatus } from '@/types';

export default function ResinAccountsPage() {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'orders' | 'expenses'>('orders');

  // Orders State
  const [orders, setOrders] = useState<ResinOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [orderModeFilter, setOrderModeFilter] = useState<'all' | 'cod' | 'upi'>('all');

  // Expenses State
  const [expenses, setExpenses] = useState<ResinExpense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseModeFilter, setExpenseModeFilter] = useState<'all' | 'cod' | 'upi'>('all');

  // Stats
  const [orderStats, setOrderStats] = useState({
    total_orders: 0,
    paid_orders: 0,
    unpaid_orders: 0,
    total_revenue: 0,
    paid_cod: 0,
    paid_upi: 0,
  });

  const [expenseStats, setExpenseStats] = useState({
    total_expense: 0,
    expense_cod: 0,
    expense_upi: 0,
    count: 0,
  });

  // Order Modal State (Only 5 fields: Customer Name, Price, Payment Mode, Order Status, Order Date)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ResinOrder | null>(null);
  const [orderFormData, setOrderFormData] = useState({
    customer_name: '',
    price: '',
    payment_mode: 'upi' as ResinPaymentMode,
    status: 'paid' as ResinOrderStatus,
    order_date: new Date().toISOString().split('T')[0],
  });
  const [savingOrder, setSavingOrder] = useState(false);

  // Expense Modal State
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ResinExpense | null>(null);
  const [expenseFormData, setExpenseFormData] = useState({
    spent_on: '',
    amount: '',
    payment_mode: 'upi' as ResinPaymentMode,
    expense_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [savingExpense, setSavingExpense] = useState(false);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    try {
      setOrdersLoading(true);
      const res = await fetch('/api/resin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.stats) {
          setOrderStats(data.stats);
        }
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load resin orders', 'error');
    } finally {
      setOrdersLoading(false);
    }
  }, [toast]);

  // Fetch Expenses
  const fetchExpenses = useCallback(async () => {
    try {
      setExpensesLoading(true);
      const res = await fetch('/api/resin/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        if (data.stats) {
          setExpenseStats(data.stats);
        }
      }
    } catch (e) {
      console.error(e);
      toast('Failed to load resin expenses', 'error');
    } finally {
      setExpensesLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchOrders();
    fetchExpenses();
  }, [fetchOrders, fetchExpenses]);

  // Open Create Order Modal
  const handleOpenCreateOrder = () => {
    setEditingOrder(null);
    setOrderFormData({
      customer_name: '',
      price: '',
      payment_mode: 'upi',
      status: 'paid',
      order_date: new Date().toISOString().split('T')[0],
    });
    setIsOrderModalOpen(true);
  };

  // Open Edit Order Modal
  const handleOpenEditOrder = (order: ResinOrder) => {
    setEditingOrder(order);
    setOrderFormData({
      customer_name: order.customer_name,
      price: String(order.price),
      payment_mode: order.payment_mode,
      status: order.status,
      order_date: order.order_date ? order.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setIsOrderModalOpen(true);
  };

  // Save Order (Create or Update)
  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderFormData.customer_name.trim() || !orderFormData.price) {
      toast('Please enter customer name and price', 'error');
      return;
    }

    try {
      setSavingOrder(true);
      const payload = {
        customer_name: orderFormData.customer_name.trim(),
        price: Number(orderFormData.price),
        payment_mode: orderFormData.payment_mode,
        status: orderFormData.status,
        order_date: orderFormData.order_date,
        ...(editingOrder ? { id: editingOrder.id } : {}),
      };

      const res = await fetch('/api/resin/orders', {
        method: editingOrder ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(
          editingOrder ? 'Order updated successfully!' : 'Order created successfully!',
          'success'
        );
        setIsOrderModalOpen(false);
        fetchOrders();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save order', 'error');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to save order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  // Toggle Order Paid/Unpaid Status Directly
  const handleToggleOrderStatus = async (order: ResinOrder) => {
    const newStatus: ResinOrderStatus = order.status === 'paid' ? 'unpaid' : 'paid';
    try {
      const res = await fetch('/api/resin/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: newStatus,
        }),
      });

      if (res.ok) {
        toast(
          `Order for ${order.customer_name} marked as ${newStatus.toUpperCase()}! Available money updated.`,
          'success'
        );
        fetchOrders();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to update order status', 'error');
      }
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  // Delete Order
  const handleDeleteOrder = async (order: ResinOrder) => {
    if (!confirm(`Are you sure you want to delete order for ${order.customer_name}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/resin/orders?id=${order.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Order deleted', 'success');
        fetchOrders();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete order', 'error');
      }
    } catch {
      toast('Failed to delete order', 'error');
    }
  };

  // Open Create Expense Modal
  const handleOpenCreateExpense = () => {
    setEditingExpense(null);
    setExpenseFormData({
      spent_on: '',
      amount: '',
      payment_mode: 'upi',
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsExpenseModalOpen(true);
  };

  // Open Edit Expense Modal
  const handleOpenEditExpense = (expense: ResinExpense) => {
    setEditingExpense(expense);
    setExpenseFormData({
      spent_on: expense.spent_on,
      amount: String(expense.amount),
      payment_mode: expense.payment_mode,
      expense_date: expense.expense_date ? expense.expense_date.split('T')[0] : new Date().toISOString().split('T')[0],
      notes: expense.notes || '',
    });
    setIsExpenseModalOpen(true);
  };

  // Save Expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseFormData.spent_on.trim() || !expenseFormData.amount) {
      toast('Please enter where spent and amount', 'error');
      return;
    }

    try {
      setSavingExpense(true);
      const payload = {
        ...expenseFormData,
        amount: Number(expenseFormData.amount),
        ...(editingExpense ? { id: editingExpense.id } : {}),
      };

      const res = await fetch('/api/resin/expenses', {
        method: editingExpense ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(
          editingExpense ? 'Resin expense updated!' : 'Resin expense recorded and deducted from available money!',
          'success'
        );
        setIsExpenseModalOpen(false);
        fetchExpenses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to save expense', 'error');
      }
    } catch (e: any) {
      toast(e.message || 'Failed to save expense', 'error');
    } finally {
      setSavingExpense(false);
    }
  };

  // Delete Expense
  const handleDeleteExpense = async (expense: ResinExpense) => {
    if (!confirm(`Are you sure you want to delete expense "${expense.spent_on}" (₹${expense.amount})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/resin/expenses?id=${expense.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast('Expense deleted and available money adjusted', 'success');
        fetchExpenses();
      } else {
        const err = await res.json();
        toast(err.error || 'Failed to delete expense', 'error');
      }
    } catch {
      toast('Failed to delete expense', 'error');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      const matchSearch = item.customer_name.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === 'all' || item.status === orderStatusFilter;
      const matchMode = orderModeFilter === 'all' || item.payment_mode === orderModeFilter;

      return matchSearch && matchStatus && matchMode;
    });
  }, [orders, orderSearch, orderStatusFilter, orderModeFilter]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchSearch =
        item.spent_on.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(expenseSearch.toLowerCase()));

      const matchMode = expenseModeFilter === 'all' || item.payment_mode === expenseModeFilter;

      return matchSearch && matchMode;
    });
  }, [expenses, expenseSearch, expenseModeFilter]);

  const netStudioBalance = orderStats.total_revenue - expenseStats.total_expense;

  return (
    <div className="space-y-8 animate-in fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-purple-500/10 p-6 rounded-3xl border border-pink-200/90 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-white/80 border border-pink-200/80 p-1 flex items-center justify-center shadow-md shadow-pink-100 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/drs_logo/resin_logo.png"
              alt="Devangi Resin Studio"
              className="w-full h-full object-contain filter drop-shadow-xs"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                Devangi Resin Studio Accounts
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-extrabold text-[11px] border border-pink-200 uppercase tracking-wider">
                Studio Space
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Orders revenue, material expenses &amp; live integration with Available Money
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenCreateExpense}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>

          <button
            onClick={handleOpenCreateOrder}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-pink-200 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Order</span>
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Paid Orders Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Paid Revenue</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ₹{orderStats.total_revenue.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
            <span>COD: <strong>₹{orderStats.paid_cod.toLocaleString('en-IN')}</strong></span>
            <span>•</span>
            <span>UPI: <strong>₹{orderStats.paid_upi.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Card 2: Total Resin Expenses */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Resin Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            ₹{expenseStats.total_expense.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
            <span>COD: <strong>₹{expenseStats.expense_cod.toLocaleString('en-IN')}</strong></span>
            <span>•</span>
            <span>UPI: <strong>₹{expenseStats.expense_upi.toLocaleString('en-IN')}</strong></span>
          </div>
        </div>

        {/* Card 3: Net Studio Balance */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Net Studio Profit</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${netStudioBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
            ₹{netStudioBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
            Revenue minus Resin materials &amp; expenses
          </div>
        </div>

        {/* Card 4: Orders Count */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Orders Status</span>
            <div className="w-9 h-9 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {orderStats.total_orders} Orders
          </div>
          <div className="text-[11px] text-slate-500 mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
            <span className="text-emerald-600 font-bold">{orderStats.paid_orders} Paid</span>
            <span>•</span>
            <span className="text-amber-600 font-bold">{orderStats.unpaid_orders} Pending</span>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'orders'
              ? 'border-pink-600 text-pink-700 bg-pink-50/50 rounded-t-2xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Orders &amp; History ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'expenses'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-2xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Resin Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDERS & HISTORY */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by customer name..."
                value={orderSearch}
                onChange={e => setOrderSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {orderSearch && (
                <button
                  onClick={() => setOrderSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
              {/* Status Filter */}
              <select
                value={orderStatusFilter}
                onChange={e => setOrderStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>

              {/* Payment Mode Filter */}
              <select
                value={orderModeFilter}
                onChange={e => setOrderModeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">All Modes</option>
                <option value="cod">COD (Cash)</option>
                <option value="upi">UPI (Online)</option>
              </select>
            </div>
          </div>

          {/* Orders List / Cards */}
          {ordersLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
              <p className="text-xs font-bold">Loading resin orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mx-auto mb-3">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Orders Found</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                {orderSearch ? 'Try a different search or filter.' : 'Click "Create New Order" to record Devangi’s first resin order.'}
              </p>
              <button
                onClick={handleOpenCreateOrder}
                className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-pink-200"
              >
                + Create Order
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrders.map(order => {
                const isPaid = order.status === 'paid';

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Customer Name & Status Badge */}
                      <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100 mb-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Customer</span>
                          <h3 className="font-black text-slate-900 text-base leading-tight">
                            {order.customer_name}
                          </h3>
                        </div>

                        {/* Status Toggle Button */}
                        <button
                          onClick={() => handleToggleOrderStatus(order)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0 ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                          title="Click to toggle Paid/Unpaid"
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isPaid ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                          <span>{order.status}</span>
                        </button>
                      </div>

                      {/* Price & Payment Mode */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 mb-2">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Price</span>
                          <span className="text-base font-black text-slate-900">
                            ₹{Number(order.price).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Mode</span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 mt-0.5">
                            {order.payment_mode === 'cod' ? (
                              <>
                                <Banknote className="w-3.5 h-3.5 text-amber-600" />
                                <span>COD (Cash)</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                                <span>UPI (Online)</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Details & Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Order Date</span>
                        <span className="text-slate-600 text-xs font-semibold">
                          {order.order_date ? new Date(order.order_date).toLocaleDateString('en-IN') : '—'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditOrder(order)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                          title="Edit Order"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(order)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Order"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: RESIN EXPENSES */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search where spent, materials, notes..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
              {expenseSearch && (
                <button
                  onClick={() => setExpenseSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <select
                value={expenseModeFilter}
                onChange={e => setExpenseModeFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="all">All Modes</option>
                <option value="cod">COD (Cash)</option>
                <option value="upi">UPI (Online)</option>
              </select>
            </div>
          </div>

          {/* Expenses List */}
          {expensesLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-rose-600" />
              <p className="text-xs font-bold">Loading resin expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">No Resin Expenses</h3>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Record epoxy resin bottles, pigment purchases, silicon moulds &amp; courier costs.
              </p>
              <button
                onClick={handleOpenCreateExpense}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200"
              >
                + Add Expense
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Spent On / Item</th>
                      <th className="px-5 py-3.5">Amount</th>
                      <th className="px-5 py-3.5">Payment Mode</th>
                      <th className="px-5 py-3.5">Expense Date</th>
                      <th className="px-5 py-3.5">Notes</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-900">
                          {item.spent_on}
                        </td>
                        <td className="px-5 py-3.5 font-black text-rose-600">
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              item.payment_mode === 'cod'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-sky-50 text-sky-700 border border-sky-200'
                            }`}
                          >
                            {item.payment_mode === 'cod' ? 'COD (Cash)' : 'UPI (Online)'}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {item.expense_date ? new Date(item.expense_date).toLocaleDateString('en-IN') : '-'}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-xs truncate">
                          {item.notes || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEditExpense(item)}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Edit Expense"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteExpense(item)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CREATE / EDIT ORDER MODAL (Only 5 fields: Customer Name, Price, Payment Mode, Order Status, Order Date) */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 my-8 animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-pink-600 text-white flex items-center justify-center shadow-md shadow-pink-200">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {editingOrder ? 'Edit Resin Order' : 'Create New Resin Order'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {editingOrder ? 'Update order details' : 'Record a new customer order'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOrderModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrder} className="p-6 space-y-4">
              {/* 1. Customer Name */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Radhika Sharma"
                  value={orderFormData.customer_name}
                  onChange={e => setOrderFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* 2. Price (₹) */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 2500"
                    value={orderFormData.price}
                    onChange={e => setOrderFormData(prev => ({ ...prev, price: e.target.value }))}
                    required
                    className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>
              </div>

              {/* 3. Payment Mode */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={orderFormData.payment_mode}
                  onChange={e => setOrderFormData(prev => ({ ...prev, payment_mode: e.target.value as any }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="upi">UPI (Online)</option>
                  <option value="cod">COD (Cash)</option>
                </select>
              </div>

              {/* 4. Order Status */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Order Status *
                </label>
                <select
                  value={orderFormData.status}
                  onChange={e => setOrderFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-black focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    orderFormData.status === 'paid'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <option value="paid">Paid (Reflects in Available Money)</option>
                  <option value="unpaid">Unpaid (Pending)</option>
                </select>
              </div>

              {/* 5. Order Date */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Order Date *
                </label>
                <input
                  type="date"
                  value={orderFormData.order_date}
                  onChange={e => setOrderFormData(prev => ({ ...prev, order_date: e.target.value }))}
                  required
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingOrder}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-pink-200 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingOrder ? 'Update Order' : 'Create Order'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 my-8 animate-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-200">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 text-base">
                    {editingExpense ? 'Edit Resin Expense' : 'Add Resin Material Expense'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Immediately deducted from your Available Money
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Spent On / Item *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 3:1 Epoxy Resin 1kg + Hardener"
                  value={expenseFormData.spent_on}
                  onChange={e => setExpenseFormData(prev => ({ ...prev, spent_on: e.target.value }))}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1450"
                      value={expenseFormData.amount}
                      onChange={e => setExpenseFormData(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      className="w-full pl-7 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={expenseFormData.payment_mode}
                    onChange={e => setExpenseFormData(prev => ({ ...prev, payment_mode: e.target.value as any }))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="upi">UPI (Online)</option>
                    <option value="cod">Cash (Hand Cash)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Expense Date
                </label>
                <input
                  type="date"
                  value={expenseFormData.expense_date}
                  onChange={e => setExpenseFormData(prev => ({ ...prev, expense_date: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Notes / Supplier
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon seller ResiArt Store"
                  value={expenseFormData.notes}
                  onChange={e => setExpenseFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingExpense}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold shadow-md shadow-rose-200 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingExpense ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

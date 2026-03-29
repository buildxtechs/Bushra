'use client';
import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import LoadingAnimation from '@/components/LoadingAnimation';
import { useToast } from '@/components/Toast';
import { formatCurrency } from '@/lib/utils';
import Modal from '@/components/Modal';

export default function ExpensesPage() {
    const { data: session } = useSession();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    
    const [newExpense, setNewExpense] = useState({
        amount: '',
        title: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Food',
        note: ''
    });
    
    const { addToast } = useToast();

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/expenses');
            const data = await res.json();
            setExpenses(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            addToast('Failed to load expenses', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newExpense,
                    amount: parseFloat(newExpense.amount),
                    createdBy: session?.user?.id
                })
            });
            if (res.ok) {
                addToast('Expense recorded successfully', 'success');
                setShowAdd(false);
                setNewExpense({
                    amount: '',
                    title: '',
                    date: new Date().toISOString().split('T')[0],
                    category: 'Food',
                    note: ''
                });
                fetchExpenses();
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Failed to save');
            }
        } catch (error) {
            addToast(error.message, 'error');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this expense record?')) return;
        try {
            const res = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                addToast('Expense deleted', 'success');
                fetchExpenses();
            }
        } catch (error) {
            addToast('Error deleting record', 'error');
        }
    };

    // Advanced Filtering & Stats
    const filteredExpenses = useMemo(() => {
        return expenses
            .filter(exp => exp.date.startsWith(selectedMonth))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, selectedMonth]);

    const totalAllTime = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
    const totalSelectedMonth = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);

    const monthOptions = useMemo(() => {
        const months = new Set();
        expenses.forEach(e => months.add(e.date.slice(0, 7)));
        months.add(new Date().toISOString().slice(0, 7)); // Always include current month
        return Array.from(months).sort().reverse();
    }, [expenses]);

    if (loading && expenses.length === 0) return <LoadingAnimation />;

    return (
        <div className="animate-fadeIn page-container">
            <div className="page-header">
                <div>
                    <h1>Expense Management</h1>
                    <p className="subtitle">Track and analyze operational costs for BUSHRA</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <select 
                        value={selectedMonth} 
                        onChange={e => setSelectedMonth(e.target.value)}
                        className="input"
                        style={{ width: 'auto', fontWeight: 600 }}
                    >
                        {monthOptions.map(m => (
                            <option key={m} value={m}>{new Date(m + '-01').toLocaleDateString('default', { month: 'long', year: 'numeric' })}</option>
                        ))}
                    </select>
                    <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
                        ➕ Add New Expense
                    </button>
                </div>
            </div>

            <div className="grid grid-3" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>📉</div>
                    <div className="stat-info">
                        <h3>Monthly Spending</h3>
                        <div className="stat-value" style={{ color: 'var(--danger)' }}>{formatCurrency(totalSelectedMonth)}</div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>For {new Date(selectedMonth + '-01').toLocaleDateString('default', { month: 'long' })}</p>
                    </div>
                </div>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'var(--bg-card-hover)' }}>💰</div>
                    <div className="stat-info">
                        <h3>Lifetime Total</h3>
                        <div className="stat-value">{formatCurrency(totalAllTime)}</div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>From {expenses.length} records</p>
                    </div>
                </div>
                <div className="stat-card premium-hover">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>🧾</div>
                    <div className="stat-info">
                        <h3>Avg. per Record</h3>
                        <div className="stat-value" style={{ color: 'var(--info)' }}>
                            {formatCurrency(expenses.length ? totalAllTime / expenses.length : 0)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card card-glass animate-slideUp">
                <div style={{ marginBottom: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0 }}>Expense Records</h3>
                    <span className="badge badge-info">{filteredExpenses.length} entries for this month</span>
                </div>
                
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Title / Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.map(exp => (
                            <tr key={exp._id} className="animate-fadeIn">
                                <td style={{ fontWeight: 500 }}>{new Date(exp.date).toLocaleDateString()}</td>
                                <td>
                                    <div style={{ fontWeight: 600 }}>{exp.title}</div>
                                    {exp.note && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exp.note}</div>}
                                </td>
                                <td><span className="badge badge-purple">{exp.category}</span></td>
                                <td style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '1.1rem' }}>
                                    {formatCurrency(exp.amount)}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button 
                                        className="btn btn-icon" 
                                        onClick={() => handleDelete(exp._id)} 
                                        style={{ color: 'var(--danger)', opacity: 0.7 }}
                                        title="Delete Record"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                {filteredExpenses.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">💸</div>
                        <h3>No records for this month</h3>
                        <p>Adjust your filter or record a new expense to get started.</p>
                    </div>
                )}
            </div>

            <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record New Expense" width="450px">
                <form onSubmit={handleAdd} className="flex-col gap-md">
                    <div className="input-group">
                        <label>Item Name / Title</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g. Monthly Electricity, Grocery Bill"
                            value={newExpense.title}
                            onChange={e => setNewExpense({...newExpense, title: e.target.value})}
                        />
                    </div>
                    <div className="grid grid-2" style={{ gap: 'var(--space-md)' }}>
                        <div className="input-group">
                            <label>Amount (₹)</label>
                            <input 
                                type="number" 
                                required 
                                step="0.01"
                                placeholder="0.00"
                                value={newExpense.amount}
                                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                            />
                        </div>
                        <div className="input-group">
                            <label>Date</label>
                            <input 
                                type="date" 
                                required 
                                value={newExpense.date}
                                onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="input-group">
                        <label>Category</label>
                        <select 
                            value={newExpense.category}
                            onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                            className="input"
                        >
                            <option value="Food">🍲 Food & Raw Materials</option>
                            <option value="Utilities">⚡ Utilities & Bills</option>
                            <option value="Rent">🏢 Rent / Lease</option>
                            <option value="Salary">👥 Staff Salaries</option>
                            <option value="Marketing">📢 Marketing / Ads</option>
                            <option value="Maintenance">🔧 Maintenance</option>
                            <option value="Other">📝 Other Expenses</option>
                        </select>
                    </div>
                    <div className="input-group">
                        <label>Additional Note (Optional)</label>
                        <textarea 
                            rows="2"
                            placeholder="Add details like bill number, supplier info..."
                            value={newExpense.note}
                            onChange={e => setNewExpense({...newExpense, note: e.target.value})}
                        />
                    </div>
                    <div className="mt-md">
                        <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                            Save Final Expense
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

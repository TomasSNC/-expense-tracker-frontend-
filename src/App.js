import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, Plus, LogOut, Download, Eye, Filter, X, Edit, Trash2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import SHA256 from 'crypto-js/sha256';
import './App.css';

// Initialize Supabase
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key available:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials!');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

function hashPassword(password) {
  return SHA256(password).toString();
}

export default function App() {
  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [groupBy, setGroupBy] = useState('chronological');
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [newTripForm, setNewTripForm] = useState({ 
    destination: '', 
    startDate: '', 
    endDate: '',
    currency: 'EUR',
    reason: ''
  });
  const [showNewTripForm, setShowNewTripForm] = useState(false);

  // Load user from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchTrips(parsedUser.id);
    }
  }, []);

  const handleSignUp = async () => {
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const hashedPassword = hashPassword(password);
      
      const result = await supabase
        .from('users')
        .insert([{ username, password: hashedPassword }])
        .select()
        .single();

      console.log('Signup result:', result);

      if (!result || result.error) {
        alert(result?.error?.message || 'Sign up failed');
        setLoading(false);
        return;
      }

      const data = result.data;
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      fetchTrips(data.id);
      setUsername('');
      setPassword('');
      setIsSignUp(false);
    } catch (error) {
      console.error('Signup error:', error);
      alert('Sign up error: ' + error.message);
    }
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const hashedPassword = hashPassword(password);
      
      const result = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      console.log('Login result:', result);

      if (!result || result.error) {
        alert('Invalid credentials');
        setLoading(false);
        return;
      }

      const data = result.data;
      if (hashedPassword !== data.password) {
        alert('Invalid credentials');
        setLoading(false);
        return;
      }

      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      fetchTrips(data.id);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Login error:', error);
      alert('Login error: ' + error.message);
    }
    setLoading(false);
  };

  const fetchTrips = async (userId) => {
    try {
      const result = await supabase
        .from('trips')
        .select('*')
        .eq('userId', userId)
        .order('startDate', { ascending: false });

      console.log('Fetch trips result:', result);

      if (!result || result.error) {
        console.error('Error fetching trips:', result?.error);
        return;
      }

      // Calculate totals
      const tripsWithTotals = await Promise.all(
        (result.data || []).map(async (trip) => {
          const expResult = await supabase
            .from('expenses')
            .select('amountInTripCurrency')
            .eq('tripId', trip.id);

          const totalAmount = (expResult.data || [])
            .reduce((sum, exp) => sum + parseFloat(exp.amountInTripCurrency || 0), 0);

          return { ...trip, totalAmount };
        })
      );

      setTrips(tripsWithTotals);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedTrip(null);
    localStorage.removeItem('user');
  };

  const createNewTrip = async () => {
    if (!newTripForm.destination || !newTripForm.startDate || !newTripForm.endDate || !newTripForm.currency) {
      alert('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const result = await supabase
        .from('trips')
        .insert([{
          userId: user.id,
          destination: newTripForm.destination,
          startDate: newTripForm.startDate,
          endDate: newTripForm.endDate,
          currency: newTripForm.currency,
          reason: newTripForm.reason || ''
        }])
        .select()
        .single();

      console.log('Create trip result:', result);

      if (!result || result.error) {
        alert(result?.error?.message || 'Error creating trip');
        setLoading(false);
        return;
      }

      fetchTrips(user.id);
      setNewTripForm({ destination: '', startDate: '', endDate: '', currency: 'EUR', reason: '' });
      setShowNewTripForm(false);
    } catch (error) {
      console.error('Error creating trip:', error);
      alert('Error creating trip: ' + error.message);
    }
    setLoading(false);
  };

  const handleExport = async (tripId) => {
    try {
      const tripResult = await supabase.from('trips').select('*').eq('id', tripId).single();
      const expResult = await supabase.from('expenses').select('*').eq('tripId', tripId);

      if (!tripResult.data || !expResult.data) {
        alert('Error loading data for export');
        return;
      }

      const trip = tripResult.data;
      const expenses = expResult.data;

      // Simple CSV export
      let csv = 'Date,Type,Description,Original Amount,Amount (' + trip.currency + '),Rate\n';
      
      (expenses || []).forEach(exp => {
        csv += `"${new Date(exp.date).toLocaleDateString()}","${exp.type}","${exp.description}","${exp.originalAmount} ${exp.originalCurrency}","${parseFloat(exp.amountInTripCurrency).toFixed(2)}","${parseFloat(exp.exchangeRate || 1).toFixed(4)}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${trip.destination}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting: ' + error.message);
    }
  };

  if (!user) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>💰 Expense Tracker</h1>
          <p>Track your travel expenses</p>
          
          <div className="auth-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleLogin())}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (isSignUp ? handleSignUp() : handleLogin())}
            />
            
            <button onClick={isSignUp ? handleSignUp : handleLogin} disabled={loading}>
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </button>
            
            <button className="toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>💰 Travel Expenses</h1>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} /> Logout
          </button>
        </div>
      </header>

      <div className="app-content">
        {!selectedTrip ? (
          <div className="trips-section">
            <div className="trips-header">
              <h2>Your Trips</h2>
              <button className="btn-primary" onClick={() => setShowNewTripForm(true)}>
                <Plus size={20} /> New Trip
              </button>
            </div>

            {showNewTripForm && (
              <div className="new-trip-form">
                <div className="form-header">
                  <h3>Create New Trip</h3>
                  <button className="close-btn" onClick={() => setShowNewTripForm(false)}>
                    <X size={20} />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Destination"
                  value={newTripForm.destination}
                  onChange={(e) => setNewTripForm({ ...newTripForm, destination: e.target.value })}
                />
                <div className="form-row">
                  <input
                    type="date"
                    value={newTripForm.startDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, startDate: e.target.value })}
                  />
                  <input
                    type="date"
                    value={newTripForm.endDate}
                    onChange={(e) => setNewTripForm({ ...newTripForm, endDate: e.target.value })}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Trip Currency (e.g., CHF, USD, GBP)"
                  value={newTripForm.currency}
                  onChange={(e) => setNewTripForm({ ...newTripForm, currency: e.target.value.toUpperCase() })}
                />
                <input
                  type="text"
                  placeholder="Trip Reason (optional)"
                  value={newTripForm.reason}
                  onChange={(e) => setNewTripForm({ ...newTripForm, reason: e.target.value })}
                />
                <button className="btn-primary" onClick={createNewTrip} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Trip'}
                </button>
              </div>
            )}

            <div className="trips-grid">
              {trips.length === 0 ? (
                <p className="no-trips">No trips yet. Create one to get started!</p>
              ) : (
                trips.map((trip) => (
                  <div
                    key={trip.id}
                    className="trip-card"
                    onClick={() => setSelectedTrip(trip)}
                  >
                    <div className="trip-card-header">
                      <h3>{trip.destination}</h3>
                      <span className="trip-currency">{trip.currency}</span>
                    </div>
                    <div className="trip-card-info">
                      <div className="info-row">
                        <Calendar size={16} />
                        <span>{new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}</span>
                      </div>
                      {trip.reason && (
                        <div className="info-row">
                          <span className="trip-reason">{trip.reason}</span>
                        </div>
                      )}
                      <div className="trip-total">
                        <strong>{parseFloat(trip.totalAmount || 0).toFixed(2)} {trip.currency}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="trip-detail-section">
            <div className="trip-detail-header">
              <button className="back-btn" onClick={() => setSelectedTrip(null)}>
                ← Back to Trips
              </button>
              <div className="trip-info">
                <h2>{selectedTrip.destination}</h2>
                <p className="trip-dates">
                  {new Date(selectedTrip.startDate).toLocaleDateString()} - {new Date(selectedTrip.endDate).toLocaleDateString()}
                </p>
              </div>
              <button className="btn-secondary" onClick={() => handleExport(selectedTrip.id)}>
                <Download size={20} /> Export CSV
              </button>
            </div>

            <div className="view-controls">
              <button
                className={`view-btn ${groupBy === 'chronological' ? 'active' : ''}`}
                onClick={() => setGroupBy('chronological')}
              >
                <Eye size={18} /> Chronological
              </button>
              <button
                className={`view-btn ${groupBy === 'type' ? 'active' : ''}`}
                onClick={() => setGroupBy('type')}
              >
                <Filter size={18} /> By Type
              </button>
            </div>

            <div className="expenses-section">
              {groupBy === 'chronological' ? (
                <ChronologicalView trip={selectedTrip} />
              ) : (
                <GroupedByTypeView trip={selectedTrip} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChronologicalView({ trip }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchExpenses = useCallback(async () => {
    try {
      const result = await supabase
        .from('expenses')
        .select('*')
        .eq('tripId', trip.id)
        .order('date', { ascending: false });

      console.log('Fetch expenses result:', result);

      if (!result || result.error) {
        console.error('Error fetching expenses:', result?.error);
        setExpenses([]);
      } else {
        setExpenses(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    }
    setLoading(false);
  }, [trip.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  };

  const handleSaveEdit = async () => {
    try {
      const result = await supabase
        .from('expenses')
        .update(editForm)
        .eq('id', editingId);

      if (!result || result.error) {
        alert(result?.error?.message || 'Error updating expense');
        return;
      }

      fetchExpenses();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense: ' + error.message);
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const result = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId);

        if (!result || result.error) {
          alert(result?.error?.message || 'Error deleting expense');
          return;
        }

        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error deleting expense: ' + error.message);
      }
    }
  };

  if (loading) return <p>Loading expenses...</p>;

  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amountInTripCurrency || 0), 0);
  const totalByType = expenses.reduce((acc, exp) => {
    acc[exp.type] = (acc[exp.type] || 0) + parseFloat(exp.amountInTripCurrency || 0);
    return acc;
  }, {});

  return (
    <>
      <div className="expenses-list">
        {expenses.length === 0 ? (
          <p className="no-expenses">No expenses yet!</p>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className={`expense-item ${editingId === expense.id ? 'editing' : ''}`}>
              {editingId === expense.id ? (
                <div className="expense-edit-form">
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.originalAmount}
                    onChange={(e) => setEditForm({ ...editForm, originalAmount: parseFloat(e.target.value) })}
                  />
                  <input
                    type="text"
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  />
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  />
                  <div className="edit-actions">
                    <button className="btn-save" onClick={handleSaveEdit}>Save</button>
                    <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="expense-info">
                    <div className="expense-date">{new Date(expense.date).toLocaleDateString()}</div>
                    <div className="expense-details">
                      <span className="expense-type">{expense.type}</span>
                      <span className="expense-description">{expense.description}</span>
                    </div>
                  </div>
                  <div className="expense-amount">
                    <span>{parseFloat(expense.originalAmount).toFixed(2)} {expense.originalCurrency} → {parseFloat(expense.amountInTripCurrency).toFixed(2)} {trip.currency}</span>
                  </div>
                  <div className="expense-actions">
                    <button 
                      className="btn-icon edit" 
                      onClick={() => handleEdit(expense)}
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      className="btn-icon delete" 
                      onClick={() => handleDelete(expense.id)}
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="summary-section">
        <h3>Summary by Type</h3>
        <div className="summary-breakdown">
          {Object.entries(totalByType).map(([type, amount]) => (
            <div key={type} className="summary-row">
              <span>{type}</span>
              <span className="amount">{amount.toFixed(2)} {trip.currency}</span>
            </div>
          ))}
        </div>
        <div className="summary-total">
          <strong>Total Expenses</strong>
          <strong className="total-amount">{total.toFixed(2)} {trip.currency}</strong>
        </div>
      </div>
    </>
  );
}

function GroupedByTypeView({ trip }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchExpenses = useCallback(async () => {
    try {
      const result = await supabase
        .from('expenses')
        .select('*')
        .eq('tripId', trip.id);

      console.log('Fetch expenses result:', result);

      if (!result || result.error) {
        console.error('Error fetching expenses:', result?.error);
        setExpenses([]);
      } else {
        setExpenses(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setExpenses([]);
    }
    setLoading(false);
  }, [trip.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  };

  const handleSaveEdit = async () => {
    try {
      const result = await supabase
        .from('expenses')
        .update(editForm)
        .eq('id', editingId);

      if (!result || result.error) {
        alert(result?.error?.message || 'Error updating expense');
        return;
      }

      fetchExpenses();
      setEditingId(null);
    } catch (error) {
      console.error('Error updating expense:', error);
      alert('Error updating expense: ' + error.message);
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure?')) {
      try {
        const result = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId);

        if (!result || result.error) {
          alert(result?.error?.message || 'Error deleting expense');
          return;
        }

        fetchExpenses();
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Error: ' + error.message);
      }
    }
  };

  if (loading) return <p>Loading...</p>;

  const expensesByType = expenses.reduce((acc, exp) => {
    if (!acc[exp.type]) acc[exp.type] = [];
    acc[exp.type].push(exp);
    return acc;
  }, {});

  const total = expenses.reduce((sum, exp) => sum + parseFloat(exp.amountInTripCurrency || 0), 0);
  const types = ['Train', 'Taxi', 'Meals', 'Flight', 'Hotel'];

  return (
    <>
      <div className="expenses-grouped">
        {types.map((type) => {
          const typeExpenses = expensesByType[type] || [];
          if (typeExpenses.length === 0) return null;

          const typeTotal = typeExpenses.reduce((sum, exp) => sum + parseFloat(exp.amountInTripCurrency || 0), 0);

          return (
            <div key={type} className="type-group">
              <div className="type-header">
                <span className="type-name">{type}</span>
                <span className="type-total">{typeTotal.toFixed(2)} {trip.currency}</span>
              </div>
              <div className="type-expenses">
                {typeExpenses.map((expense) => (
                  <div key={expense.id} className={`expense-item-grouped ${editingId === expense.id ? 'editing' : ''}`}>
                    {editingId === expense.id ? (
                      <div className="expense-edit-form">
                        <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                        <input type="number" step="0.01" value={editForm.originalAmount} onChange={(e) => setEditForm({ ...editForm, originalAmount: parseFloat(e.target.value) })} />
                        <input type="text" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                        <div className="edit-actions">
                          <button className="btn-save" onClick={handleSaveEdit}>Save</button>
                          <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="expense-info">
                          <span className="expense-date">{new Date(expense.date).toLocaleDateString()}</span>
                          <span className="expense-description">{expense.description}</span>
                        </div>
                        <div className="expense-amount">
                          <span>{parseFloat(expense.originalAmount).toFixed(2)} {expense.originalCurrency} → {parseFloat(expense.amountInTripCurrency).toFixed(2)} {trip.currency}</span>
                        </div>
                        <div className="expense-actions">
                          <button className="btn-icon edit" onClick={() => handleEdit(expense)}><Edit size={16} /></button>
                          <button className="btn-icon delete" onClick={() => handleDelete(expense.id)}><Trash2 size={16} /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="summary-section">
        <div className="summary-total">
          <strong>Total Expenses</strong>
          <strong className="total-amount">{total.toFixed(2)} {trip.currency}</strong>
        </div>
      </div>
    </>
  );
}
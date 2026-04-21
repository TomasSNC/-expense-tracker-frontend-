import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Plus, LogOut, Download, Eye, Filter, X, Edit, Trash2, Image as ImageIcon } from 'lucide-react';
import './App.css';

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
      setUser(JSON.parse(savedUser));
      fetchTrips(JSON.parse(savedUser).id);
    }
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        fetchTrips(data.user.id);
        setUsername('');
        setPassword('');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (error) {
      alert('Login error: ' + error.message);
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    if (!username || !password) {
      alert('Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        fetchTrips(data.user.id);
        setUsername('');
        setPassword('');
        setIsSignUp(false);
      } else {
        alert(data.message || 'Sign up failed');
      }
    } catch (error) {
      alert('Sign up error: ' + error.message);
    }
    setLoading(false);
  };

  const fetchTrips = async (userId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/trips?userId=${userId}`);
      const data = await response.json();
      setTrips(data);
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
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/trips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          destination: newTripForm.destination,
          startDate: newTripForm.startDate,
          endDate: newTripForm.endDate,
          currency: newTripForm.currency,
          reason: newTripForm.reason || ''
        })
      });
      if (response.ok) {
        fetchTrips(user.id);
        setNewTripForm({ destination: '', startDate: '', endDate: '', currency: 'EUR', reason: '' });
        setShowNewTripForm(false);
      }
    } catch (error) {
      alert('Error creating trip: ' + error.message);
    }
    setLoading(false);
  };

  const handleExport = async (tripId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/export/excel?tripId=${tripId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${selectedTrip.destination}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
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
                  placeholder="Trip Reason (e.g., Workshop for OMT)"
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
                {selectedTrip.reason && (
                  <p className="trip-reason-detail">{selectedTrip.reason}</p>
                )}
              </div>
              <div className="trip-currency-display">
                <span className="currency-label">Trip Currency:</span>
                <span className="currency-value">{selectedTrip.currency}</span>
              </div>
              <button className="btn-secondary" onClick={() => handleExport(selectedTrip.id)}>
                <Download size={20} /> Export Excel
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
                <ChronologicalView trip={selectedTrip} onUpdate={() => setSelectedTrip({ ...selectedTrip })} />
              ) : (
                <GroupedByTypeView trip={selectedTrip} onUpdate={() => setSelectedTrip({ ...selectedTrip })} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChronologicalView({ trip, onUpdate }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showReceiptImage, setShowReceiptImage] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [trip.id]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses?tripId=${trip.id}`);
      const data = await response.json();
      setExpenses(data.sort((a, b) => new Date(a.date) - new Date(b.date)));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    setLoading(false);
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        fetchExpenses();
        setEditingId(null);
      }
    } catch (error) {
      alert('Error updating expense: ' + error.message);
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${expenseId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchExpenses();
        }
      } catch (error) {
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
          <p className="no-expenses">Send your first receipt via Telegram to get started!</p>
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
                    placeholder="Original Amount"
                  />
                  <input
                    type="text"
                    value={editForm.originalCurrency}
                    onChange={(e) => setEditForm({ ...editForm, originalCurrency: e.target.value.toUpperCase() })}
                    placeholder="Currency"
                    maxLength="3"
                  />
                  <select
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                  >
                    <option value="Train">Train</option>
                    <option value="Taxi">Taxi</option>
                    <option value="Meals">Meals</option>
                    <option value="Flight">Flight</option>
                    <option value="Hotel">Hotel</option>
                  </select>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Description"
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
                    <div className="amount-display">
                      <span className="original-amount">{parseFloat(expense.originalAmount).toFixed(2)} {expense.originalCurrency}</span>
                      <span className="arrow">→</span>
                      <span className="converted-amount">{parseFloat(expense.amountInTripCurrency).toFixed(2)} {trip.currency}</span>
                    </div>
                    {expense.exchangeRate && (
                      <div className="exchange-info">Rate: {parseFloat(expense.exchangeRate).toFixed(4)}</div>
                    )}
                  </div>
                  <div className="expense-actions">
                    {expense.receiptImage && (
                      <button 
                        className="btn-icon" 
                        title="View receipt"
                        onClick={() => setShowReceiptImage(expense.receiptImage)}
                      >
                        <ImageIcon size={18} />
                      </button>
                    )}
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

      {showReceiptImage && (
        <div className="image-modal" onClick={() => setShowReceiptImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowReceiptImage(null)}>
              <X size={24} />
            </button>
            <img src={`data:image/jpeg;base64,${showReceiptImage}`} alt="Receipt" />
          </div>
        </div>
      )}

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

function GroupedByTypeView({ trip, onUpdate }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showReceiptImage, setShowReceiptImage] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [trip.id]);

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses?tripId=${trip.id}`);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
    setLoading(false);
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditForm({ ...expense });
  };

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        fetchExpenses();
        setEditingId(null);
      }
    } catch (error) {
      alert('Error updating expense: ' + error.message);
    }
  };

  const handleDelete = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/expenses/${expenseId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          fetchExpenses();
        }
      } catch (error) {
        alert('Error deleting expense: ' + error.message);
      }
    }
  };

  if (loading) return <p>Loading expenses...</p>;

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
                {typeExpenses
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .map((expense) => (
                    <div key={expense.id} className={`expense-item-grouped ${editingId === expense.id ? 'editing' : ''}`}>
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
                            placeholder="Original Amount"
                          />
                          <input
                            type="text"
                            value={editForm.originalCurrency}
                            onChange={(e) => setEditForm({ ...editForm, originalCurrency: e.target.value.toUpperCase() })}
                            placeholder="Currency"
                            maxLength="3"
                          />
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Description"
                          />
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
                            {expense.receiptImage && (
                              <button 
                                className="btn-icon" 
                                title="View receipt"
                                onClick={() => setShowReceiptImage(expense.receiptImage)}
                              >
                                <ImageIcon size={16} />
                              </button>
                            )}
                            <button 
                              className="btn-icon edit" 
                              onClick={() => handleEdit(expense)}
                              title="Edit"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              className="btn-icon delete" 
                              onClick={() => handleDelete(expense.id)}
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
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

      {showReceiptImage && (
        <div className="image-modal" onClick={() => setShowReceiptImage(null)}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowReceiptImage(null)}>
              <X size={24} />
            </button>
            <img src={`data:image/jpeg;base64,${showReceiptImage}`} alt="Receipt" />
          </div>
        </div>
      )}

      <div className="summary-section">
        <div className="summary-total">
          <strong>Total Expenses</strong>
          <strong className="total-amount">{total.toFixed(2)} {trip.currency}</strong>
        </div>
      </div>
    </>
  );
}
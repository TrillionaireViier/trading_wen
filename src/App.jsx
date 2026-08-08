import { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  CartesianGrid, Legend 
} from 'recharts';
import { 
  Bell, Settings, LogOut, Sun, Moon, Search, Download, Upload, Trash2, 
  Edit2, Menu, X, Check, Eye, Save, Plus, ArrowUpRight, ArrowDownRight, Printer, AlertTriangle
} from 'lucide-react';
import Papa from 'papaparse';
import './App.css';

// Mock Data
const MOCK_CHART_DATA = [
  { name: 'Jan', value: 4000 }, { name: 'Feb', value: 3000 }, { name: 'Mar', value: 5000 },
  { name: 'Apr', value: 4500 }, { name: 'May', value: 6000 }, { name: 'Jun', value: 5500 }
];
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const MOCK_NEWS = [
  { id: 1, title: 'Bitcoin surges past resistance', time: '2h ago', positive: true },
  { id: 2, title: 'Tech stocks dip slightly', time: '4h ago', positive: false },
  { id: 3, title: 'New crypto regulation passed', time: '1d ago', positive: true }
];

const TRANSLATIONS = {
  en: {
    dashboard: 'Dashboard', assets: 'Assets', analytics: 'Analytics', logs: 'Activity Logs', settings: 'Settings',
    search: 'Search assets...', totalValue: 'Total Portfolio Value', topGainers: 'Top Gainers', news: 'Market News'
  },
  ru: {
    dashboard: 'Главная', assets: 'Активы', analytics: 'Аналитика', logs: 'Журнал', settings: 'Настройки',
    search: 'Поиск...', totalValue: 'Общая Стоимость', topGainers: 'Лидеры Роста', news: 'Новости Рынка'
  }
};

function App() {
  const [loading, setLoading] = useState(true);
  
  // Theme & Language
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'en');
  
  // Layout
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('trading_assets_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState(() => JSON.parse(localStorage.getItem('trading_logs') || '[]'));
  
  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', ticker: '', price: '', type: 'Crypto' });
  // Forms & Settings
  const [settings, setSettings] = useState(() => JSON.parse(localStorage.getItem('trading_settings') || '{"tgBotToken":"", "tgChatId":"", "msgTemplate":"New Asset: {name} ({ticker}) at ${price}"}'));
  const [notifications, setNotifications] = useState([]);
  
  const fileInputRef = useRef(null);
  const t = TRANSLATIONS[lang];

  // Lifecycle
  useEffect(() => {
    setTimeout(() => setLoading(false), 800); // Simulate network load
  }, []);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('trading_assets_v2', JSON.stringify(assets));
    localStorage.setItem('trading_logs', JSON.stringify(logs));
    localStorage.setItem('trading_settings', JSON.stringify(settings));
  }, [assets, logs, settings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helpers
  const addLog = (action, details) => {
    setLogs(prev => [{ id: Date.now(), time: new Date().toLocaleTimeString(), action, details }, ...prev].slice(0, 50));
  };

  const notify = (msg, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  // Actions
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const imported = results.data.filter(r => r.name && r.ticker).map(r => ({
            id: Date.now() + Math.random(),
            name: r.name, ticker: r.ticker, price: r.price || '0', type: r.type || 'Crypto', date: new Date().toLocaleDateString()
          }));
          setAssets(prev => [...imported, ...prev]);
          addLog('Imported CSV', `Imported ${imported.length} assets`);
          notify(`Imported ${imported.length} assets`, 'success');
        }
      });
    }
  };

  const handleExportCSV = () => {
    const csv = Papa.unparse(assets);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets.csv';
    a.click();
    addLog('Exported CSV', `Exported ${assets.length} assets`);
  };

  const handleBackup = () => {
    const data = { assets, logs, settings };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trading_backup.json';
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBatchDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setAssets(assets.filter(a => !selectedIds.includes(a.id)));
    addLog('Batch Delete', `Deleted ${selectedIds.length} assets`);
    setSelectedIds([]);
    setShowDeleteModal(false);
    notify('Assets deleted', 'success');
  };

  // Telegram Integration
  const publishToTelegram = async (assetList) => {
    if (!settings.tgBotToken || !settings.tgChatId) {
      notify('Configure Telegram in Settings first!', 'error');
      return;
    }

    notify(`Sending ${assetList.length} items to Telegram...`);
    for (const asset of assetList) {
      const text = settings.msgTemplate
        .replace('{name}', asset.name)
        .replace('{ticker}', asset.ticker)
        .replace('{price}', asset.price);
      
      try {
        await fetch(`https://api.telegram.org/bot${settings.tgBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: settings.tgChatId, text })
        });
      } catch (e) {
        console.error(e);
      }
    }
    notify('Published to Telegram!', 'success');
    addLog('Telegram Publish', `Sent ${assetList.length} assets`);
  };

  // Filtering & Sorting
  const filteredAssets = assets
    .filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.ticker.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const paginatedAssets = filteredAssets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className={`app-container ${theme} loading-screen`}>
        <div className="spinner"></div>
        <p>Loading Enterprise Dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${theme}`}>
      {/* Notifications overlay */}
      <div className="notifications-container">
        {notifications.map(n => (
          <div key={n.id} className={`notification-toast ${n.type}`}>{n.msg}</div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon"><AlertTriangle size={32} /></div>
            <h3>Delete Assets?</h3>
            <p>Are you sure you want to permanently delete {selectedIds.length} selected assets? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent-color)'}}><Plus size={32} /></div>
            <h3>Add New Asset</h3>
            <div className="form-group" style={{textAlign: 'left', marginBottom: '16px'}}>
              <label>Name</label>
              <input type="text" placeholder="e.g. Bitcoin" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
            </div>
            <div className="form-group" style={{textAlign: 'left', marginBottom: '16px'}}>
              <label>Ticker</label>
              <input type="text" placeholder="e.g. BTC" value={newAsset.ticker} onChange={e => setNewAsset({...newAsset, ticker: e.target.value})} />
            </div>
            <div className="form-group" style={{textAlign: 'left', marginBottom: '16px'}}>
              <label>Price ($)</label>
              <input type="number" placeholder="e.g. 60000" value={newAsset.price} onChange={e => setNewAsset({...newAsset, price: e.target.value})} />
            </div>
            <div className="form-group" style={{textAlign: 'left', marginBottom: '24px'}}>
              <label>Type</label>
              <select style={{width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', outline: 'none'}} value={newAsset.type} onChange={e => setNewAsset({...newAsset, type: e.target.value})}>
                <option value="Crypto">Crypto</option>
                <option value="Stock">Stock</option>
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={() => {
                if (newAsset.name && newAsset.ticker && newAsset.price) {
                  setAssets([{id: Date.now(), ...newAsset, date: new Date().toLocaleDateString()}, ...assets]);
                  addLog('Added Asset', newAsset.name);
                  setShowAddModal(false);
                  setNewAsset({ name: '', ticker: '', price: '', type: 'Crypto' });
                  notify('Asset added successfully', 'success');
                } else {
                  notify('Please fill out all fields', 'error');
                }
              }}>Add Asset</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="gradient-text">Trading Enterprise</h2>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>
        <nav className="sidebar-nav">
          {['dashboard', 'assets', 'analytics', 'logs', 'settings'].map(tab => (
            <button key={tab} className={`nav-item ${activeTab === tab ? 'active' : ''}`} onClick={() => {setActiveTab(tab); setSidebarOpen(false);}}>
              {t[tab]}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="bot-status">
            <div className={`status-dot ${settings.tgBotToken ? 'active' : ''}`}></div>
            <span>Bot {settings.tgBotToken ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu /></button>
            <div className="search-box hidden-mobile">
              <Search size={18} />
              <input id="searchInput" type="text" placeholder={t.search + " (Cmd+K)"} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
          </div>
          <div className="topbar-right">
            <button onClick={() => setLang(lang === 'en' ? 'ru' : 'en')} className="icon-btn">{lang.toUpperCase()}</button>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="icon-btn">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="profile">
              <div className="avatar">A</div>
              <span className="hidden-mobile">Admin</span>
            </div>
          </div>
        </header>

        <div className="content-scroll">
          
          {activeTab === 'dashboard' && (
            <div className="dashboard-grid">
              {/* Widgets Row 1 */}
              <div className="widget stat-card">
                <h3>{t.totalValue}</h3>
                <div className="stat-value">$1,245,000</div>
                <div className="stat-change positive"><ArrowUpRight size={16}/> +5.4% this week</div>
              </div>
              <div className="widget stat-card">
                <h3>Total Assets Tracking</h3>
                <div className="stat-value">{assets.length}</div>
                <div className="stat-change text-muted">{assets.filter(a=>a.type==='Crypto').length} Cryptos / {assets.filter(a=>a.type==='Stock').length} Stocks</div>
              </div>
              <div className="widget stat-card">
                <h3>Fear & Greed Index</h3>
                <div className="fg-gauge">
                  <div className="fg-value greed">74</div>
                  <span>Greed</span>
                </div>
              </div>

              {/* Widgets Row 2 */}
              <div className="widget chart-widget col-span-2">
                <h3>Portfolio Performance</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={MOCK_CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none'}} />
                      <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} activeDot={{r: 8}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="widget news-widget">
                <h3>{t.news}</h3>
                <div className="news-list">
                  {MOCK_NEWS.map(news => (
                    <div key={news.id} className="news-item">
                      <div className={`news-icon ${news.positive ? 'pos' : 'neg'}`}>
                        {news.positive ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                      </div>
                      <div className="news-content">
                        <h4>{news.title}</h4>
                        <span>{news.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assets' && (
            <div className="assets-view">
              <div className="toolbar">
                <div className="toolbar-actions">
                  <button className="btn-primary" onClick={() => setShowAddModal(true)}><Plus size={16}/> Add New</button>
                  {selectedIds.length > 0 && (
                    <>
                      <button className="btn-danger" onClick={handleBatchDelete}><Trash2 size={16}/> Delete ({selectedIds.length})</button>
                      <button className="btn-secondary" onClick={() => publishToTelegram(assets.filter(a=>selectedIds.includes(a.id)))}>
                        Publish to TG
                      </button>
                    </>
                  )}
                </div>
                <div className="toolbar-tools">
                  <input type="file" ref={fileInputRef} style={{display:'none'}} accept=".csv" onChange={handleImportCSV} />
                  <button className="icon-btn" title="Import CSV" onClick={() => fileInputRef.current.click()}><Upload size={18}/></button>
                  <button className="icon-btn" title="Export CSV" onClick={handleExportCSV}><Download size={18}/></button>
                  <button className="icon-btn" title="Print PDF" onClick={handlePrint}><Printer size={18}/></button>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>
                        <input type="checkbox" 
                          checked={selectedIds.length === paginatedAssets.length && paginatedAssets.length > 0}
                          onChange={(e) => setSelectedIds(e.target.checked ? paginatedAssets.map(a=>a.id) : [])} 
                        />
                      </th>
                      <th onClick={() => setSortConfig({key: 'name', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Name ↕</th>
                      <th>Ticker</th>
                      <th onClick={() => setSortConfig({key: 'price', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Price ↕</th>
                      <th>Type</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAssets.map(asset => (
                      <tr key={asset.id} className={selectedIds.includes(asset.id) ? 'selected' : ''}>
                        <td>
                          <input type="checkbox" checked={selectedIds.includes(asset.id)} 
                            onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, asset.id] : selectedIds.filter(id=>id!==asset.id))} 
                          />
                        </td>
                        <td>{editingId === asset.id ? <input defaultValue={asset.name} onBlur={(e) => {
                          setAssets(assets.map(a => a.id === asset.id ? {...a, name: e.target.value} : a));
                        }}/> : asset.name}</td>
                        <td><span className="badge">{asset.ticker}</span></td>
                        <td>{editingId === asset.id ? <input defaultValue={asset.price} onBlur={(e) => {
                          setAssets(assets.map(a => a.id === asset.id ? {...a, price: e.target.value} : a));
                        }}/> : `$${asset.price}`}</td>
                        <td><span className={`type-tag ${asset.type.toLowerCase()}`}>{asset.type}</span></td>
                        <td>
                          <button className="action-btn" onClick={() => setEditingId(editingId === asset.id ? null : asset.id)}>
                            {editingId === asset.id ? <Save size={16}/> : <Edit2 size={16}/>}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p=>p-1)}>Prev</button>
                <span>Page {currentPage} of {Math.ceil(filteredAssets.length / itemsPerPage) || 1}</span>
                <button disabled={currentPage >= Math.ceil(filteredAssets.length / itemsPerPage)} onClick={() => setCurrentPage(p=>p+1)}>Next</button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="analytics-view">
              <h2>Portfolio Distribution</h2>
              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie data={[{name: 'Crypto', value: 70}, {name: 'Stocks', value: 30}]} cx="50%" cy="50%" outerRadius={150} fill="#8884d8" dataKey="value" label>
                      {[{name: 'Crypto'}, {name:'Stocks'}].map((entry, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="logs-view">
              <h2>Activity Logs</h2>
              <div className="logs-list">
                {logs.map(log => (
                  <div key={log.id} className="log-item">
                    <span className="log-time">{log.time}</span>
                    <span className="log-action">{log.action}</span>
                    <span className="log-details">{log.details}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-view">
              <h2>System Settings</h2>
              <div className="settings-grid">
                <div className="settings-card">
                  <h3>Telegram API</h3>
                  <div className="form-group">
                    <label>Bot Token</label>
                    <input type="password" value={settings.tgBotToken} onChange={e => setSettings({...settings, tgBotToken: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Chat ID</label>
                    <input type="text" value={settings.tgChatId} onChange={e => setSettings({...settings, tgChatId: e.target.value})} />
                  </div>
                </div>
                
                <div className="settings-card">
                  <h3>Message Templates</h3>
                  <div className="form-group">
                    <label>New Asset Alert Format</label>
                    <textarea rows="4" value={settings.msgTemplate} onChange={e => setSettings({...settings, msgTemplate: e.target.value})} />
                    <small>Available tags: {'{name}, {ticker}, {price}'}</small>
                  </div>
                </div>

                <div className="settings-card">
                  <h3>Data Management</h3>
                  <button className="btn-secondary" onClick={handleBackup}><Download size={16}/> Backup Database (JSON)</button>
                  <p className="text-muted mt-2">Downloads all assets, logs, and settings.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;

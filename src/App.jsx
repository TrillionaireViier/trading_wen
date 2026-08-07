import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [assets, setAssets] = useState(() => {
    const saved = localStorage.getItem('trading_assets')
    return saved ? JSON.parse(saved) : [
      { id: 1, name: 'Bitcoin', ticker: 'BTC', price: '65000.00', type: 'Crypto', date: new Date().toLocaleDateString() },
      { id: 2, name: 'Tesla', ticker: 'TSLA', price: '250.00', type: 'Stock', date: new Date().toLocaleDateString() }
    ]
  })

  // Form State
  const [assetName, setAssetName] = useState('')
  const [ticker, setTicker] = useState('')
  const [price, setPrice] = useState('')
  const [type, setType] = useState('Crypto')
  const [status, setStatus] = useState({ type: '', message: '' })

  // Telegram Settings state
  const [tgBotToken, setTgBotToken] = useState(() => localStorage.getItem('tgBotToken') || '')
  const [tgChatId, setTgChatId] = useState(() => localStorage.getItem('tgChatId') || '')

  useEffect(() => {
    localStorage.setItem('trading_assets', JSON.stringify(assets))
  }, [assets])

  useEffect(() => {
    localStorage.setItem('tgBotToken', tgBotToken)
    localStorage.setItem('tgChatId', tgChatId)
  }, [tgBotToken, tgChatId])

  const handleAddAsset = async (e) => {
    e.preventDefault()
    
    if (!assetName || !ticker || !price) {
      setStatus({ type: 'error', message: 'Please fill in all asset fields.' })
      return
    }

    const newAsset = {
      id: Date.now(),
      name: assetName,
      ticker,
      price,
      type,
      date: new Date().toLocaleDateString()
    }
    setAssets([newAsset, ...assets])

    if (!tgBotToken || !tgChatId) {
      setStatus({ type: 'success', message: 'Asset added locally! (Telegram not configured)' })
      clearForm()
      return
    }

    setStatus({ type: 'info', message: 'Sending to Telegram...' })
    const message = `🚀 *New ${type} Added!*\n\n*Name:* ${assetName}\n*Ticker:* ${ticker}\n*Price:* $${price}`

    try {
      const response = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChatId, text: message, parse_mode: 'Markdown' })
      })
      const data = await response.json()

      if (data.ok) {
        setStatus({ type: 'success', message: 'Asset added and sent to Telegram successfully!' })
        clearForm()
      } else {
        setStatus({ type: 'error', message: `Telegram Error: ${data.description}` })
      }
    } catch (error) {
      setStatus({ type: 'error', message: `Network Error: ${error.message}` })
    }
  }

  const clearForm = () => {
    setAssetName('')
    setTicker('')
    setPrice('')
    setTimeout(() => setStatus({ type: '', message: '' }), 3000)
  }

  const deleteAsset = (id) => {
    setAssets(assets.filter(a => a.id !== id))
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>TradingAdmin</h2>
        </div>
        <nav className="sidebar-nav">
          <button className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            📊 Dashboard
          </button>
          <button className={`nav-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
            ➕ Add Asset
          </button>
          <button className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
            ⚙️ Integrations
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h1>{activeTab === 'dashboard' ? 'Overview' : activeTab === 'add' ? 'Add New Asset' : 'Settings & Integrations'}</h1>
          <div className="admin-profile">
            <div className="avatar">A</div>
            <span>Admin User</span>
          </div>
        </header>

        <div className="content-area">
          {status.message && (
            <div className={`status-banner ${status.type}`}>
              {status.message}
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="tab-pane">
              <div className="metrics-grid">
                <div className="metric-card">
                  <h3>Total Assets</h3>
                  <div className="value">{assets.length}</div>
                </div>
                <div className="metric-card">
                  <h3>Cryptocurrencies</h3>
                  <div className="value">{assets.filter(a => a.type === 'Crypto').length}</div>
                </div>
                <div className="metric-card">
                  <h3>Stocks</h3>
                  <div className="value">{assets.filter(a => a.type === 'Stock').length}</div>
                </div>
              </div>

              <div className="table-container">
                <h2>Recent Assets</h2>
                <table className="assets-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Type</th>
                      <th>Date Added</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map(asset => (
                      <tr key={asset.id}>
                        <td><strong>{asset.name}</strong></td>
                        <td><span className="badge">{asset.ticker}</span></td>
                        <td>${asset.price}</td>
                        <td><span className={`type-badge ${asset.type.toLowerCase()}`}>{asset.type}</span></td>
                        <td>{asset.date}</td>
                        <td>
                          <button className="delete-btn" onClick={() => deleteAsset(asset.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                    {assets.length === 0 && (
                      <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px'}}>No assets found. Add some!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADD ASSET TAB */}
          {activeTab === 'add' && (
            <div className="tab-pane form-container">
              <form onSubmit={handleAddAsset} className="glass-form">
                <div className="input-group">
                  <label>Asset Type</label>
                  <select value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="Crypto">Cryptocurrency</option>
                    <option value="Stock">Stock</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Name (e.g. Bitcoin, Tesla)</label>
                  <input type="text" value={assetName} onChange={(e) => setAssetName(e.target.value)} placeholder="Bitcoin" />
                </div>
                <div className="input-group">
                  <label>Ticker/Symbol (e.g. BTC, TSLA)</label>
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="BTC" />
                </div>
                <div className="input-group">
                  <label>Current Price ($)</label>
                  <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="65000.00" />
                </div>
                <button type="submit" className="submit-btn">Add Asset & Publish to TG 🚀</button>
              </form>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="tab-pane form-container">
              <div className="glass-form">
                <h2>Telegram Bot Configuration 🤖</h2>
                <p className="help-text">Configure your Telegram bot to auto-post new assets to your channel.</p>
                <div className="input-group">
                  <label>Bot Token</label>
                  <input type="password" value={tgBotToken} onChange={(e) => setTgBotToken(e.target.value)} placeholder="123456:ABC-DEF..." />
                </div>
                <div className="input-group">
                  <label>Channel ID (Chat ID)</label>
                  <input type="text" value={tgChatId} onChange={(e) => setTgChatId(e.target.value)} placeholder="@your_channel" />
                </div>
                <div className="settings-saved">
                  <small>✓ Settings auto-save to browser local storage</small>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

export default App

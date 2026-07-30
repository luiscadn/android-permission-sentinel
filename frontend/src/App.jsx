import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [features, setFeatures] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8000/features')
      .then(res => res.json())
      .then(data => {
        if (data.features) {
          setFeatures(data.features.filter(f => f !== 'type'));
        }
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor de análisis.');
      });
  }, []);

  const togglePermission = (perm) => {
    setResult(null);
    if (selectedPermissions.includes(perm)) {
      setSelectedPermissions(selectedPermissions.filter(p => p !== perm));
    } else {
      setSelectedPermissions([...selectedPermissions, perm]);
    }
  };

  const clearSelection = () => {
    setSelectedPermissions([]);
    setResult(null);
  };

  const applyPreset = (type) => {
    setResult(null);
    if (type === 'sms_app') {
      setSelectedPermissions([
        'android.permission.SEND_SMS',
        'android.permission.RECEIVE_SMS',
        'android.permission.READ_CONTACTS',
        'android.permission.INTERNET'
      ]);
    } else if (type === 'basic_app') {
      setSelectedPermissions([
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.VIBRATE'
      ]);
    } else if (type === 'suspicious_flashlight') {
      setSelectedPermissions([
        'android.permission.CAMERA',
        'android.permission.FLASHLIGHT',
        'android.permission.READ_PHONE_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.READ_SMS'
      ]);
    }
  };

  const runAnalysis = async () => {
    if (selectedPermissions.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: selectedPermissions }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError('Fallo durante la evaluación del vector de permisos.');
    } finally {
      setLoading(false);
    }
  };

  const filtered = features.filter(f =>
    f.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="app-layout">
      <header className="top-bar">
        <div>
          <h1 className="brand-title">
            Auditor de Permisos Android
          </h1>
          <p className="brand-subtitle">
            Análisis estático de patrones de riesgo en aplicaciones Android
          </p>
        </div>
      </header>

      {error && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

      <div className="grid-container">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Manifest.xml - Vector de Permisos</h2>
            <span className="badge-count">{selectedPermissions.length} seleccionados</span>
          </div>

          <div className="presets-container">
            <button className="btn-preset" onClick={() => applyPreset('basic_app')}>Plantilla: App Estándar</button>
            <button className="btn-preset" onClick={() => applyPreset('sms_app')}>Plantilla: SMS/Mensajería</button>
            <button className="btn-preset" onClick={() => applyPreset('suspicious_flashlight')}>Plantilla: Linterna Sospechosa</button>
          </div>

          <div className="selected-tags">
            {selectedPermissions.length === 0 ? (
              <p className="empty-state">No se han añadido permisos al vector de prueba.</p>
            ) : (
              selectedPermissions.map(perm => (
                <div key={perm} className="chip">
                  <span>{perm.replace('android.permission.', '')}</span>
                  <span className="chip-close" onClick={() => togglePermission(perm)}>+</span>
                </div>
              ))
            )}
          </div>

          <div className="actions-row">
            <button
              className="btn-main"
              onClick={runAnalysis}
              disabled={loading || selectedPermissions.length === 0}
            >
              {loading ? 'Evaluando...' : 'Evaluar Vector de Riesgo'}
            </button>
            <button className="btn-secondary" onClick={clearSelection}>
              Limpiar
            </button>
          </div>

          {result && (
            <div className={`result-box ${result.verdict === 'Malware' ? 'malware' : 'benign'}`}>
              <div className={`result-status ${result.verdict === 'Malware' ? 'malware' : 'benign'}`}>
                {result.verdict === 'Malware' ? 'Patrón de Riesgo: Malware' : 'Patrón de Riesgo: Benigno / Seguro'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                <span>Probabilidad de Riesgo</span>
                <span>
                  {result.verdict === 'Malware'
                    ? (result.malware_probability * 100).toFixed(1)
                    : (result.benign_probability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="meter-bg">
                <div
                  className={`meter-fill ${result.verdict === 'Malware' ? 'malware' : 'benign'}`}
                  style={{
                    width: `${result.verdict === 'Malware' ? result.malware_probability * 100 : result.benign_probability * 100}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Catálogo de Permisos</h2>
            <span className="badge-count">{features.length} disponibles</span>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Filtrar por nombre (ej. READ_SMS, CAMERA)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="permission-grid">
            {filtered.slice(0, 60).map(perm => {
              const isSelected = selectedPermissions.includes(perm);
              return (
                <div
                  key={perm}
                  className={`permission-row ${isSelected ? 'active' : ''}`}
                  onClick={() => togglePermission(perm)}
                >
                  <span>{perm.replace('android.permission.', '')}</span>
                  <span>{isSelected ? 'x' : '+'}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;

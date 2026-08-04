import { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [features, setFeatures] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showCitation, setShowCitation] = useState(false);

  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8000/features')
      .then(res => res.json())
      .then(data => {
        if (data.features) {
          setFeatures(data.features.filter(f => f !== 'type'));
        }
      })
      .catch(() => {
        setError('No se pudo conectar con el servidor backend de análisis (http://localhost:8000). Verifique que esté activo.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const applyPreset = (type) => {
    setResult(null);
    if (type === 'sms_app') {
      setSelectedPermissions([
        'android.permission.SEND_SMS',
        'android.permission.RECEIVE_SMS',
        'android.permission.READ_CONTACTS',
        'android.permission.INTERNET',
        'android.permission.READ_SMS'
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
        'android.permission.READ_SMS',
        'android.permission.SEND_SMS',
        'android.permission.WRITE_EXTERNAL_STORAGE'
      ]);
    } else if (type === 'sample_spyware') {
      setSelectedPermissions([
        'android.permission.READ_SMS',
        'android.permission.SEND_SMS',
        'android.permission.RECEIVE_SMS',
        'android.permission.READ_CONTACTS',
        'android.permission.READ_PHONE_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.INTERNET',
        'android.permission.WRITE_EXTERNAL_STORAGE'
      ]);
    }
  };

  const getRiskLevel = (perm) => {
    const p = perm.toUpperCase();
    if (p.includes('SMS') || p.includes('LOCATION') || p.includes('RECORD_AUDIO') || p.includes('CALL_PHONE')) {
      return { label: 'CRÍTICO', class: 'risk-critical' };
    }
    if (p.includes('CONTACTS') || p.includes('CAMERA') || p.includes('STORAGE') || p.includes('PHONE_STATE')) {
      return { label: 'ELEVADO', class: 'risk-high' };
    }
    return { label: 'ESTÁNDAR', class: 'risk-standard' };
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
      setError('Fallo durante la evaluación del vector de riesgo en el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !file.name.endsWith('.apk')) {
      setError('Por favor, selecciona un archivo APK válido (.apk).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/upload-apk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        if (data.extracted_permissions && data.extracted_permissions.length > 0) {
          setSelectedPermissions(data.extracted_permissions);
        }
        setResult(data);
      }
    } catch {
      setError('Fallo durante la extracción estática de permisos del APK.');
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const filtered = features.filter(f => {
    const matchesSearch = f.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    const p = f.toUpperCase();
    if (activeCategory === 'critical') {
      return p.includes('SMS') || p.includes('LOCATION') || p.includes('CAMERA') || p.includes('AUDIO') || p.includes('PHONE_STATE') || p.includes('CONTACTS');
    }
    if (activeCategory === 'network') {
      return p.includes('INTERNET') || p.includes('NETWORK') || p.includes('WIFI') || p.includes('BLUETOOTH');
    }
    if (activeCategory === 'storage') {
      return p.includes('STORAGE') || p.includes('FILE') || p.includes('MEDIA') || p.includes('READ_EXTERNAL') || p.includes('WRITE_EXTERNAL');
    }
    return true;
  });

  return (
    <div className="sentinel-app">
      {/* Top Banner / Ticker */}
      <div className="top-ticker">
        <div className="ticker-content">
          <span className="ticker-badge">RESEARCH DATASET</span>
          <span className="ticker-text">UNIVERSIDAD ICESI · CIBERSEGURIDAD · IEEE COLCOM 2016 · AUDITORÍA ESTÁTICA ANDROID</span>
        </div>
      </div>

      <div className="app-container">
        {/* Navigation & Header */}
        <header className="main-header">
          <div className="brand-block">
            <div className="shield-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div>
              <span className="brand-tag">ANTIMALWARE SENTINEL</span>
              <h1 className="brand-name">Auditor de Permisos Android</h1>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="btn-citation"
              onClick={() => setShowCitation(!showCitation)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              Cita Académica (APA)
            </button>
          </div>
        </header>

        {/* Modal / Card for APA Citations */}
        {showCitation && (
          <div className="citation-banner">
            <div className="citation-header">
              <h3> Referencias de Investigación y Publicaciones</h3>
              <button className="btn-close" onClick={() => setShowCitation(false)}>×</button>
            </div>
            <div className="citation-body">
              <p className="citation-item">
                <strong>Publicación Principal (IEEE):</strong><br />
                Urcuqui, C., & Navarro, A. (2016, April). <em>Machine learning classifiers for android malware analysis</em>. In Communications and Computing (COLCOM), 2016 IEEE Colombian Conference on (pp. 1-6). IEEE.
              </p>
              <p className="citation-item">
                <strong>Framework de Análisis:</strong><br />
                Urcuqui, C., & Navarro, A. (2016). <em>Framework for malware analysis in Android</em>. Sistemas & Telemática, 14(37), 45-56.
              </p>
            </div>
          </div>
        )}

        {/* Hero & Research Context Section */}
        <section className="hero-section">
          <div className="hero-main">
            <div className="subhead-pill">
              <span className="pill-dot"></span>
              INTELIGENCIA ARTIFICIAL & SEGURIDAD MÓVIL
            </div>
            <h2 className="hero-title">
              Detección de malware mediante <span className="highlight-serif">vectores de permisos</span> en Android.
            </h2>
            <p className="hero-description">
              Herramienta de análisis estático basada en la producción científica de los profesores <strong>Christian Urcuqui</strong> y <strong>Andrés Navarro</strong> (Universidad ICESI). Modela la firma de riesgo de cada aplicación mediante un vector binario de permisos <code className="code-pill">&#123;1 = solicitado, 0 = no solicitado&#125;</code> clasificado como <strong>Malware (1)</strong> o <strong>Benigno (0)</strong>.
            </p>
          </div>

          <div className="hero-metrics">
            <div className="metric-card red-glow">
              <div className="metric-header">
                <span className="metric-label">FEATURES DE MODELO</span>
                <span className="metric-badge">Vector Binario</span>
              </div>
              <div className="metric-value">{features.length > 0 ? features.length : 330}</div>
              <div className="metric-footer">Permisos Android evaluados</div>
            </div>

            <div className="metric-card gold-glow">
              <div className="metric-header">
                <span className="metric-label">CLASIFICADOR ML</span>
                <span className="metric-badge">Supervisado</span>
              </div>
              <div className="metric-value">Scikit-Learn</div>
              <div className="metric-footer">Random Forest / Decision Trees</div>
            </div>
          </div>
        </section>

        {error && (
          <div className="error-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Main Interactive Grid */}
        <div className="workspace-grid">
          {/* Left Panel: Inspection & Prediction */}
          <section className="panel primary-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Manifest.xml — Vector de Prueba</h3>
                <p className="panel-subtitle">Sube un APK o selecciona permisos manualmente</p>
              </div>
              <span className="badge-counter">{selectedPermissions.length} seleccionados</span>
            </div>

            {/* Drop Zone */}
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".apk"
                onChange={(e) => {
                  if (e.target.files.length > 0) handleFileUpload(e.target.files[0]);
                }}
              />
              <div className="dropzone-icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="dropzone-text">
                {loading ? (
                  <span className="pulse-text">Procesando binario APK...</span>
                ) : (
                  <>
                    <strong>Sube o arrastra tu archivo .apk</strong>
                    <span>Extracción automatizada de <i>AndroidManifest.xml</i></span>
                  </>
                )}
              </div>
            </div>

            {/* Presets */}
            <div className="presets-wrapper">
              <span className="presets-label">Plantillas de prueba rápida:</span>
              <div className="presets-buttons">
                <button className="preset-chip" onClick={() => applyPreset('basic_app')}>
                  App Básica
                </button>
                <button className="preset-chip" onClick={() => applyPreset('sms_app')}>
                  Mensajería SMS
                </button>
                <button className="preset-chip dangerous" onClick={() => applyPreset('suspicious_flashlight')}>
                  ⚠️ Linterna Sospechosa
                </button>
                <button className="preset-chip sample-malware" onClick={() => applyPreset('sample_spyware')}>
                  🔥 APK Muestra (Spyware)
                </button>
              </div>
            </div>

            {/* Selected Tags Box */}
            <div className="selected-box">
              {selectedPermissions.length === 0 ? (
                <div className="empty-placeholder">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12h8" />
                  </svg>
                  <span>No hay permisos agregados al vector binario. Haz clic en el catálogo o usa una plantilla.</span>
                </div>
              ) : (
                <div className="chips-grid">
                  {selectedPermissions.map(perm => {
                    const risk = getRiskLevel(perm);
                    return (
                      <div key={perm} className={`perm-chip ${risk.class}`}>
                        <span className="chip-name">{perm.replace('android.permission.', '')}</span>
                        <span className={`risk-tag ${risk.class}`}>{risk.label}</span>
                        <button className="chip-remove" onClick={() => togglePermission(perm)}>×</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button
                className="btn-evaluate"
                onClick={runAnalysis}
                disabled={loading || selectedPermissions.length === 0}
              >
                {loading ? (
                  <span className="btn-loading">
                    <span className="spinner"></span> Evaluando Patrón de Riesgo...
                  </span>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Evaluar Vector de Riesgo
                  </>
                )}
              </button>
              <button className="btn-reset" onClick={clearSelection}>
                Limpiar Vector
              </button>
            </div>

            {/* Verdict Result */}
            {result && (
              <div className={`verdict-card ${result.verdict === 'Malware' ? 'is-malware' : 'is-benign'}`}>
                <div className="verdict-header">
                  <div className="verdict-status-pill">
                    {result.verdict === 'Malware' ? (
                      <>
                        <span className="pulse-red"></span>
                        VEREDICTO DE AMENAZA: MALWARE DETECTADO
                      </>
                    ) : (
                      <>
                        <span className="pulse-green"></span>
                        VEREDICTO SEGURIDAD: COMPORTAMIENTO BENIGNO
                      </>
                    )}
                  </div>
                  <span className="verdict-score">
                    {result.verdict === 'Malware'
                      ? (result.malware_probability * 100).toFixed(1)
                      : (result.benign_probability * 100).toFixed(1)}%
                  </span>
                </div>

                <p className="verdict-detail">
                  {result.verdict === 'Malware'
                    ? 'El patrón binario de permisos coincide significativamente con la firma de familias maliciosas del dataset.'
                    : 'La combinación de permisos requeridos se alinea con firmas típicas de aplicaciones legítimas en el dataset.'}
                </p>

                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${result.verdict === 'Malware' ? result.malware_probability * 100 : result.benign_probability * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}
          </section>

          {/* Right Panel: Catalog */}
          <section className="panel secondary-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">Catálogo de Permisos</h3>
                <p className="panel-subtitle">Explora los {features.length} permisos del modelo</p>
              </div>
              <span className="badge-counter">{filtered.length} visibles</span>
            </div>

            {/* Search Box */}
            <div className="search-box">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-field"
                placeholder="Buscar (ej. READ_SMS, CAMERA, INTERNET)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => setSearchTerm('')}>×</button>
              )}
            </div>

            {/* Category Filter Pills (No emojis) */}
            <div className="category-filters">
              <button
                className={`filter-tab ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                Todos
              </button>
              <button
                className={`filter-tab ${activeCategory === 'critical' ? 'active' : ''}`}
                onClick={() => setActiveCategory('critical')}
              >
                Sensibles
              </button>
              <button
                className={`filter-tab ${activeCategory === 'network' ? 'active' : ''}`}
                onClick={() => setActiveCategory('network')}
              >
                Red
              </button>
              <button
                className={`filter-tab ${activeCategory === 'storage' ? 'active' : ''}`}
                onClick={() => setActiveCategory('storage')}
              >
                Archivos
              </button>
            </div>

            {/* Catalog Scroll List */}
            <div className="catalog-scroll">
              {filtered.length === 0 ? (
                <div className="empty-catalog">
                  No se encontraron permisos coincidentes en esta categoría.
                </div>
              ) : (
                filtered.slice(0, 100).map(perm => {
                  const isSelected = selectedPermissions.includes(perm);
                  const isCritical = perm.includes('SMS') || perm.includes('LOCATION') || perm.includes('CAMERA') || perm.includes('PHONE_STATE') || perm.includes('CONTACTS') || perm.includes('AUDIO');

                  return (
                    <div
                      key={perm}
                      className={`catalog-row ${isSelected ? 'selected' : ''} ${isCritical ? 'critical-perm' : ''}`}
                      onClick={() => togglePermission(perm)}
                    >
                      <div className="perm-info">
                        <span className="perm-title" title={perm}>
                          {perm.replace('android.permission.', '').replace('android.intent.category.', '')}
                        </span>
                        {isCritical && <span className="critical-badge">Sensible</span>}
                      </div>
                      <span className="toggle-btn">{isSelected ? '✓' : '+'}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="main-footer">
          <p>
            Desarrollado para la materia de <strong>Ciberseguridad</strong> · Universidad ICESI · Basado en la investigación de C. Urcuqui & A. Navarro (2016)
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;

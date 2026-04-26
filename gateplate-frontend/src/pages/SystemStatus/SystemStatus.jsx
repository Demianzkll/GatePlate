import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
    Activity, Cpu, HardDrive, Gauge, Brain,
    Wifi, WifiOff, Monitor, TrendingUp
} from 'lucide-react';
import './SystemStatus.css';

// ——————————————————————————————————————
// WebSocket URL — change to your Django Channels endpoint
// ——————————————————————————————————————
const WS_URL = 'ws://localhost:8000/ws/system-stats/';

// Max data points for the live graph (last 30 seconds at ~1 msg/sec)
const MAX_CHART_POINTS = 30;

// ——————————————————————————————————————
// Custom Recharts Tooltip
// ——————————————————————————————————————
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(30, 42, 56, 0.95)',
            border: '1px solid rgba(0, 191, 165, 0.3)',
            borderRadius: 10,
            padding: '10px 14px',
            backdropFilter: 'blur(8px)',
        }}>
            <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>{label}</p>
            <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 700, color: '#00BFA5' }}>
                {payload[0].value} FPS
            </p>
        </div>
    );
};

// ——————————————————————————————————————
// Main Component
// ——————————————————————————————————————
const SystemStatus = () => {
    // Live metrics state
    const [stats, setStats] = useState({
        fps: 0,
        latency: 0,
        cpu: 0,
        ram: 0,
        is_active: false,
        confidence: 0,
    });

    // FPS history for the chart
    const [fpsHistory, setFpsHistory] = useState([]);

    // WebSocket connection status: 'connecting' | 'connected' | 'disconnected'
    const [wsStatus, setWsStatus] = useState('connecting');

    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);

    // ———— WebSocket logic ————
    const connect = useCallback(() => {
        setWsStatus('connecting');

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            setWsStatus('connected');
            console.log('[SystemStatus] WebSocket connected');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                setStats({
                    fps: data.fps ?? 0,
                    latency: data.latency ?? 0,
                    cpu: data.cpu ?? 0,
                    ram: data.ram ?? 0,
                    is_active: data.is_active ?? false,
                    confidence: data.confidence ?? 0,
                });

                // Append to FPS history
                setFpsHistory(prev => {
                    const now = new Date();
                    const timeLabel = now.toLocaleTimeString('uk-UA', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    });
                    const next = [...prev, { time: timeLabel, fps: data.fps ?? 0 }];
                    return next.length > MAX_CHART_POINTS ? next.slice(-MAX_CHART_POINTS) : next;
                });
            } catch (err) {
                console.error('[SystemStatus] Failed to parse message:', err);
            }
        };

        ws.onerror = (err) => {
            console.error('[SystemStatus] WebSocket error:', err);
        };

        ws.onclose = () => {
            setWsStatus('disconnected');
            console.log('[SystemStatus] WebSocket disconnected, retrying in 3s…');
            reconnectTimer.current = setTimeout(connect, 3000);
        };
    }, []);

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
        };
    }, [connect]);

    // ———— Helpers ————
    const getLoadStatus = (value) => {
        if (value < 60) return { text: 'Нормальне', cls: 'status-good' };
        if (value < 85) return { text: 'Підвищене', cls: 'status-warning' };
        return { text: 'Критичне', cls: 'status-critical' };
    };

    const getProgressColor = (value) => {
        if (value < 60) return 'fill-teal';
        if (value < 85) return 'fill-amber';
        return 'fill-red';
    };

    const getConnectionLabel = () => {
        switch (wsStatus) {
            case 'connected': return 'Підключено';
            case 'connecting': return 'Підключення…';
            default: return 'Відключено';
        }
    };

    const cpuStatus = getLoadStatus(stats.cpu);
    const ramStatus = getLoadStatus(stats.ram);

    // ——————————————————————————————————————
    // Render
    // ——————————————————————————————————————
    return (
        <div className="system-status-container">
            {/* ===== Header ===== */}
            <div className="ss-header">
                <div className="ss-header-left">
                    <div className="ss-header-icon">
                        <Monitor size={24} color="#00BFA5" />
                    </div>
                    <div>
                        <h2>System <span>Monitor</span></h2>
                        <p>Моніторинг стану ALPR-системи в реальному часі</p>
                    </div>
                </div>

                <div className={`ss-connection-badge ${wsStatus}`}>
                    <span className="ss-pulse-dot" />
                    {wsStatus === 'connected'
                        ? <Wifi size={14} />
                        : <WifiOff size={14} />
                    }
                    {getConnectionLabel()}
                </div>
            </div>

            {/* ===== Metric Cards Grid ===== */}
            <div className="ss-metrics-grid">
                {/* — FPS Card — */}
                <div className="ss-metric-card" id="card-fps">
                    <div className="ss-card-header">
                        <div className="ss-card-title-group">
                            <div className="ss-card-icon icon-teal">
                                <Activity size={20} color="#00BFA5" />
                            </div>
                            <span className="ss-card-label">Кадри / сек</span>
                        </div>
                        <span className={`ss-card-status ${stats.fps >= 24 ? 'status-good' : stats.fps >= 15 ? 'status-warning' : 'status-critical'}`}>
                            {stats.fps >= 24 ? 'Оптимально' : stats.fps >= 15 ? 'Низький' : 'Критично'}
                        </span>
                    </div>
                    <div className="ss-card-value-row">
                        <span className="ss-card-value">{stats.fps.toFixed(1)}</span>
                        <span className="ss-card-unit">FPS</span>
                    </div>
                    <p className="ss-card-subtitle">Швидкість обробки відеопотоку</p>
                </div>

                {/* — Latency Card — */}
                <div className="ss-metric-card" id="card-latency">
                    <div className="ss-card-header">
                        <div className="ss-card-title-group">
                            <div className="ss-card-icon icon-purple">
                                <Gauge size={20} color="#a855f7" />
                            </div>
                            <span className="ss-card-label">Затримка</span>
                        </div>
                        <span className={`ss-card-status ${stats.latency <= 50 ? 'status-good' : stats.latency <= 120 ? 'status-warning' : 'status-critical'}`}>
                            {stats.latency <= 50 ? 'Низька' : stats.latency <= 120 ? 'Середня' : 'Висока'}
                        </span>
                    </div>
                    <div className="ss-card-value-row">
                        <span className="ss-card-value">{stats.latency.toFixed(0)}</span>
                        <span className="ss-card-unit">мс</span>
                    </div>
                    <p className="ss-card-subtitle">Час обробки одного кадру</p>
                </div>

                {/* — CPU Card — */}
                <div className="ss-metric-card" id="card-cpu">
                    <div className="ss-card-header">
                        <div className="ss-card-title-group">
                            <div className="ss-card-icon icon-blue">
                                <Cpu size={20} color="#3b82f6" />
                            </div>
                            <span className="ss-card-label">Процесор</span>
                        </div>
                        <span className={`ss-card-status ${cpuStatus.cls}`}>{cpuStatus.text}</span>
                    </div>
                    <div className="ss-progress-container">
                        <div className="ss-progress-label-row">
                            <span className="ss-progress-label">CPU Usage</span>
                            <span className="ss-progress-value">{stats.cpu.toFixed(1)}%</span>
                        </div>
                        <div className="ss-progress-track">
                            <motion.div
                                className={`ss-progress-fill ${getProgressColor(stats.cpu)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.cpu}%` }}
                                transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                            />
                        </div>
                    </div>
                </div>

                {/* — RAM Card — */}
                <div className="ss-metric-card" id="card-ram">
                    <div className="ss-card-header">
                        <div className="ss-card-title-group">
                            <div className="ss-card-icon icon-amber">
                                <HardDrive size={20} color="#f59e0b" />
                            </div>
                            <span className="ss-card-label">Пам'ять</span>
                        </div>
                        <span className={`ss-card-status ${ramStatus.cls}`}>{ramStatus.text}</span>
                    </div>
                    <div className="ss-progress-container">
                        <div className="ss-progress-label-row">
                            <span className="ss-progress-label">RAM Usage</span>
                            <span className="ss-progress-value">{stats.ram.toFixed(1)}%</span>
                        </div>
                        <div className="ss-progress-track">
                            <motion.div
                                className={`ss-progress-fill ${getProgressColor(stats.ram)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.ram}%` }}
                                transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Bottom Row: Chart + AI Status ===== */}
            <div className="ss-bottom-row">
                {/* — Live FPS Chart — */}
                <div className="ss-chart-card" id="chart-fps-live">
                    <div className="ss-chart-header">
                        <div className="ss-chart-title">
                            <TrendingUp size={18} color="#00BFA5" />
                            <h3>FPS — Live Graph</h3>
                        </div>
                        <span className="ss-chart-period">Останні 30 сек</span>
                    </div>
                    <div className="ss-chart-wrapper">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fpsHistory} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="fpsFill" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00BFA5" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00BFA5" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.15)" />
                                <XAxis
                                    dataKey="time"
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={{ stroke: 'rgba(71,85,105,0.2)' }}
                                    tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fill: '#64748b', fontSize: 10 }}
                                    axisLine={{ stroke: 'rgba(71,85,105,0.2)' }}
                                    tickLine={false}
                                    domain={[0, 'auto']}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="fps"
                                    stroke="#00BFA5"
                                    strokeWidth={2.5}
                                    fill="url(#fpsFill)"
                                    dot={false}
                                    activeDot={{
                                        r: 5,
                                        fill: '#00BFA5',
                                        stroke: '#0f172a',
                                        strokeWidth: 2,
                                    }}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* — AI Status Card — */}
                <div className="ss-ai-card" id="card-ai-status">
                    <div className="ss-ai-header">
                        <Brain size={20} color="#00BFA5" />
                        <h3>AI — YOLOv8</h3>
                    </div>

                    <div className="ss-ai-body">
                        {/* Model orb */}
                        <div className="ss-model-orb-wrapper">
                            <motion.div
                                className={`ss-model-orb ${stats.is_active ? 'orb-active' : 'orb-idle'}`}
                                animate={{
                                    scale: stats.is_active ? [1, 1.06, 1] : 1,
                                }}
                                transition={{
                                    repeat: stats.is_active ? Infinity : 0,
                                    duration: 2.5,
                                    ease: 'easeInOut',
                                }}
                            >
                                <Brain
                                    size={32}
                                    color={stats.is_active ? '#00BFA5' : '#f59e0b'}
                                />
                            </motion.div>
                            <div className="ss-orb-glow" />
                        </div>

                        <div className="ss-model-status-text">
                            <span className="ss-model-status-label">Стан моделі</span>
                            <span className={`ss-model-status-value ${stats.is_active ? 'status-active' : 'status-idle'}`}>
                                {stats.is_active ? 'Active' : 'Idle'}
                            </span>
                        </div>

                        {/* Confidence */}
                        <div className="ss-confidence-section">
                            <span className="ss-confidence-label">Confidence Score</span>
                            <div className="ss-confidence-bar-wrapper">
                                <motion.div
                                    className="ss-confidence-fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(stats.confidence * 100).toFixed(0)}%` }}
                                    transition={{ type: 'spring', stiffness: 50, damping: 15 }}
                                />
                            </div>
                            <span className="ss-confidence-value">
                                {(stats.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemStatus;

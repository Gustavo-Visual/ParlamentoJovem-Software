import React, { useState, useEffect, useMemo } from 'react';
import { Clock, Award, AlertTriangle, Save, ArrowUp, ArrowDown, ChevronRight, CheckCircle, Printer, Lock, Trash2, Sparkles, Users, ClipboardCheck, BarChart3 } from 'lucide-react';

// --- DATA STRUCTURES & CONSTANTS ---

const DATA_VERSION = 2;
const STORAGE_KEY = 'pj_app_data_v2';
const PRACTICAL_EPSILON = 1e-6;

const QUESTIONS = [
    // PRINCIPAIS (comunicação) - Perguntas 1-3
    { id: 1, type: 'Principal', time: 45, text: "Conta uma situação em que um aluno gastou dinheiro e depois arrependeu-se. O que faltou na decisão?" },
    { id: 2, type: 'Principal', time: 45, text: "Explica a um colega em 20 segundos: 'pagar a prestações' é bom ou mau? Depende de quê?" },
    { id: 3, type: 'Principal', time: 45, text: "Diz 1 mensagem curta que convença alunos a aparecer (sem parecer 'palestra')." },
    // DEBATE (ataque/defesa — sem proposta) - Perguntas 4-7
    { id: 4, type: 'Debate', time: 30, text: "Ataque: 'Literacia financeira é seca e inútil.' Resposta: 1 exemplo + 1 consequência." },
    { id: 5, type: 'Debate', time: 30, text: "Ataque: 'Isso não muda nada, a malta continua a gastar.' Resposta: 1 mudança concreta de comportamento." },
    { id: 6, type: 'Debate', time: 30, text: "Ataque: 'Basta dizer poupa.' Resposta: por que isso falha + o que falta (crédito/custo total/scams)." },
    { id: 7, type: 'Debate', time: 30, text: "Ataque: 'Se falas de scams/crypto, estás a assustar.' Resposta: diferença entre informar e assustar." },
    // SUPPORT (execução) - Perguntas 8-10
    { id: 8, type: 'Support', time: 60, text: "Cria uma atividade de 10 minutos (estilo desafio) que ensine 1 ideia útil de literacia financeira e que faça colegas quererem participar/votar em nós." },
    { id: 9, type: 'Support', time: 60, text: "Como medes se resultou? Diz 2 indicadores simples (ex.: antes/depois num quiz curto)." },
    { id: 10, type: 'Support', time: 120, text: "Escreve: como vais ajudar a lista a receber votos?" }
];

const RUBRIC = {
    0: "Não responde / Erra / Sem estrutura",
    1: "Fraco (vago, confuso)",
    2: "Aceitável (ideia certa, pouco clara)",
    3: "Bom (claro, correto, com exemplo)",
    4: "Excelente (curto, convincente, aplicável)"
};

const STRATEGY_LABELS = {
    'PRIORITIZE_PROFILES': 'Opção A: Priorizar Perfis'
};

const INITIAL_CANDIDATES = Array(10).fill(null).map((_, i) => ({
    id: `c-${i}`,
    name: `Candidato ${i + 1}`,
    scores: {},
    notes: '',
    status: 'pending'
}));

const getBadgeClass = (type) => {
    const classes = {
        'Principal': 'badge badge-pitch',
        'Debate': 'badge badge-pressao',
        'Support': 'badge badge-escrita'
    };
    return classes[type] || 'badge bg-slate-100 text-slate-600';
};

// --- COMPONENT: STOPWATCH ---
const Stopwatch = ({ defaultTime }) => {
    const [time, setTime] = useState(defaultTime || 0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval;
        if (isRunning) {
            interval = setInterval(() => {
                setTime((prev) => (defaultTime ? Math.max(0, prev - 1) : prev + 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, defaultTime]);

    const toggle = () => setIsRunning(!isRunning);
    const reset = () => { setIsRunning(false); setTime(defaultTime || 0); };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const isLow = defaultTime && time <= 10 && time > 0;
    const isZero = defaultTime && time === 0;

    return (
        <div className={`flex items-center gap-2 text-sm font-mono px-3 py-1.5 rounded-full transition-all duration-300 ${isZero ? 'bg-red-100 text-red-700' : isLow ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-slate-100 text-slate-600'
            }`}>
            <Clock size={16} />
            <span className="font-bold tabular-nums w-12">{formatTime(time)}</span>
            <button
                onClick={toggle}
                className={`font-bold px-2 py-0.5 rounded transition-colors ${isRunning ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-primary-500 text-white hover:bg-primary-600'
                    }`}
            >
                {isRunning ? 'PAUSA' : 'START'}
            </button>
            <button onClick={reset} className="text-slate-400 hover:text-slate-600 transition-colors">↺</button>
        </div>
    );
};

// --- HELPER: SORTING WITH TIE-BREAKER (STABLE) ---
const sortCandidates = (list, profileKey) => {
    return [...list].sort((a, b) => {
        if (profileKey === 'geral') {
            const diffGeral = b.profiles.geral - a.profiles.geral;
            if (Math.abs(diffGeral) > PRACTICAL_EPSILON) return diffGeral;
            return a.name.localeCompare(b.name);
        }

        const scoreA = a.profiles[profileKey];
        const scoreB = b.profiles[profileKey];
        const diff = Math.abs(scoreA - scoreB);

        if (diff < 0.2) {
            const scoreGeralA = a.profiles.geral;
            const scoreGeralB = b.profiles.geral;
            if (Math.abs(scoreGeralA - scoreGeralB) > PRACTICAL_EPSILON) {
                return scoreGeralB - scoreGeralA;
            }
            if (Math.abs(scoreA - scoreB) > PRACTICAL_EPSILON) {
                return scoreB - scoreA;
            }
            return a.name.localeCompare(b.name);
        }

        return scoreB - scoreA;
    });
};

// --- MAIN APP COMPONENT ---

export default function App() {
    const [view, setView] = useState('setup');
    const [project, setProject] = useState({ name: 'PJ 25/26 Literacia Financeira', school: '', strategy: 'PRIORITIZE_PROFILES' });
    const [candidates, setCandidates] = useState(INITIAL_CANDIDATES);
    const [currentCandidateId, setCurrentCandidateId] = useState(null);
    const [finalOrder, setFinalOrder] = useState([]);

    // --- PERSISTENCE: LOAD ---
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);

                if (data.version !== DATA_VERSION) {
                    console.warn("Versão de dados antiga detetada. Reset efetuado.");
                    localStorage.removeItem(STORAGE_KEY);
                    return;
                }

                let loadedCandidates = data.candidates;
                if (!Array.isArray(loadedCandidates) || loadedCandidates.length !== 10) {
                    loadedCandidates = INITIAL_CANDIDATES;
                } else {
                    loadedCandidates = loadedCandidates.map((c, idx) => ({
                        id: c.id || `c-${idx}`,
                        name: c.name || 'Sem Nome',
                        scores: c.scores || {},
                        notes: c.notes || '',
                        status: c.status || 'pending'
                    }));
                }

                setProject(prev => ({ ...prev, ...(data.project || {}) }));

                let loadedFinalOrder = data.finalOrder || [];
                const validIds = new Set(loadedCandidates.map(c => c.id));
                const orderIds = new Set(loadedFinalOrder.map(item => item.id));

                const isOrderValid = Array.isArray(loadedFinalOrder) &&
                    loadedFinalOrder.length === 10 &&
                    loadedFinalOrder.every(item => item.id && validIds.has(item.id)) &&
                    orderIds.size === 10;

                if (!isOrderValid) {
                    loadedFinalOrder = [];
                }

                setCandidates(loadedCandidates);
                setFinalOrder(loadedFinalOrder);
            }
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
        }
    }, []);

    // --- PERSISTENCE: SAVE ---
    useEffect(() => {
        try {
            const payload = {
                version: DATA_VERSION,
                project,
                candidates,
                finalOrder
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (error) {
            // Silent fail
        }
    }, [project, candidates, finalOrder]);

    // --- LOGIC ---

    const handleReset = () => {
        if (window.confirm("ATENÇÃO: Isto vai apagar todos os dados, nomes e notas. Tem a certeza?")) {
            localStorage.removeItem(STORAGE_KEY);
            window.location.reload();
        }
    };

    const updateCandidate = (id, field, value) => {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const calculateSubScores = (scores) => {
        const get = (id) => scores[id] || 0;
        return {
            // Principal (clareza + liderança): Perguntas 1-3
            principal: (get(1) + get(2) + get(3)) / 3,
            // Debate (ataque/defesa): Perguntas 4-7
            debate: (get(4) + get(5) + get(6) + get(7)) / 4,
            // Support (execução, escrita, organização): Perguntas 8-10
            support: (get(8) + get(9) + get(10)) / 3
        };
    };

    const calculateProfileScores = (sub) => {
        return {
            // Porta-voz: precisa brilhar em Principal (clareza) + algum Debate
            portavoz: (sub.principal * 0.60) + (sub.debate * 0.30) + (sub.support * 0.10),
            // Debatedor: precisa dominar Debate (especialmente Q6 e Q7) + Principal
            debatedor: (sub.debate * 0.60) + (sub.principal * 0.30) + (sub.support * 0.10),
            // Técnico: Debate + Support (precisa saber defender e executar)
            tecnico: (sub.debate * 0.40) + (sub.support * 0.40) + (sub.principal * 0.20),
            // Redator: precisa ser impecável em Support (escrita/plano)
            redator: (sub.support * 0.60) + (sub.principal * 0.25) + (sub.debate * 0.15),
            // Organização: Support forte + capacidade de comunicar
            organizacao: (sub.support * 0.55) + (sub.principal * 0.30) + (sub.debate * 0.15),
            // Score geral: média ponderada das 3 categorias
            geral: (sub.principal + sub.debate + sub.support) / 3
        };
    };

    const getRankings = useMemo(() => {
        return candidates.map(c => {
            const sub = calculateSubScores(c.scores);
            const profiles = calculateProfileScores(sub);
            return { ...c, sub, profiles };
        });
    }, [candidates]);

    const generateAutoSuggestion = () => {
        let pool = [...getRankings].filter(c => c.status === 'done');

        if (pool.length !== 10) {
            alert(`Erro: O dataset está incompleto. Tem ${pool.length} entrevistas completas, mas são necessárias exatamente 10.`);
            return;
        }

        let suggestionRefs = [];

        const takeBest = (profileKey) => {
            if (pool.length === 0) return null;
            pool = sortCandidates(pool, profileKey);
            const best = pool[0];
            pool = pool.slice(1);
            return { id: best.id, roleAssigned: profileKey };
        };

        const roles = ['portavoz', 'debatedor', 'tecnico', 'redator', 'organizacao'];
        roles.forEach(role => {
            const c = takeBest(role);
            if (c) suggestionRefs.push(c);
        });

        pool = sortCandidates(pool, 'geral');
        const rest = pool.map(c => ({ id: c.id, roleAssigned: 'suplente' }));

        suggestionRefs = [...suggestionRefs, ...rest];

        setFinalOrder(suggestionRefs);
        setView('final');
    };

    const validateFinalOrder = (list) => {
        const errors = [];
        if (list.length !== 10) {
            errors.push("A lista final tem de ter exatamente 10 candidatos.");
        }
        return errors;
    };

    // --- VIEWS ---

    const SetupView = () => {
        const names = candidates.map(c => c.name.trim());
        const namesFilled = names.every(n => n.length > 0);

        const nameCounts = names.reduce((acc, name) => {
            const lower = name.toLowerCase();
            if (lower) acc[lower] = (acc[lower] || 0) + 1;
            return acc;
        }, {});
        const hasDuplicates = Object.values(nameCounts).some(count => count > 1);
        const hasDefaultNames = candidates.some(c => /^Candidato \d+$/.test(c.name.trim()));
        const isSetupValid = namesFilled && !hasDuplicates && !hasDefaultNames;

        return (
            <div className="p-6 max-w-4xl mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <Sparkles className="text-white" size={24} />
                            </div>
                            Criar Projeto PJ
                        </h2>
                        <p className="text-slate-400 mt-2">Configure o projeto e adicione os candidatos</p>
                    </div>
                    <button
                        onClick={handleReset}
                        className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2 border border-red-500/30 px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-all"
                    >
                        <Trash2 size={16} /> Reset
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="glass-card rounded-2xl p-5">
                        <label className="block text-sm font-medium text-slate-600 mb-2">Nome do Projeto</label>
                        <input
                            value={project.name}
                            onChange={(e) => setProject({ ...project, name: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none"
                            placeholder="Ex: PJ 25/26 - Literacia"
                        />
                    </div>
                    <div className="glass-card rounded-2xl p-5">
                        <label className="block text-sm font-medium text-slate-600 mb-2">Escola / Turma</label>
                        <input
                            value={project.school}
                            onChange={(e) => setProject({ ...project, school: e.target.value })}
                            className="w-full p-3 border border-slate-200 rounded-xl bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all outline-none"
                            placeholder="Ex: 12º B"
                        />
                    </div>
                </div>

                <div className="glass-card rounded-2xl p-6 mb-8">
                    <h3 className="text-lg font-bold mb-1 text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-primary-500" />
                        Os 10 Candidatos
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">Insira os nomes reais dos alunos (evite duplicados e nomes padrão).</p>

                    <div className="space-y-2">
                        {candidates.map((c, idx) => {
                            const currentName = c.name.trim();
                            const isDuplicate = nameCounts[currentName.toLowerCase()] > 1;
                            const isDefault = /^Candidato \d+$/.test(currentName);
                            const hasError = isDuplicate || isDefault;

                            return (
                                <div
                                    key={c.id}
                                    className={`flex items-center gap-4 p-3 rounded-xl transition-all ${hasError ? 'bg-red-50 border border-red-200' : 'bg-slate-50 hover:bg-slate-100'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${hasError ? 'bg-red-200 text-red-700' : 'bg-primary-100 text-primary-700'
                                        }`}>
                                        {idx + 1}
                                    </div>
                                    <input
                                        value={c.name}
                                        onChange={(e) => updateCandidate(c.id, 'name', e.target.value)}
                                        className={`flex-1 bg-transparent p-2 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary-500/50 outline-none transition-all ${hasError ? 'text-red-600 font-medium' : ''
                                            }`}
                                        placeholder="Nome do aluno"
                                    />
                                    {hasError && (
                                        <span className="text-xs font-bold text-red-500 bg-red-100 px-2 py-1 rounded-full">
                                            {isDuplicate ? "Duplicado" : "Editar"}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    <div>
                        {(hasDuplicates || hasDefaultNames) && (
                            <div className="text-red-400 text-sm font-medium flex flex-col gap-1">
                                {hasDuplicates && (
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle size={16} /> Existem nomes duplicados.
                                    </span>
                                )}
                                {hasDefaultNames && (
                                    <span className="flex items-center gap-2">
                                        <AlertTriangle size={16} /> Substitua os nomes padrão (Candidato X).
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setView('list')}
                        disabled={!isSetupValid}
                        className="btn-primary flex items-center gap-2"
                    >
                        Avançar para Candidatos <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const ListView = () => {
        const doneCount = candidates.filter(c => c.status === 'done').length;

        return (
            <div className="p-6 max-w-4xl mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30">
                                <ClipboardCheck className="text-white" size={24} />
                            </div>
                            Candidatos
                        </h2>
                        <p className="text-slate-400 mt-2">Realize e avalie as entrevistas</p>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-white">{doneCount}<span className="text-slate-500">/10</span></div>
                        <div className="text-sm text-slate-400">Entrevistados</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="glass-card rounded-2xl p-4 mb-6">
                    <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full gradient-primary rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${(doneCount / 10) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {candidates.map((c, idx) => (
                        <div
                            key={c.id}
                            className={`glass-card rounded-2xl p-5 card-hover flex justify-between items-center border-l-4 ${c.status === 'done' ? 'border-l-emerald-500' : 'border-l-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${c.status === 'done'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div>
                                    <div className="font-bold text-lg text-slate-800">{c.name}</div>
                                    {c.status === 'done' && (
                                        <span className="text-xs text-emerald-600 font-medium flex items-center gap-1 mt-0.5">
                                            <CheckCircle size={12} /> Concluído
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => { setCurrentCandidateId(c.id); setView('interview'); }}
                                className={c.status === 'done'
                                    ? 'btn-ghost text-slate-600'
                                    : 'btn-primary py-2 px-4'
                                }
                            >
                                {c.status === 'done' ? 'Rever' : 'Iniciar'}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-between border-t border-white/10 pt-6">
                    <button onClick={() => setView('setup')} className="btn-ghost">← Voltar</button>
                    <button
                        onClick={() => setView('results')}
                        disabled={doneCount === 0}
                        className="btn-primary flex items-center gap-2"
                    >
                        <BarChart3 size={18} /> Ver Resultados
                    </button>
                </div>
            </div>
        );
    };

    const InterviewView = () => {
        const candidate = candidates.find(c => c.id === currentCandidateId);
        if (!candidate) return null;

        const scores = candidate.scores || {};
        const isComplete = QUESTIONS.every(q => scores[q.id] !== undefined);
        const answeredCount = Object.keys(scores).length;

        const handleScore = (qId, val) => {
            const newScores = { ...scores, [qId]: val };
            updateCandidate(candidate.id, 'scores', newScores);
        };

        const handleSave = () => {
            updateCandidate(candidate.id, 'status', 'done');
            setView('list');
        };

        return (
            <div className="p-4 max-w-3xl mx-auto pb-28 animate-fade-in">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 -mx-4 px-4 py-4 bg-gradient-to-b from-slate-900 via-slate-900/95 to-transparent">
                    <div className="glass-card rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">{candidate.name}</h2>
                            <p className="text-sm text-slate-500">Entrevista em curso</p>
                        </div>
                        <button onClick={() => setView('list')} className="btn-ghost text-slate-500">
                            Cancelar
                        </button>
                    </div>
                </div>

                <div className="space-y-4 mt-4">
                    {QUESTIONS.map((q) => (
                        <div
                            key={q.id}
                            className={`glass-card rounded-2xl p-5 transition-all duration-300 ${scores[q.id] !== undefined ? 'border-l-4 border-l-primary-500' : ''
                                }`}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <span className={getBadgeClass(q.type)}>
                                    {q.type}
                                </span>
                                {q.time > 0 && <Stopwatch defaultTime={q.time} />}
                            </div>
                            <h3 className="font-medium text-lg mb-4 text-slate-800">{q.id}. {q.text}</h3>

                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                                <div className="flex gap-2">
                                    {[0, 1, 2, 3, 4].map((val) => (
                                        <button
                                            key={val}
                                            onClick={() => handleScore(q.id, val)}
                                            className={`score-btn ${scores[q.id] === val ? 'score-btn-active' : 'score-btn-inactive'
                                                }`}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                                {scores[q.id] !== undefined && (
                                    <span className="text-sm text-slate-500 italic">
                                        {RUBRIC[scores[q.id]]}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="glass-card rounded-2xl p-5">
                        <h3 className="font-medium text-slate-800 mb-2">Observações Gerais</h3>
                        <textarea
                            className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white/50 focus:bg-white focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all resize-none"
                            rows="3"
                            value={candidate.notes}
                            onChange={(e) => updateCandidate(candidate.id, 'notes', e.target.value)}
                            placeholder="Notas sobre postura, dicção, etc..."
                        />
                    </div>
                </div>

                {/* Fixed Bottom Bar */}
                <div className="fixed bottom-0 left-0 right-0 z-30 p-4">
                    <div className="max-w-3xl mx-auto glass-card rounded-2xl p-4 flex justify-between items-center shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary-500/30">
                                {answeredCount}
                            </div>
                            <div className="text-sm text-slate-500">
                                <span className="text-slate-800 font-medium">{answeredCount}</span> / 10 respondidas
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={!isComplete}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Save size={18} /> Guardar Entrevista
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const ResultsView = () => {
        const ranked = getRankings.filter(c => c.status === 'done');
        const doneCount = ranked.length;

        const profiles = [
            { key: 'portavoz', label: 'Porta-voz', color: 'from-blue-500 to-cyan-500' },
            { key: 'debatedor', label: 'Debatedor', color: 'from-orange-500 to-amber-500' },
            { key: 'tecnico', label: 'Técnico', color: 'from-emerald-500 to-green-500' },
            { key: 'redator', label: 'Redator', color: 'from-purple-500 to-violet-500' },
            { key: 'organizacao', label: 'Organização', color: 'from-pink-500 to-rose-500' },
            { key: 'geral', label: 'Score Geral', color: 'from-primary-500 to-accent-500' }
        ];

        if (doneCount === 0) return (
            <div className="p-6 text-center">
                <p className="text-slate-400">Sem dados. Complete entrevistas.</p>
                <button onClick={() => setView('list')} className="btn-primary mt-4">Voltar</button>
            </div>
        );

        return (
            <div className="p-6 max-w-6xl mx-auto animate-fade-in">
                <div className="flex justify-between items-center mb-8 no-print">
                    <div>
                        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 animate-float">
                                <BarChart3 className="text-white" size={24} />
                            </div>
                            Rankings por Perfil
                        </h2>
                        <p className="text-slate-400 mt-2">
                            Estratégia: <span className="text-primary-400">{STRATEGY_LABELS[project.strategy] || project.strategy}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2">
                            <Printer size={18} /> PDF
                        </button>
                        <button onClick={() => setView('list')} className="btn-ghost">Voltar</button>

                        {doneCount === 10 ? (
                            <button
                                onClick={generateAutoSuggestion}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Award size={18} /> Gerar Ordem Final
                            </button>
                        ) : (
                            <button
                                disabled
                                className="btn-primary opacity-50 cursor-not-allowed flex items-center gap-2"
                                title="Necessário ter exatamente 10 entrevistas completas"
                            >
                                <Lock size={16} /> Faltam {10 - doneCount}
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {profiles.map(p => {
                        const sorted = sortCandidates(ranked, p.key);
                        const top1 = sorted[0];
                        const top2 = sorted[1];
                        const isTie = top1 && top2 && (Math.abs(top1.profiles[p.key] - top2.profiles[p.key]) < 0.2);

                        return (
                            <div key={p.key} className="glass-card rounded-2xl p-5 card-hover relative overflow-hidden">
                                {/* Header Gradient Bar */}
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${p.color}`} />

                                <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider mb-4">{p.label}</h3>

                                {isTie && (
                                    <div className="absolute top-3 right-3 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full">
                                        EMPATE
                                    </div>
                                )}

                                {top1 && (
                                    <div className="mb-4">
                                        <div className="text-xs font-bold text-amber-500 uppercase mb-1">1ª Opção</div>
                                        <div className="text-2xl font-bold text-slate-800">{top1.name}</div>
                                        <div className="text-sm text-slate-500">Score: <span className="font-bold text-primary-600">{top1.profiles[p.key].toFixed(2)}</span></div>
                                    </div>
                                )}
                                {top2 && (
                                    <div className="pt-3 border-t border-dashed border-slate-200">
                                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Suplente</div>
                                        <div className="text-md text-slate-700">{top2.name}</div>
                                        <div className="text-xs text-slate-500">Score: {top2.profiles[p.key].toFixed(2)}</div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Full Table */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                            <tr>
                                <th className="px-5 py-4">Candidato</th>
                                <th className="px-5 py-4 text-center">P.Voz</th>
                                <th className="px-5 py-4 text-center">Debate</th>
                                <th className="px-5 py-4 text-center">Técnico</th>
                                <th className="px-5 py-4 text-center">Redator</th>
                                <th className="px-5 py-4 text-center">Org</th>
                                <th className="px-5 py-4 text-center font-bold text-primary-600">Geral</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ranked.map(c => (
                                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="px-5 py-3 font-medium">{c.name}</td>
                                    <td className="px-5 py-3 text-center">{c.profiles.portavoz.toFixed(1)}</td>
                                    <td className="px-5 py-3 text-center">{c.profiles.debatedor.toFixed(1)}</td>
                                    <td className="px-5 py-3 text-center">{c.profiles.tecnico.toFixed(1)}</td>
                                    <td className="px-5 py-3 text-center">{c.profiles.redator.toFixed(1)}</td>
                                    <td className="px-5 py-3 text-center">{c.profiles.organizacao.toFixed(1)}</td>
                                    <td className="px-5 py-3 text-center font-bold text-primary-600">{c.profiles.geral.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const FinalOrderView = () => {
        const rankings = getRankings;
        const hydratedOrder = finalOrder.map(item => {
            const candidate = rankings.find(c => c.id === item.id);
            return candidate ? { ...candidate, roleAssigned: item.roleAssigned } : null;
        }).filter(Boolean);

        const errors = validateFinalOrder(hydratedOrder);

        const move = (idx, dir) => {
            const newOrder = [...finalOrder];
            if (dir === -1 && idx > 0) {
                [newOrder[idx], newOrder[idx - 1]] = [newOrder[idx - 1], newOrder[idx]];
            } else if (dir === 1 && idx < newOrder.length - 1) {
                [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
            }
            setFinalOrder(newOrder);
        };

        const getRoleColor = (role) => {
            const colors = {
                'portavoz': 'from-blue-500 to-cyan-500',
                'debatedor': 'from-orange-500 to-amber-500',
                'tecnico': 'from-emerald-500 to-green-500',
                'redator': 'from-purple-500 to-violet-500',
                'organizacao': 'from-pink-500 to-rose-500',
                'suplente': 'from-slate-400 to-slate-500'
            };
            return colors[role] || colors.suplente;
        };

        return (
            <div className="p-6 max-w-4xl mx-auto animate-fade-in">
                <div className="mb-8 no-print">
                    <button onClick={() => setView('results')} className="btn-ghost mb-4">← Voltar aos Resultados</button>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 animate-pulse-glow">
                            <Award className="text-white" size={24} />
                        </div>
                        Ordem Final da Lista
                    </h2>
                    <p className="text-slate-400 mt-2">{project.name} • {project.school}</p>
                </div>

                {errors.length > 0 ? (
                    <div className="glass-card rounded-2xl p-5 mb-6 border-l-4 border-l-red-500 bg-red-50">
                        <h3 className="font-bold text-red-800 flex items-center mb-2">
                            <AlertTriangle className="mr-2" size={20} /> Lista Inválida
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                            {errors.map((err, i) => (
                                <li key={i} className="text-red-700 text-sm">{err}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="glass-card rounded-2xl p-5 mb-6 border-l-4 border-l-emerald-500 bg-emerald-50 flex items-center">
                        <CheckCircle className="text-emerald-600 mr-3" />
                        <div className="text-emerald-800 font-bold">Lista válida! 10 Candidatos definidos.</div>
                    </div>
                )}

                <div className="glass-card rounded-2xl overflow-hidden">
                    {hydratedOrder.map((c, idx) => (
                        <div
                            key={c.id}
                            className={`flex items-center p-4 border-b border-slate-100 last:border-b-0 transition-colors ${idx < 5 ? 'bg-white' : 'bg-slate-50'
                                }`}
                        >
                            <div className={`w-10 h-10 rounded-full font-bold text-white flex items-center justify-center bg-gradient-to-br ${idx < 3 ? 'from-amber-400 to-orange-500 shadow-lg shadow-orange-500/30' : 'from-slate-400 to-slate-500'
                                }`}>
                                {idx + 1}
                            </div>

                            <div className="flex-1 ml-4">
                                <div className="font-bold text-lg text-slate-800">{c.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full text-white bg-gradient-to-r ${getRoleColor(c.roleAssigned)}`}>
                                        {c.roleAssigned === 'suplente' ? 'Geral' : c.roleAssigned}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Score: <span className="font-bold">{c.profiles.geral.toFixed(2)}</span>
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 no-print">
                                <button
                                    onClick={() => move(idx, -1)}
                                    disabled={idx === 0}
                                    className="p-1.5 hover:bg-slate-200 rounded-lg disabled:opacity-20 transition-colors"
                                >
                                    <ArrowUp size={16} />
                                </button>
                                <button
                                    onClick={() => move(idx, 1)}
                                    disabled={idx === hydratedOrder.length - 1}
                                    className="p-1.5 hover:bg-slate-200 rounded-lg disabled:opacity-20 transition-colors"
                                >
                                    <ArrowDown size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center no-print">
                    {errors.length === 0 ? (
                        <p className="text-sm text-slate-400 mb-4">A lista está validada e pronta para exportação.</p>
                    ) : (
                        <p className="text-sm text-red-400 mb-4 font-bold">Ação bloqueada: lista inválida.</p>
                    )}

                    <button
                        onClick={() => window.print()}
                        disabled={errors.length > 0}
                        className="btn-primary mx-auto flex items-center gap-2"
                    >
                        <Printer size={20} /> Imprimir / Guardar PDF
                    </button>
                </div>
            </div>
        );
    };

    // --- RENDER ---
    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 no-print">
                <div className="gradient-dark border-b border-white/10 backdrop-blur-xl">
                    <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                        <h1 className="text-xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/30 animate-float">
                                <Award className="text-white" size={20} />
                            </div>
                            Gestor Parlamento
                        </h1>
                        <nav className="flex gap-1">
                            <button
                                onClick={() => setView('setup')}
                                className={`nav-link ${view === 'setup' ? 'nav-link-active' : 'nav-link-inactive'}`}
                            >
                                Projeto
                            </button>
                            <button
                                onClick={() => setView('list')}
                                className={`nav-link ${view === 'list' || view === 'interview' ? 'nav-link-active' : 'nav-link-inactive'}`}
                            >
                                Entrevistas
                            </button>
                            <button
                                onClick={() => setView('results')}
                                className={`nav-link ${view === 'results' || view === 'final' ? 'nav-link-active' : 'nav-link-inactive'}`}
                            >
                                Resultados
                            </button>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="pb-20">
                {view === 'setup' && <SetupView />}
                {view === 'list' && <ListView />}
                {view === 'interview' && <InterviewView />}
                {view === 'results' && <ResultsView />}
                {view === 'final' && <FinalOrderView />}
            </main>
        </div>
    );
}

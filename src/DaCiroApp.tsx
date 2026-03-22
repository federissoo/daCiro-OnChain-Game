import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi';
import { formatEther, isAddress, parseEther, type Hex } from 'viem';

/* ═══════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════ */
type GameState = 'IDLE' | 'PAYING' | 'PLAYING' | 'EXPLODING' | 'WIN' | 'LOSE' | 'ERROR';

interface ChatMessage {
    sender: 'player' | 'ciro';
    text: string;
    id: number;
}

const TRANSLATIONS = {
    it: {
        welcome: [
            "Benvenuto da Ciro! Cosa vuoi? E non mi parlare di ananas, per carità di Dio!",
            "Jamme, cosa ordini? La margherita è la più bella del mondo. E non azzardarti a chiedere l'ananas!",
            "Madonna mia, un altro cliente! Speriamo che non sia uno di quelli che vuole rovinare la pizza...",
        ],
        subtitle: "Convincilo a mettere l'ananas sulla pizza. Se ci riesci, vinci tutto.",
        vaultTitle: "Tesoro del Vault",
        connectBtn: "Connect Wallet",
        enterBtn: "Entra da Ciro — 0.001 ETH",
        enteringBtn: "Entrando...",
        surrenderLevel: "Livello di Cedimento",
        ordersTitle: "🍕 Ordini",
        lastSeconds: "⚠️ Ultimi secondi!",
        convinceHim: "Convinci Ciro...",
        tryToConvince: "Prova a convincerlo...",
        waitMessage: "Prova a convincerlo...",
        sendBtn: "MANDA",
        heresyTitle: "ERESIA COMPIUTA! 🍕🍍",
        cavedDesc: "Ciro ha ceduto. L'ananas è sulla margherita. La tradizione napoletana non sarà mai più la stessa.",
        loot: "Bottino",
        claimBtn: "Riscuoti",
        shareBtn: "Condividi",
        homeBtn: "Torna alla Home",
        timeUp: "TEMPO SCADUTO! ⏰",
        resistedDesc1: "Ciro ha resistito! La pizza è salva. 🍕",
        resistedDesc2: "\"L'ananas non entra in questa pizzeria!\"",
        finalSurrender: "Cedimento finale:",
        retryBtn: "Riprova — 0.001 ETH",
        errConnectWallet: "Connetti il wallet prima",
        errServer: "Errore di connessione al server.",
        errWrongNetwork: "Rete sbagliata. Passa a Base Sepolia.",
        errInsufficientFunds: "Fondi insufficienti per pagare la fee.",
        errTxRejected: "Transazione rifiutata.",
        claimingBtn: "Riscossione...",
        tweet: "Ho convinto Ciro a mettere l'ananas sulla pizza! 🍍🍕 Ho vinto"
    },
    en: {
        welcome: [
            "Welcome to Ciro's! What do you want? And don't mention pineapple, for the love of God!",
            "Come on, what are you ordering? The margherita is the best in the world. Don't you dare ask for pineapple!",
            "Mamma mia, another customer! Let's hope it's not one who wants to ruin pizza...",
        ],
        subtitle: "Convince him to put pineapple on pizza. If you succeed, you win everything.",
        vaultTitle: "Vault Treasure",
        connectBtn: "Connect Wallet",
        enterBtn: "Enter Ciro's — 0.001 ETH",
        enteringBtn: "Entering...",
        surrenderLevel: "Surrender Level",
        ordersTitle: "🍕 Orders",
        lastSeconds: "⚠️ Last seconds!",
        convinceHim: "Convince Ciro...",
        tryToConvince: "Try to convince him...",
        waitMessage: "Try to convince him...",
        sendBtn: "SEND",
        heresyTitle: "HERESY ACCOMPLISHED! 🍕🍍",
        cavedDesc: "Ciro caved. Pineapple is on the margherita. Neapolitan tradition will never be the same.",
        loot: "Loot",
        claimBtn: "Claim",
        shareBtn: "Share",
        homeBtn: "Back to Home",
        timeUp: "TIME'S UP! ⏰",
        resistedDesc1: "Ciro resisted! The pizza is safe. 🍕",
        resistedDesc2: "\"Pineapple does not enter this pizzeria!\"",
        finalSurrender: "Final surrender:",
        retryBtn: "Try Again — 0.001 ETH",
        errConnectWallet: "Connect wallet first",
        errServer: "Connection error to the server.",
        errWrongNetwork: "Wrong network. Switch to Base Sepolia.",
        errInsufficientFunds: "Insufficient funds to pay the fee.",
        errTxRejected: "Transaction rejected.",
        claimingBtn: "Claiming...",
        tweet: "I convinced Ciro to put pineapple on pizza! 🍍🍕 I won"
    }
};

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '0xC52A0c121896b468f78C77a6CEEFe30C195dd523';
const REQUIRED_CHAIN_ID = Number(import.meta.env.VITE_BASE_SEPOLIA_CHAIN_ID || '84532');
const SIMPLE_VAULT_ABI = [
    { type: 'function', name: 'startSession', stateMutability: 'payable', inputs: [], outputs: [] },
    { type: 'function', name: 'claimVault', stateMutability: 'nonpayable', inputs: [{ name: 'sessionId', type: 'string' }, { name: 'signature', type: 'bytes' }], outputs: [] },
    { type: 'function', name: 'getCurrentFee', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { type: 'function', name: 'vaultBalance', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

/* ═══════════════════════════════════════════════════
   CIRO CHARACTER SVG
   ═══════════════════════════════════════════════════ */
function CiroCharacter({ surrender, state, size = 200 }: { surrender: number; state: GameState; size?: number }) {
    const isVacillating = surrender >= 70;
    const isCaving = surrender >= 90;

    // Skin tone – stays warm throughout
    const skinColor = '#F4C392';
    const chefHatColor = '#FFFDF5';
    const apronColor = '#FFFDF5';
    const mustacheColor = '#3A2010';

    // Expression: normal → distressed → caving
    const eyebrowOffset = surrender < 30 ? 0 : surrender < 70 ? -4 : -8;
    const mouthType = surrender < 50 ? 'frown' : surrender < 80 ? 'grimace' : 'open';

    let animClass = '';
    if (state === 'EXPLODING') animClass = '';
    else if (isVacillating && state === 'PLAYING') animClass = 'ciro-headgrip';
    else if (state === 'LOSE') animClass = 'ciro-proud';
    else animClass = 'ciro-idle';

    if (state === 'EXPLODING') {
        // Ciro collapses — show pineapple
        return (
            <div style={{ width: size, height: size * 1.65, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: size * 0.6, textAlign: 'center', animation: 'pineapple-drop 0.6s ease-out forwards' }}>🍍</div>
                <div style={{ position: 'absolute', bottom: 0, fontSize: size * 0.25, textAlign: 'center', width: '100%', color: '#CC2200', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>Mamma mia...</div>
            </div>
        );
    }

    return (
        <div style={{ width: size, height: size * 1.65, position: 'relative' }} className={animClass}>
            <svg viewBox="0 0 160 265" width={size} height={size * 1.65}>
                <g transform="translate(0, 35)">

                    {/* Apron/body */}
                    <path d="M 35 160 C 25 175, 15 200, 10 225 L 150 225 C 145 200, 135 175, 125 160 Z" fill={apronColor} stroke="#C8B89A" strokeWidth="2" strokeLinejoin="round" />
                    {/* Tomato stains on apron */}
                    <circle cx="70" cy="190" r="8" fill="#CC2200" opacity="0.6" />
                    <circle cx="95" cy="205" r="5" fill="#CC2200" opacity="0.5" />
                    <circle cx="60" cy="210" r="3" fill="#CC2200" opacity="0.4" />
                    {/* Apron strings */}
                    <path d="M 62 162 L 55 145 L 50 130" fill="none" stroke="#C8B89A" strokeWidth="2" strokeLinecap="round" />
                    <path d="M 98 162 L 105 145 L 110 130" fill="none" stroke="#C8B89A" strokeWidth="2" strokeLinecap="round" />

                    {/* Neck */}
                    <path d="M 65 148 C 65 162, 95 162, 95 148 Z" fill={skinColor} stroke="#C8A070" strokeWidth="1.5" strokeLinejoin="round" />

                    {/* Shirt collar below apron */}
                    <path d="M 50 130 C 45 145, 40 158, 35 160 L 125 160 C 120 158, 115 145, 110 130 Z" fill="#2D6A6A" stroke="#1A4040" strokeWidth="2" strokeLinejoin="round" />

                    {/* Ears */}
                    <path d="M 38 78 C 18 72, 18 100, 38 106" fill={skinColor} stroke="#C8A070" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M 122 78 C 142 72, 142 100, 122 106" fill={skinColor} stroke="#C8A070" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M 34 86 C 26 88, 27 96, 30 98" fill="none" stroke="#C8A070" strokeWidth="1.5" strokeLinecap="round" />
                    <path d="M 126 86 C 134 88, 133 96, 130 98" fill="none" stroke="#C8A070" strokeWidth="1.5" strokeLinecap="round" />

                    {/* Main head - plump and round */}
                    <path d="M 42 55 Q 48 20, 80 18 Q 112 20, 118 55 Q 128 92, 122 120 Q 118 148, 80 148 Q 42 148, 38 120 Q 32 92, 42 55 Z" fill={skinColor} stroke="#C8A070" strokeWidth="3" strokeLinejoin="round" />

                    {/* Forehead wrinkles – more prominent when distressed */}
                    <path d="M 55 50 Q 80 47, 105 52" fill="none" stroke="#C8A070" strokeWidth={surrender >= 30 ? 2 : 1} opacity={surrender >= 20 ? 1 : 0.4} />
                    {surrender >= 40 && <path d="M 58 57 Q 80 54, 102 59" fill="none" stroke="#C8A070" strokeWidth="1.5" />}
                    {surrender >= 65 && <path d="M 52 44 Q 80 40, 108 46" fill="none" stroke="#C8A070" strokeWidth="1.5" />}

                    {/* CHEF HAT */}
                    <rect x="42" y="20" width="76" height="10" rx="3" fill="#E8E0D0" stroke="#C8B89A" strokeWidth="2" />
                    <path d="M 48 20 C 40 20, 35 0, 45 -2 C 50 -15, 58 -20, 65 -15 C 68 -28, 92 -28, 95 -15 C 102 -20, 110 -15, 115 -2 C 125 0, 120 20, 112 20 Z" fill={chefHatColor} stroke="#C8B89A" strokeWidth="2" />
                    {/* Hat texture lines */}
                    <path d="M 65 3 Q 68 -12, 72 -18" fill="none" stroke="#C8B89A" strokeWidth="1" opacity="0.5" />
                    <path d="M 80 0 Q 80 -18, 80 -22" fill="none" stroke="#C8B89A" strokeWidth="1" opacity="0.5" />
                    <path d="M 95 3 Q 92 -12, 88 -18" fill="none" stroke="#C8B89A" strokeWidth="1" opacity="0.5" />

                    {/* Eyebrows */}
                    <path
                        d={`M 42 ${65 + eyebrowOffset} C 56 ${60 + eyebrowOffset}, 64 ${63 + eyebrowOffset}, 72 ${68 + eyebrowOffset}`}
                        fill="none" stroke={mustacheColor} strokeWidth="5" strokeLinecap="round"
                    />
                    <path
                        d={`M 118 ${65 + eyebrowOffset} C 104 ${60 + eyebrowOffset}, 96 ${63 + eyebrowOffset}, 88 ${68 + eyebrowOffset}`}
                        fill="none" stroke={mustacheColor} strokeWidth="5" strokeLinecap="round"
                    />

                    {/* Eyes */}
                    <ellipse cx="57" cy="78" rx="10" ry={surrender >= 70 ? 8 : 10} fill="white" stroke="#3A2010" strokeWidth="2" />
                    <ellipse cx="103" cy="78" rx="10" ry={surrender >= 70 ? 8 : 10} fill="white" stroke="#3A2010" strokeWidth="2" />
                    {/* Pupils – shocked when surrendering */}
                    <circle cx={surrender >= 60 ? 55 : 57} cy={surrender >= 60 ? 76 : 79} r={surrender >= 80 ? 3 : 5} fill="#3A2010" />
                    <circle cx={surrender >= 60 ? 105 : 103} cy={surrender >= 60 ? 76 : 79} r={surrender >= 80 ? 3 : 5} fill="#3A2010" />
                    {/* Tear drops when caving */}
                    {isCaving && (
                        <>
                            <path d="M 52 88 Q 50 94, 52 98" fill="none" stroke="#88AACC" strokeWidth="2" strokeLinecap="round" />
                            <path d="M 108 88 Q 110 94, 108 98" fill="none" stroke="#88AACC" strokeWidth="2" strokeLinecap="round" />
                        </>
                    )}

                    {/* Bulbous nose */}
                    <path d="M 70 88 C 58 114, 66 130, 80 130 C 94 130, 102 114, 90 88 Z" fill={skinColor} stroke="#C8A070" strokeWidth="2.5" strokeLinejoin="round" />
                    <circle cx="70" cy="122" r="5" fill={skinColor} stroke="#C8A070" strokeWidth="1.5" />
                    <circle cx="90" cy="122" r="5" fill={skinColor} stroke="#C8A070" strokeWidth="1.5" />

                    {/* Big thick Neapolitan mustache */}
                    <path d="M 50 132 C 60 128, 72 132, 80 130 C 88 132, 100 128, 110 132 C 105 140, 95 136, 80 138 C 65 136, 55 140, 50 132 Z" fill={mustacheColor} stroke={mustacheColor} strokeWidth="1" strokeLinejoin="round" />
                    {/* Mustache highlight */}
                    <path d="M 56 131 Q 68 129, 80 131" fill="none" stroke="#5A3820" strokeWidth="1" opacity="0.5" />

                    {/* Mouth */}
                    {mouthType === 'frown' && (
                        <path d="M 58 140 Q 80 133, 102 140" fill="none" stroke="#3A2010" strokeWidth="3" strokeLinecap="round" />
                    )}
                    {mouthType === 'grimace' && (
                        <g>
                            <path d="M 60 138 Q 80 132, 100 138" fill="none" stroke="#3A2010" strokeWidth="3" strokeLinecap="round" />
                            <line x1="68" y1="134" x2="68" y2="140" stroke="#3A2010" strokeWidth="2" />
                            <line x1="80" y1="132" x2="80" y2="138" stroke="#3A2010" strokeWidth="2" />
                            <line x1="92" y1="134" x2="92" y2="140" stroke="#3A2010" strokeWidth="2" />
                        </g>
                    )}
                    {mouthType === 'open' && (
                        <g>
                            <path d="M 58 136 C 65 150, 95 150, 102 136 Z" fill="#3A1010" stroke="#3A2010" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M 63 148 C 70 142, 90 142, 97 148 C 93 154, 67 154, 63 148 Z" fill="#CC4444" />
                            <path d="M 60 137 L 72 142 L 88 142 L 100 137" fill="white" stroke="#3A2010" strokeWidth="1" strokeLinejoin="round" />
                        </g>
                    )}

                    {/* Hands gesturing – raised when talking */}
                    {state === 'PLAYING' && !isVacillating && (
                        <>
                            <path d="M 20 170 C 10 155, 18 140, 30 148 C 32 142, 40 145, 38 152 L 36 170 Z" fill={skinColor} stroke="#C8A070" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M 140 170 C 150 155, 142 140, 130 148 C 128 142, 120 145, 122 152 L 124 170 Z" fill={skinColor} stroke="#C8A070" strokeWidth="2" strokeLinejoin="round" />
                        </>
                    )}
                    {/* Hands on head when vacillating (70+) */}
                    {isVacillating && (
                        <>
                            <path d="M 25 55 C 15 45, 22 30, 38 38 C 40 32, 48 35, 46 42 L 44 55 Z" fill={skinColor} stroke="#C8A070" strokeWidth="2" strokeLinejoin="round" />
                            <path d="M 135 55 C 145 45, 138 30, 122 38 C 120 32, 112 35, 114 42 L 116 55 Z" fill={skinColor} stroke="#C8A070" strokeWidth="2" strokeLinejoin="round" />
                        </>
                    )}
                </g>
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   SURRENDER BAR (reversed – green = stubborn, red = caving)
   ═══════════════════════════════════════════════════ */
function SurrenderBar({ value, label = "Livello di Cedimento" }: { value: number; label?: string }) {
    const color = value < 25 ? '#2D6A2D' : value < 50 ? '#B8860B' : value < 75 ? '#CC6600' : '#CC2200';
    return (
        <div style={{ width: '100%' }}>
            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.72rem', fontWeight: 700, marginBottom: 5, textAlign: 'center', letterSpacing: 1.2, textTransform: 'uppercase', color: '#6B3A2A' }}>
                {label} — {Math.round(value)}%
            </div>
            <div style={{ width: '100%', height: 20, background: '#EEE0C8', border: '2px solid #8B5E3C', borderRadius: 10, overflow: 'hidden', boxShadow: '2px 2px 0 #8B5E3C' }}>
                {/* bar fills left = resistance; red overlay from right = surrender progress */}
                <motion.div
                    animate={{ width: `${value}%` }}
                    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                    style={{ height: '100%', backgroundColor: color, borderRadius: 8 }}
                />
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   CONFETTI PIZZA
   ═══════════════════════════════════════════════════ */
function Confetti() {
    const items = ['🍕', '🍍', '🎉', '⭐', '🍅', '🧀'];
    return (
        <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, i) => (
                <div key={i} className="confetti-piece" style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: 'transparent',
                    fontSize: 20 + Math.random() * 12,
                    animationDuration: `${2 + Math.random() * 3}s`,
                    animationDelay: `${Math.random() * 2}s`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 'auto', height: 'auto', borderRadius: 0,
                }}>
                    {items[i % items.length]}
                </div>
            ))}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════════ */
function TypingIndicator() {
    return (
        <div style={{ display: 'flex', gap: 6, padding: '8px 14px', alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#CC2200', border: '2px solid #8B3A2A', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍕</div>
            <div className="bubble-left" style={{ display: 'flex', gap: 5, background: '#FFF8E7', padding: '10px 16px', borderRadius: 12, border: '2px solid #8B5E3C', position: 'relative' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#CC2200', animation: 'typing-dot 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />)}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════ */
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
    return (
        <div style={{
            position: 'fixed', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            background: '#CC2200', color: 'white', padding: '12px 24px',
            borderRadius: '8px', border: '2px solid #8B1500',
            boxShadow: '4px 4px 0 #8B1500', fontFamily: 'Inter, sans-serif', fontWeight: 500,
            fontSize: '0.95rem', zIndex: 10000, animation: 'toast-slide 4s ease-in-out forwards',
        }}>
            {message}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════ */
export default function DaCiroApp() {
    const [lang, setLang] = useState<'it' | 'en'>('it');
    const t = TRANSLATIONS[lang];
    const [gameState, setGameState] = useState<GameState>('IDLE');
    const [surrender, setSurrender] = useState(0);
    const [timer, setTimer] = useState(90);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [msgId, setMsgId] = useState(0);
    const chatRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [isClaiming, setIsClaiming] = useState(false);

    const [sessionId, setSessionId] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const [ciroResponseBuffer, setCiroResponseBuffer] = useState<string>('');
    const ciroResponseBufferRef = useRef<string>('');
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync } = useSwitchChain();
    const { openConnectModal } = useConnectModal();
    const publicClient = usePublicClient({ chainId: REQUIRED_CHAIN_ID });
    const { writeContractAsync } = useWriteContract();
    const isWrongNetwork = isConnected && chainId !== REQUIRED_CHAIN_ID;

    const { data: currentFee = parseEther('0.00001'), refetch: refetchCurrentFee } = useReadContract({
        abi: SIMPLE_VAULT_ABI,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'getCurrentFee',
        chainId: REQUIRED_CHAIN_ID,
        query: { refetchInterval: 10_000 },
    });

    const { data: vaultBalance = 0n } = useReadContract({
        abi: SIMPLE_VAULT_ABI,
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: 'vaultBalance',
        chainId: REQUIRED_CHAIN_ID,
        query: { refetchInterval: 10_000 },
    });

    const vaultAmount = Number(formatEther(vaultBalance)).toFixed(5);
    const currentFeeEth = Number(formatEther(currentFee)).toFixed(5);

    useEffect(() => {
        if (gameState === 'PLAYING') {
            timerRef.current = setInterval(() => {
                setTimer(p => { if (p <= 1) { clearInterval(timerRef.current!); return 0; } return p - 1; });
            }, 1000);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [gameState]);

    useEffect(() => {
        if (timer === 0 && gameState === 'PLAYING') {
            setGameState('LOSE');
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        }
    }, [timer, gameState]);

    useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages, isTyping, ciroResponseBuffer]);
    useEffect(() => {
        if (gameState === 'PLAYING' && !isTyping && inputRef.current) {
            setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 10);
        }
    }, [gameState, isTyping]);

    const ensureCorrectNetwork = useCallback(async () => {
        if (!isWrongNetwork) return true;
        if (!switchChainAsync) return false;
        await switchChainAsync({ chainId: REQUIRED_CHAIN_ID });
        return true;
    }, [isWrongNetwork, switchChainAsync]);

    const startGame = useCallback(async () => {
        if (!address || !isConnected) { setToast(t.errConnectWallet); return; }
        setGameState('PAYING');

        try {
            if (!(await ensureCorrectNetwork())) {
                setToast(t.errWrongNetwork);
                setGameState('IDLE');
                return;
            }

            const feeResult = await refetchCurrentFee();
            const feeToPay = feeResult.data ?? currentFee;
            if (!publicClient) {
                setToast(t.errServer);
                setGameState('IDLE');
                return;
            }

            const txHash = await writeContractAsync({
                abi: SIMPLE_VAULT_ABI,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'startSession',
                value: feeToPay,
                chainId: REQUIRED_CHAIN_ID,
                account: address,
            });

            await publicClient.waitForTransactionReceipt({ hash: txHash });

            const res = await fetch("/session/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerName: address, lang, txHash })
            });
            if (!res.ok) {
                const errorPayload = await res.json().catch(() => ({ message: t.errServer }));
                throw new Error(errorPayload.message || t.errServer);
            }
            const data = await res.json();
            setSessionId(data.sessionId);

            const wsUrl = window.location.protocol === 'https:' ? `wss://${window.location.host}` : `ws://${window.location.host}`;
            const ws = new WebSocket(`${wsUrl}/session/${data.sessionId}/ws`);
            wsRef.current = ws;

            ws.onmessage = (event) => {
                const msg = JSON.parse(event.data);
                if (msg.type === "TOKEN") {
                    ciroResponseBufferRef.current += msg.text;
                    setCiroResponseBuffer(ciroResponseBufferRef.current);
                } else if (msg.type === "SURRENDER") {
                    setSurrender(msg.score);
                    setIsTyping(false);
                    const finalBuffer = ciroResponseBufferRef.current;
                    if (finalBuffer) {
                        setMessages(m => [...m, { sender: 'ciro', text: finalBuffer, id: Date.now() }]);
                    }
                    ciroResponseBufferRef.current = '';
                    setCiroResponseBuffer('');
                    if (msg.score >= 100) {
                        setGameState('EXPLODING');
                        setTimeout(() => setGameState('WIN'), 1500);
                    }
                } else if (msg.type === "EXPIRED") {
                    setGameState('LOSE');
                } else if (msg.type === "WIN") {
                    setGameState('EXPLODING');
                    setTimeout(() => setGameState('WIN'), 1500);
                } else if (msg.type === "ERROR") {
                    setToast(msg.message);
                    setIsTyping(false);
                }
            };

            // Show Ciro's welcome message
            const welcomeMsg = t.welcome[Math.floor(Math.random() * t.welcome.length)];

            setTimeout(() => {
                setGameState('PLAYING');
                setSurrender(0);
                setTimer(90);
                setMessages([{ sender: 'ciro', text: welcomeMsg, id: Date.now() }]);
                setMsgId(0);
                ciroResponseBufferRef.current = '';
                setCiroResponseBuffer('');
            }, 1000);

        } catch (error) {
            console.error("Error starting session:", error);
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            if (message.includes('rejected') || message.includes('user denied')) {
                setToast(t.errTxRejected);
            } else if (message.includes('insufficient')) {
                setToast(t.errInsufficientFunds);
            } else if (message.includes('chain') || message.includes('network')) {
                setToast(t.errWrongNetwork);
            } else {
                setToast(error instanceof Error ? error.message : t.errServer);
            }
            setGameState('IDLE');
        }
    }, [address, currentFee, ensureCorrectNetwork, isConnected, lang, publicClient, refetchCurrentFee, t, writeContractAsync]);

    const claimVault = useCallback(async () => {
        if (!sessionId || !address) {
            setToast(t.errServer);
            return;
        }

        setIsClaiming(true);
        try {
            if (!(await ensureCorrectNetwork())) {
                setToast(t.errWrongNetwork);
                return;
            }

            const res = await fetch('/session/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId, walletAddress: address }),
            });

            if (!res.ok) {
                const errorPayload = await res.json().catch(() => ({ message: t.errServer }));
                throw new Error(errorPayload.message || t.errServer);
            }

            const data: { signature: Hex } = await res.json();
            if (!isAddress(CONTRACT_ADDRESS) || !publicClient) {
                throw new Error(t.errServer);
            }

            const claimHash = await writeContractAsync({
                abi: SIMPLE_VAULT_ABI,
                address: CONTRACT_ADDRESS as `0x${string}`,
                functionName: 'claimVault',
                args: [sessionId, data.signature],
                chainId: REQUIRED_CHAIN_ID,
                account: address,
            });
            await publicClient.waitForTransactionReceipt({ hash: claimHash });

            setToast(lang === 'en' ? 'Claim completed!' : 'Riscossione completata!');
        } catch (error) {
            console.error('Error claiming vault:', error);
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            if (message.includes('rejected') || message.includes('user denied')) {
                setToast(t.errTxRejected);
            } else if (message.includes('insufficient')) {
                setToast(t.errInsufficientFunds);
            } else {
                setToast(error instanceof Error ? error.message : t.errServer);
            }
        } finally {
            setIsClaiming(false);
        }
    }, [address, ensureCorrectNetwork, publicClient, sessionId, t, writeContractAsync]);

    const sendMessage = useCallback(() => {
        if (!input.trim() || gameState !== 'PLAYING' || isTyping || !wsRef.current) return;
        const playerMsg = input.trim();
        const newId = Date.now();
        setMsgId(newId);
        setInput('');
        setMessages(p => [...p, { sender: 'player', text: playerMsg, id: newId }]);
        setIsTyping(true);
        ciroResponseBufferRef.current = '';
        setCiroResponseBuffer('');

        wsRef.current.send(JSON.stringify({ text: playerMsg }));
    }, [input, gameState, isTyping]);

    const resetGame = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setGameState('IDLE');
        setSurrender(0);
        setTimer(90);
        setMessages([]);
        setInput('');
        setIsTyping(false);
        setMsgId(0);
        setSessionId(null);
        ciroResponseBufferRef.current = '';
        setCiroResponseBuffer('');
    }, []);

    const pageShake = gameState === 'PLAYING' && surrender >= 80;

    // Card style on parchment
    const card: React.CSSProperties = {
        background: '#FFF8E7',
        border: '2px solid #8B5E3C',
        borderRadius: '8px',
        boxShadow: '4px 4px 0 #8B3A2A',
    };

    return (
        <div style={{
            height: '100vh',
            overflow: 'hidden',
            background: 'repeating-linear-gradient(0deg, #3A1A0A 0px, #3A1A0A 2px, #4A2A1A 2px, #4A2A1A 32px)',
            animation: pageShake ? 'page-shake 0.3s infinite' : 'none',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: 10, zIndex: 100 }}>
                <button onClick={() => setLang('it')} style={{ cursor: 'pointer', background: 'transparent', border: 'none', fontSize: 24, opacity: lang === 'it' ? 1 : 0.5, filter: lang === 'it' ? 'none' : 'grayscale(100%)', transition: '0.2s' }}>🇮🇹</button>
                <button onClick={() => setLang('en')} style={{ cursor: 'pointer', background: 'transparent', border: 'none', fontSize: 24, opacity: lang === 'en' ? 1 : 0.5, filter: lang === 'en' ? 'none' : 'grayscale(100%)', transition: '0.2s' }}>🇬🇧</button>
            </div>
            <AnimatePresence>{toast && <Toast message={toast} onClose={() => setToast(null)} />}</AnimatePresence>
            {gameState === 'WIN' && <Confetti />}

            {/* ═══ HERO ═══ */}
            {(gameState === 'IDLE' || gameState === 'PAYING') && (
                <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px 24px', textAlign: 'center', maxWidth: 700, margin: '0 auto', width: '100%', overflow: 'hidden' }}>
                    {/* Sign board */}
                    <div style={{
                        background: 'linear-gradient(135deg, #CC2200, #991800)',
                        border: '4px solid #FFD700',
                        borderRadius: '12px',
                        padding: '20px 32px',
                        marginBottom: 28,
                        boxShadow: '6px 6px 0 #660E00',
                        display: 'inline-block',
                    }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 800, color: '#FFD700', letterSpacing: 2, lineHeight: 1.1 }}>
                            🍕 DA CIRO
                        </div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.85rem', color: '#FFEB80', letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 }}>
                            La Pizzeria — Napoli dal 1987
                        </div>
                    </div>

                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.05rem', color: '#FFF8E7', marginBottom: 32, fontWeight: 100, lineHeight: 1.6, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {t.subtitle}
                    </p>

                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <CiroCharacter surrender={0} state={gameState} size={160} />
                    </div>

                    {/* Vault */}
                    <div style={{ ...card, display: 'inline-block', padding: '10px 28px', marginBottom: 16 }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8B5E3C', marginBottom: 4 }}>
                            {t.vaultTitle}
                        </div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: '#CC2200' }}>
                            {vaultAmount} ETH
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                        {!isConnected ? (
                            <button className="btn" onClick={() => openConnectModal?.()} style={{ background: '#FFF8E7', color: '#3A1A0A', border: '2px solid #8B5E3C', fontFamily: 'Outfit, sans-serif' }}>
                                {t.connectBtn}
                            </button>
                        ) : (
                            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '0.85rem', fontWeight: 500, color: '#2D6A2D', ...card, padding: '8px 18px' }}>
                                {isWrongNetwork ? t.errWrongNetwork : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                            </div>
                        )}
                        <button className="btn" onClick={startGame} disabled={gameState === 'PAYING'}
                            style={{ background: '#CC2200', color: '#FFD700', border: '2px solid #8B1500', fontFamily: 'Outfit, sans-serif', boxShadow: '3px 3px 0 #660E00' }}>
                            {gameState === 'PAYING' ? (
                                <><div style={{ width: 18, height: 18, border: '2px solid #FFD700', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinner 0.6s linear infinite' }} /> {t.enteringBtn}</>
                            ) : `${t.enterBtn.split('—')[0].trim()} — ${currentFeeEth} ETH`}
                        </button>
                    </div>
                </section>
            )}

            {/* ═══ ARENA ═══ */}
            {(gameState === 'PLAYING' || gameState === 'EXPLODING') && (
                <section style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 14px', maxWidth: 1000, width: '100%', margin: '0 auto', overflow: 'hidden' }}>
                    {/* Timer */}
                    <div style={{ textAlign: 'center', marginBottom: 12 }}>
                        <div style={{
                            display: 'inline-block',
                            fontFamily: 'Outfit, sans-serif', fontWeight: 800,
                            fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
                            color: timer <= 10 ? '#CC2200' : '#FFF8E7',
                            background: timer <= 10 ? '#FFF8E7' : 'rgba(0,0,0,0.5)',
                            border: `2px solid ${timer <= 10 ? '#CC2200' : '#8B5E3C'}`,
                            borderRadius: '8px',
                            padding: '6px 24px',
                            boxShadow: '3px 3px 0 #3A1A0A',
                            animation: timer <= 10 ? 'flash-red 0.5s infinite, timer-pulse 0.3s infinite' : 'none',
                            textShadow: timer <= 10 ? 'none' : '1px 1px 3px rgba(0,0,0,0.6)',
                        }}>
                            {String(Math.floor(timer / 60)).padStart(2, '0')}:{String(timer % 60).padStart(2, '0')}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', flex: 1, overflow: 'hidden' }}>
                        {/* Ciro panel */}
                        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, ...card, padding: '14px 12px', alignSelf: 'flex-start' }}>
                            <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', fontWeight: 700, color: '#8B5E3C', letterSpacing: 1.5, textTransform: 'uppercase' }}>
                                Ciro
                            </div>
                            <CiroCharacter surrender={surrender} state={gameState} size={180} />
                            <SurrenderBar value={surrender} label={t.surrenderLevel} />
                        </div>

                        {/* Chat panel – looks like an order pad */}
                        <div style={{ flex: 1, minWidth: 280, display: 'flex', flexDirection: 'column', background: '#FFFBF0', border: '2px solid #8B5E3C', borderRadius: '8px', boxShadow: '4px 4px 0 #8B3A2A', overflow: 'hidden' }}>
                            {/* Chat header */}
                            <div style={{ background: '#CC2200', color: '#FFD700', padding: '10px 16px', fontFamily: 'Outfit, sans-serif', fontSize: '0.8rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderBottom: '2px solid #8B1500', display: 'flex', alignItems: 'center', gap: 8 }}>
                                {t.ordersTitle}
                                <span style={{ marginLeft: 'auto', fontFamily: 'Inter, sans-serif', fontSize: '0.7rem', color: '#FFEB80', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                                    {timer <= 10 && timer > 0 ? t.lastSeconds : t.convinceHim}
                                </span>
                            </div>
                            {/* Horizontal rule lines like paper */}
                            <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #E8D8B8 27px, #E8D8B8 28px)', backgroundSize: '100% 28px', backgroundPositionY: '8px' }}>
                                {messages.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#B89060', fontFamily: 'Inter, sans-serif', fontSize: '0.9rem', padding: 40, fontStyle: 'italic' }}>
                                        {t.tryToConvince}
                                    </div>
                                )}
                                {messages.map(msg => (
                                    <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
                                        style={{ display: 'flex', justifyContent: msg.sender === 'player' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
                                        {msg.sender === 'ciro' && (
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#CC2200', border: '2px solid #8B1500', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍕</div>
                                        )}
                                        <div className={msg.sender === 'ciro' ? 'bubble-left' : 'bubble-right'}
                                            style={{
                                                position: 'relative', maxWidth: '75%', padding: '9px 14px',
                                                borderRadius: '8px', border: `2px solid ${msg.sender === 'ciro' ? '#8B5E3C' : '#8B1500'}`,
                                                fontFamily: 'Inter, sans-serif', fontSize: '0.93rem', lineHeight: 1.5,
                                                boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
                                                ...(msg.sender === 'player'
                                                    ? { background: '#CC2200', color: 'white' }
                                                    : { background: '#FFFBF0', color: '#3A1A0A' }),
                                            }}>
                                            {msg.text}
                                        </div>
                                    </motion.div>
                                ))}

                                {/* Streaming Response Bubble */}
                                {ciroResponseBuffer && (
                                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }}
                                        style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 8 }}>
                                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#CC2200', border: '2px solid #8B1500', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍕</div>
                                        <div className="bubble-left"
                                            style={{
                                                position: 'relative', maxWidth: '75%', padding: '9px 14px',
                                                borderRadius: '8px', border: '2px solid #8B5E3C',
                                                fontFamily: 'Inter, sans-serif', fontSize: '0.93rem', lineHeight: 1.5,
                                                background: '#FFFBF0', color: '#3A1A0A',
                                                boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
                                            }}>
                                            {ciroResponseBuffer}
                                        </div>
                                    </motion.div>
                                )}

                                {isTyping && !ciroResponseBuffer && <TypingIndicator />}
                            </div>

                            {/* Input */}
                            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '2px solid #8B5E3C', background: '#FFF3D0' }}>
                                <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                    placeholder={t.waitMessage}
                                    disabled={gameState !== 'PLAYING' || isTyping}
                                    style={{ flex: 1, padding: '10px 14px', fontSize: '0.93rem', border: '2px solid #8B5E3C', borderRadius: '6px', outline: 'none', background: '#FFFBF0', fontFamily: 'Inter, sans-serif', color: '#3A1A0A' }} />
                                <button className="btn" onClick={sendMessage} disabled={!input.trim() || isTyping}
                                    style={{ background: '#CC2200', color: '#FFD700', border: '2px solid #8B1500', padding: '10px 16px', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700, boxShadow: '2px 2px 0 #660E00' }}>
                                    {t.sendBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ═══ WIN ═══ */}
            {gameState === 'WIN' && (
                <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', position: 'relative', zIndex: 10, overflow: 'hidden' }}>
                    <motion.h1 animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1, repeat: Infinity }}
                        style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 8vw, 4rem)', fontWeight: 800, color: '#FFD700', letterSpacing: 1, marginBottom: 16, textShadow: '3px 3px 0 #8B1500' }}>
                        {t.heresyTitle}
                    </motion.h1>
                    <div style={{ fontSize: 80, marginBottom: 16 }}>🍍</div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', color: '#FFF8E7', marginBottom: 24, maxWidth: 400, lineHeight: 1.6, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {t.cavedDesc}
                    </div>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}
                        style={{ ...card, padding: '18px 40px', marginBottom: 24 }}>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#8B5E3C' }}>{t.loot}</div>
                        <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '2rem', fontWeight: 800, color: '#CC2200' }}>{vaultAmount} ETH</div>
                    </motion.div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <button className="btn" onClick={claimVault} disabled={isClaiming} style={{ background: '#2D6A2D', color: 'white', border: '2px solid #1A4A1A' }}>{isClaiming ? t.claimingBtn : t.claimBtn}</button>
                        <button className="btn" onClick={() => { window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`${t.tweet} ${vaultAmount} ETH!`)}`, '_blank'); }}
                            style={{ background: '#1DA1F2', color: 'white', border: '2px solid #1181C2' }}>{t.shareBtn}</button>
                        <button className="btn" onClick={resetGame} style={{ background: '#FFF8E7', color: '#3A1A0A', border: '2px solid #8B5E3C', fontFamily: 'Outfit, sans-serif' }}>{t.homeBtn}</button>
                    </div>
                </section>
            )}

            {/* ═══ LOSE ═══ */}
            {gameState === 'LOSE' && (
                <section style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', overflow: 'hidden' }}>
                    <h1 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 'clamp(2rem, 6vw, 3.5rem)', fontWeight: 800, color: '#FFD700', marginBottom: 20, textShadow: '3px 3px 0 #8B1500' }}>
                        {t.timeUp}
                    </h1>
                    <div style={{ animation: 'ciro-proud 0.8s ease-in-out infinite alternate' }}>
                        <CiroCharacter surrender={0} state="LOSE" size={200} />
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', margin: '18px 0', color: '#FFF8E7', maxWidth: 380, lineHeight: 1.6, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>
                        {t.resistedDesc1}<br />
                        <em style={{ color: '#FFD700' }}>{t.resistedDesc2}</em>
                    </p>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.9rem', fontWeight: 700, ...card, padding: '10px 22px', marginBottom: 22 }}>
                        {t.finalSurrender} {Math.round(surrender)}% / 100%
                    </div>
                    <div style={{ display: 'flex', gap: 14 }}>
                        <button className="btn" onClick={startGame} style={{ background: '#CC2200', color: '#FFD700', border: '2px solid #8B1500', fontFamily: 'Outfit, sans-serif', boxShadow: '3px 3px 0 #660E00' }}>
                            {t.retryBtn}
                        </button>
                        <button className="btn" onClick={resetGame} style={{ background: '#FFF8E7', color: '#3A1A0A', border: '2px solid #8B5E3C', fontFamily: 'Outfit, sans-serif', boxShadow: '3px 3px 0 #8B5E3C' }}>
                            {t.homeBtn}
                        </button>
                    </div>
                </section>
            )}

            {gameState === 'IDLE' && (
                <footer style={{ textAlign: 'center', padding: '10px', fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: '#B89060', textShadow: '1px 1px 2px rgba(0,0,0,0.5)', flexShrink: 0 }}>
                    Da Ciro — Onchain Game
                </footer>
            )}

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        
        .ciro-idle { animation: ciro-bob 2.5s ease-in-out infinite; }
        .ciro-headgrip { animation: head-grip 0.4s ease-in-out infinite alternate; }
        .ciro-proud { animation: proud-sway 1s ease-in-out infinite alternate; }
        
        @keyframes ciro-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes head-grip {
          0% { transform: rotate(-3deg) translateY(-2px); }
          100% { transform: rotate(3deg) translateY(2px); }
        }
        @keyframes proud-sway {
          0% { transform: rotate(-5deg); }
          100% { transform: rotate(5deg); }
        }
        @keyframes pineapple-drop {
          0% { transform: translateY(-80px) rotate(-30deg); opacity: 0; }
          60% { opacity: 1; }
          100% { transform: translateY(0px) rotate(0deg); opacity: 1; }
        }
        @keyframes idle-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes angry-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @keyframes laugh-shake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes page-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        @keyframes flash-red {
          0%, 100% { color: #CC2200; }
          50% { color: #FF6644; }
        }
        @keyframes timer-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes typing-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spinner {
          to { transform: rotate(360deg); }
        }
        @keyframes toast-slide {
          0% { transform: translateX(-50%) translateY(20px); opacity: 0; }
          10%, 90% { transform: translateX(-50%) translateY(0); opacity: 1; }
          100% { transform: translateX(-50%) translateY(20px); opacity: 0; }
        }
        .confetti-container {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999; overflow: hidden;
        }
        .confetti-piece {
          position: absolute; top: -40px;
          animation: confetti-fall linear forwards;
        }
        @keyframes confetti-fall {
          to { transform: translateY(110vh) rotate(720deg); }
        }
        .bubble-left::before {
          content: ''; position: absolute; left: -10px; top: 12px;
          border-top: 6px solid transparent; border-bottom: 6px solid transparent;
          border-right: 10px solid #8B5E3C;
        }
        .bubble-right::after {
          content: ''; position: absolute; right: -10px; top: 12px;
          border-top: 6px solid transparent; border-bottom: 6px solid transparent;
          border-left: 10px solid #8B1500;
        }
        .btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 12px 24px; border-radius: 6px; font-weight: 700;
          font-size: 0.95rem; cursor: pointer; transition: transform 0.1s, box-shadow 0.1s;
          letter-spacing: 0.5px;
        }
        .btn:hover:not(:disabled) { transform: translate(-1px, -1px); filter: brightness(1.05); }
        .btn:active:not(:disabled) { transform: translate(1px, 1px); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
        </div>
    );
}

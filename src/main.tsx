import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Search, SlidersHorizontal, Users, Clock3, X, WifiOff, ArrowLeft, Image as ImageIcon } from "lucide-react";
import "./styles.css";
import { supabase } from "./supabase";

type Game = {
  id: string;
  name: string;
  min_players: number | null;
  max_players: number | null;
  duration_minutes: number | null;
  min_age: number | null;
  difficulty: string;
  notes: string | null;
};

type Filters = { players: string; duration: string; difficulty: string; age: string };
const CACHE_KEY = "terraludo-public-games-v1";
const emptyFilters: Filters = { players: "", duration: "", difficulty: "", age: "" };

async function loadGames(): Promise<Game[]> {
  try {
    const { data, error } = await supabase.from("board_games").select("id,name,min_players,max_players,duration_minutes,min_age,difficulty,notes").order("name", { ascending: true });
    if (error) throw error;
    const games = (data ?? []) as Game[];
    localStorage.setItem(CACHE_KEY, JSON.stringify(games));
    return games;
  } catch {
    const cached = localStorage.getItem(CACHE_KEY);
    return cached ? JSON.parse(cached) as Game[] : [];
  }
}

function getGameIdFromUrl() {
  const match = window.location.hash.match(/^#\/game\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [selectedId, setSelectedId] = useState<string | null>(getGameIdFromUrl());

  useEffect(() => {
    loadGames().then(setGames);
    const online = () => setOffline(false);
    const offline = () => setOffline(true);
    const routeChanged = () => setSelectedId(getGameIdFromUrl());
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    window.addEventListener("hashchange", routeChanged);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
      window.removeEventListener("hashchange", routeChanged);
    };
  }, []);

  const openGame = (id: string) => { window.location.hash = `/game/${encodeURIComponent(id)}`; };
  const goHome = () => { window.location.hash = ""; };
  const selectedGame = games.find((game) => game.id === selectedId) ?? null;

  if (selectedId) return <GameDetail game={selectedGame} onBack={goHome} />;

  const filteredGames = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const players = filters.players ? Number(filters.players) : null;
    return games.filter((game) => {
      if (q && !game.name.toLocaleLowerCase().includes(q)) return false;
      if (players && (game.min_players == null || game.max_players == null || players < game.min_players || players > game.max_players)) return false;
      if (filters.duration === "short" && (game.duration_minutes == null || game.duration_minutes > 30)) return false;
      if (filters.duration === "medium" && (game.duration_minutes == null || game.duration_minutes <= 30 || game.duration_minutes > 90)) return false;
      if (filters.duration === "long" && (game.duration_minutes == null || game.duration_minutes <= 90)) return false;
      if (filters.difficulty && game.difficulty !== filters.difficulty) return false;
      if (filters.age && (game.min_age == null || game.min_age > Number(filters.age))) return false;
      return true;
    });
  }, [games, query, filters]);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  return (
    <main className="app">
      <div className="hero"><div className="brand">🎲 TerraLudo</div><h1>Catálogo de juegos</h1><p>Encuentra el juego perfecto para tu partida.</p>{offline && <div className="offline"><WifiOff size={15} /> Modo sin conexión · usando catálogo guardado</div>}</div>
      <section className="search-area">
        <div className="search-row"><div className="search-box"><Search size={20} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre..." aria-label="Buscar juego por nombre" />{query && <button className="icon-button" onClick={() => setQuery("")} aria-label="Limpiar búsqueda"><X size={18} /></button>}</div><button className={"filter-button " + (showFilters || activeFilters ? "active" : "")} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={18} /> Filtros {activeFilters ? `(${activeFilters})` : ""}</button></div>
        {showFilters && <div className="filters"><label>Jugadores<select value={filters.players} onChange={(e) => setFilters({ ...filters, players: e.target.value })}><option value="">Cualquiera</option>{[1,2,3,4,5,6,7,8,10].map(n => <option key={n} value={n}>{n} jugadores</option>)}</select></label><label>Duración<select value={filters.duration} onChange={(e) => setFilters({ ...filters, duration: e.target.value })}><option value="">Cualquiera</option><option value="short">Hasta 30 min</option><option value="medium">31–90 min</option><option value="long">Más de 90 min</option></select></label><label>Dificultad<select value={filters.difficulty} onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}><option value="">Cualquiera</option><option value="casual">Casual</option><option value="medium">Medio</option><option value="hard">Difícil</option><option value="expert">Experto</option></select></label><label>Edad máxima<select value={filters.age} onChange={(e) => setFilters({ ...filters, age: e.target.value })}><option value="">Cualquiera</option>{[6,8,10,12,14,16,18].map(n => <option key={n} value={n}>{n}+ recomendado</option>)}</select></label>{activeFilters > 0 && <button className="clear" onClick={() => setFilters(emptyFilters)}>Limpiar filtros</button>}</div>}
      </section>
      <section className="results"><div className="results-header"><strong>{filteredGames.length}</strong> {filteredGames.length === 1 ? "juego" : "juegos"}</div>{filteredGames.length === 0 ? <div className="empty">No hay juegos que coincidan con tu búsqueda.</div> : <div className="grid">{filteredGames.map(game => <GameCard key={game.id} game={game} onOpen={openGame} />)}</div>}</section>
    </main>
  );
}

function GameCard({ game, onOpen }: { game: Game; onOpen: (id: string) => void }) {
  const difficulty = ({ casual: "Casual", medium: "Medio", hard: "Difícil", expert: "Experto" } as Record<string,string>)[game.difficulty] ?? game.difficulty;
  return <button className="card card-button" onClick={() => onOpen(game.id)} aria-label={`Ver detalles de ${game.name}`}><div className="card-title"><h2>{game.name}</h2><span className={`difficulty ${game.difficulty}`}>{difficulty}</span></div><div className="meta">{game.min_players != null && game.max_players != null && <span><Users size={16} /> {game.min_players}–{game.max_players}</span>}{game.duration_minutes != null && <span><Clock3 size={16} /> {game.duration_minutes} min</span>}{game.min_age != null && <span>Edad {game.min_age}+</span>}</div>{game.notes && <p>{game.notes}</p>}<span className="card-link">Ver detalles →</span></button>;
}

function GameDetail({ game, onBack }: { game: Game | null; onBack: () => void }) {
  if (!game) return <main className="detail-page"><div className="detail-shell"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver al catálogo</button><div className="detail-card"><h1>Juego no encontrado</h1><p>El juego solicitado no está disponible en el catálogo.</p></div></div></main>;
  const difficulty = ({ casual: "Casual", medium: "Medio", hard: "Difícil", expert: "Experto" } as Record<string,string>)[game.difficulty] ?? game.difficulty;
  return <main className="detail-page"><div className="detail-shell"><button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Volver al catálogo</button><article className="detail-card"><div className="detail-media"><ImageIcon size={54} /><span>Foto del juego</span><small>La imagen se añadirá aquí</small></div><div className="detail-content"><span className={`difficulty ${game.difficulty}`}>{difficulty}</span><h1>{game.name}</h1>{game.notes && <section><h2>Descripción</h2><p className="description">{game.notes}</p></section>}<section><h2>Información del juego</h2><div className="detail-grid">{game.min_players != null && game.max_players != null && <div><span>Jugadores</span><strong><Users size={17} /> {game.min_players}–{game.max_players}</strong></div>}{game.duration_minutes != null && <div><span>Duración</span><strong><Clock3 size={17} /> {game.duration_minutes} min</strong></div>}{game.min_age != null && <div><span>Edad mínima</span><strong>{game.min_age}+</strong></div>}<div><span>Dificultad</span><strong>{difficulty}</strong></div></div></section></div></article></div></main>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);

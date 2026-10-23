// Genres are a small, closed vocabulary shared across Steam/AniList/Open
// Library, so a static lookup is faster and more reliable than calling a
// translation API for every request.
const GENRE_PT: Record<string, string> = {
  Action: "Ação",
  Adventure: "Aventura",
  Comedy: "Comédia",
  Drama: "Drama",
  Fantasy: "Fantasia",
  Horror: "Terror",
  Mystery: "Mistério",
  Romance: "Romance",
  "Sci-Fi": "Ficção científica",
  "Science Fiction": "Ficção científica",
  "Slice of Life": "Cotidiano",
  Sports: "Esportes",
  Supernatural: "Sobrenatural",
  Thriller: "Suspense",
  Psychological: "Psicológico",
  Mecha: "Mecha",
  Music: "Música",
  Ecchi: "Ecchi",
  RPG: "RPG",
  Strategy: "Estratégia",
  Simulation: "Simulação",
  Puzzle: "Quebra-cabeça",
  Racing: "Corrida",
  Shooter: "Tiro",
  Platformer: "Plataforma",
  Indie: "Independente",
  Casual: "Casual",
  Family: "Família",
  Biography: "Biografia",
  History: "História",
  "Self-help": "Autoajuda",
  Poetry: "Poesia",
  Classics: "Clássicos",
  Nonfiction: "Não-ficção",
  Fiction: "Ficção",
  "Young Adult": "Jovem adulto",
  Children: "Infantil",
};

export function translateGenres(genres: string | null): string | null {
  if (!genres) return genres;
  return genres
    .split(",")
    .map((g) => g.trim())
    .map((g) => GENRE_PT[g] ?? g)
    .join(", ");
}

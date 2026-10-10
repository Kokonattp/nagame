// Shared Tabi contracts (server planner ⇄ /api/tabi ⇄ client screens).
// Rule (spec §2): everything shown comes from the place store or templates;
// System One only chooses, ranks and judges.

export const PREFERENCES = [
  "nature", "snow", "onsen", "food", "shopping", "culture",
  "fewer_crowds", "easy_travel", "family", "scenic_photo",
] as const;
export type Preference = (typeof PREFERENCES)[number];

export type Season = "spring" | "summer" | "autumn" | "winter" | "all_year";

export type Place = {
  id: string;
  nameEn: string;
  nameJa: string | null;
  type: string;
  lat: number;
  lon: number;
  sitelinks: number;
  baseCity: string;
  baseKm: number;
  region: string;
  /** 1 (quiet) … 5 (Japan's busiest sights) */
  crowd: number;
  season: Season;
  firstTimer: boolean;
  family: boolean;
  tags: string[];
  wikiTitle: string;
};

export type TripIntent = {
  month?: number; // 1–12
  durationDays?: number;
  /** departure date "YYYY-MM-DD" once known (from chat or the date picker) */
  startDate?: string;
  preferences: Preference[];
  /** base-city names or region ids the traveller mentioned */
  focus: string[];
};

export type RouteStop = { city: string; cityTh: string; lat: number; lon: number; nights: number };

export type Highlight = {
  id: string;
  name: string;
  nameJa: string | null;
  city: string;
  lat: number;
  lon: number;
  type: string;
  crowd: number;
  wikiTitle: string;
  /** approximate extra travel from the stop's base city, minutes */
  approxDetourMin?: number;
  reason?: string;
};

export type RouteOption = {
  id: string;
  title: string; // "Tokyo → Nagano → Takayama"
  stops: RouteStop[];
  highlights: Highlight[]; // ≤3 shown on the card
  tags: string[]; // Thai labels, ≤3
  reason: string;
  tradeoff?: string;
  recommended?: boolean;
  gateway: { city: string; airport: string };
  totalKm: number;
};

export type DaySlot = "morning" | "afternoon" | "evening";
/** How a move happens — drives the coloured chip on the timeline (video reference). */
export type TravelMode = "flight" | "train" | "bus" | "ferry" | "airport";
export type ItineraryItem = {
  kind: "move" | "see" | "stay";
  text: string;
  /** part of the day instead of a clock time: we have no live timetables */
  slot?: DaySlot;
  mode?: TravelMode;
  placeId?: string;
  wikiTitle?: string;
  approx?: boolean;
  /** move ends for the "ดูทาง" link: a base-city name, or `airport:<gateway code>` */
  from?: string;
  to?: string;
};
/** `photo` = Wikipedia title of the day's first sight (card thumbnail). */
export type ItineraryDay = { day: number; city: string; title: string; items: ItineraryItem[]; photo?: string };

export type TabiAction =
  | "ask"
  | "suggest_routes"
  | "open_route"
  | "suggest_stops"
  | "draft_itinerary"
  | "flights"
  | "answer"
  | "chat";

export type FlightLeg = { dir: "outbound" | "return"; from: string; fromCode: string; to: string; toCode: string; date?: string };
export type FlightLink = {
  label: string;
  url: string;
  note: string;
  /** boarding-pass cards: Bangkok → arrival airport, departure airport → Bangkok */
  legs?: FlightLeg[];
  /** separate search when flying home from a different airport (open-jaw) */
  returnUrl?: string;
};

export type TabiReply = {
  bubbles: string[];
  action: TabiAction;
  intent: TripIntent;
  ask?: { question: string; chips: string[] };
  routes?: RouteOption[];
  openRouteId?: string;
  stops?: Highlight[];
  itinerary?: ItineraryDay[];
  flight?: FlightLink;
  chips?: string[];
  /** the selected route after the server re-fitted it (e.g. nights changed to match days) */
  selectedRoute?: RouteOption;
  source: "jev" | "fallback";
};

/** Context after the server has validated/rebuilt what the client sent. */
export type TabiContext = {
  intent?: TripIntent;
  shownRoutes?: Pick<RouteOption, "id" | "title">[];
  selectedRoute?: RouteOption;
  /** stops the traveller added with "ใส่ในทริป" (rebuilt from place ids) */
  savedStops?: Highlight[];
};

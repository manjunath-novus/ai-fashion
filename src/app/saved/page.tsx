
"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "../components/Sidebar";
import { motion } from "framer-motion";
import {
  Bookmark,
  CalendarDays,
  CloudSun,
  Search,
  Shirt,
  Sparkles,
  Star,
  Watch,
  Trash2,
  X,
  ArrowUpRight,
} from "lucide-react";

type FashionItem = {
  id: string;
  image: string;
  category: string;
};

type StoredOutfit = {
  shirtId: string;
  pantsId: string;
  shoesId: string;
  watchId: string | null;
  mood: string;
  score: string;
  occasion: string;
  weather: string;
  createdAt: number;
};

function readSavedOutfits(): StoredOutfit[] {
  try {
    const stored = localStorage.getItem("savedOutfits");
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? (parsed as StoredOutfit[]) : [];
  } catch {
    return [];
  }
}

function formatSavedDate(timestamp: number) {
  if (!timestamp) return "Saved outfit";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "Saved outfit";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function SavedPage() {
  const { user } = useAuth();

  const [savedOutfits, setSavedOutfits] = useState<StoredOutfit[]>([]);
  const [wardrobe, setWardrobe] = useState<FashionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedOccasion, setSelectedOccasion] = useState("All");

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      if (!user?.uid) {
        if (active) {
          setSavedOutfits([]);
          setWardrobe([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const parsed = readSavedOutfits();

        if (active) setSavedOutfits(parsed);

        const wardrobeQuery = query(
          collection(db, "wardrobe"),
          where("userId", "==", user.uid)
        );

        const snapshot = await getDocs(wardrobeQuery);

        const items = snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as Omit<FashionItem, "id">),
        }));

        if (active) setWardrobe(items);
      } catch (error) {
        console.error("Unable to load saved outfits:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    const refreshSavedOutfits = () => {
      setSavedOutfits(readSavedOutfits());
    };

    window.addEventListener("saved-outfits-updated", refreshSavedOutfits);
    window.addEventListener("storage", refreshSavedOutfits);

    return () => {
      active = false;
      window.removeEventListener("saved-outfits-updated", refreshSavedOutfits);
      window.removeEventListener("storage", refreshSavedOutfits);
    };
  }, [user?.uid]);

 const resolvedSavedOutfits = useMemo(() => {
  const getItem = (id: string) =>
    wardrobe.find((item) => item.id === id) ?? null;

  return savedOutfits.map((outfit, originalIndex) => ({
    ...outfit,
    originalIndex,
    shirt: getItem(outfit.shirtId),
    pants: getItem(outfit.pantsId),
    shoes: getItem(outfit.shoesId),
    watch: outfit.watchId ? getItem(outfit.watchId) : null,
  }));
}, [savedOutfits, wardrobe]);

  const occasions = useMemo(() => {
    const values = savedOutfits
      .map((outfit) => outfit.occasion)
      .filter(Boolean);

    return ["All", ...Array.from(new Set(values))];
  }, [savedOutfits]);

  const filteredOutfits = useMemo(() => {
    const term = search.trim().toLowerCase();

    return resolvedSavedOutfits
      .filter((outfit) => {
        const matchesSearch =
          !term ||
          [outfit.mood, outfit.occasion, outfit.weather, outfit.score]
            .some((value) => value?.toLowerCase().includes(term));

        const matchesOccasion =
          selectedOccasion === "All" ||
          outfit.occasion === selectedOccasion;

        return matchesSearch && matchesOccasion;
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [resolvedSavedOutfits, search, selectedOccasion]);

  const availableCount = resolvedSavedOutfits.filter(
    (outfit) => outfit.shirt || outfit.pants || outfit.shoes
  ).length;

  const removeOutfit = (originalIndex: number) => {
  const updated = savedOutfits.filter(
    (_, index) => index !== originalIndex
  );

  localStorage.setItem("savedOutfits", JSON.stringify(updated));
  setSavedOutfits(updated);

  window.dispatchEvent(new Event("saved-outfits-updated"));
};

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#08070d] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-48 top-[-180px] h-[480px] w-[480px] rounded-full bg-violet-700/10 blur-[140px]" />
        <div className="absolute -right-40 bottom-[-180px] h-[480px] w-[480px] rounded-full bg-fuchsia-700/[0.08] blur-[140px]" />
      </div>

      <Sidebar />

      <div className="relative z-10 min-h-screen px-4 pb-12 pt-7 sm:px-7 lg:ml-[232px] lg:px-9 lg:pt-9">
        <div className="mx-auto max-w-[1450px]">

          {/* Header */}
          <motion.header
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-9 flex flex-col justify-between gap-6 xl:flex-row xl:items-end"
          >
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-2 text-xs font-semibold tracking-wide text-violet-200">
                <Bookmark size={14} />
                NOVA PERSONAL COLLECTION
              </div>

              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Your saved{" "}
                <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-purple-400 bg-clip-text text-transparent">
                  looks.
                </span>
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45 sm:text-base">
                Every combination you love, organized in your personal style collection.
              </p>
            </div>

            <div className="grid w-full grid-cols-2 gap-3 sm:w-auto sm:min-w-[310px]">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                  Saved looks
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                  {savedOutfits.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3.5">
                <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/35">
                  Available outfits
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums">
                  {availableCount}
                </p>
              </div>
            </div>
          </motion.header>

          {/* Collection intro */}
          <section className="relative mb-8 overflow-hidden rounded-[26px] border border-violet-400/15 bg-gradient-to-br from-[#211638] via-[#151020] to-[#100d17] p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-10 -top-20 h-64 w-64 rounded-full border border-violet-300/10" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-200">
                  <Sparkles size={15} />
                  Your style archive
                </div>
                <h2 className="text-2xl font-semibold">
                  Your wardrobe. Your identity.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/50">
                  Keep track of your favorite outfit combinations and revisit them whenever inspiration strikes.
                </p>
              </div>

              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
                <Bookmark size={28} />
              </div>
            </div>
          </section>

          {/* Search and filters */}
          <section className="mb-7">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white/90">
                  Your collection
                </h2>
                <p className="mt-1 text-xs text-white/35">
                  {loading
                    ? "Loading your collection..."
                    : `${filteredOutfits.length} ${filteredOutfits.length === 1 ? "look" : "looks"} displayed`}
                </p>
              </div>

              <div className="relative w-full sm:max-w-[300px]">
                <Search
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mood, occasion..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-3 pl-11 pr-10 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/40"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {occasions.map((occasion) => (
                <button
                  key={occasion}
                  onClick={() => setSelectedOccasion(occasion)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition ${
                    selectedOccasion === occasion
                      ? "border-violet-400/40 bg-violet-500/15 text-violet-200"
                      : "border-white/10 bg-white/[0.025] text-white/45 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {occasion}
                </button>
              ))}
            </div>
          </section>

          {/* Loading state */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[390px] animate-pulse rounded-[26px] border border-white/[0.06] bg-white/[0.025]"
                />
              ))}
            </div>
          ) : savedOutfits.length === 0 ? (
            /* Empty collection */
            <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/[0.12] bg-white/[0.02] px-6 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] border border-violet-300/15 bg-violet-500/10 text-violet-200">
                <Bookmark size={26} />
              </div>
              <h3 className="text-xl font-semibold text-white/85">
                Your collection starts here
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
                Save outfits from Outfit Builder and they will appear here, ready whenever you need some style inspiration.
              </p>
            </div>
          ) : filteredOutfits.length === 0 ? (
            /* No search results */
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-[28px] border border-dashed border-white/[0.12] bg-white/[0.02] px-6 text-center">
              <Search size={28} className="mb-4 text-violet-300/60" />
              <h3 className="text-lg font-semibold">No matching looks</h3>
              <p className="mt-2 text-sm text-white/40">
                Try another search or change your occasion filter.
              </p>
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedOccasion("All");
                }}
                className="mt-5 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200 hover:bg-violet-500/20"
              >
                Clear filters
              </button>
            </div>
          ) : (
            /* Saved outfit cards */
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredOutfits.map((outfit, index) => {
                const pieces = [
                  { label: "Top", item: outfit.shirt, icon: Shirt },
                  { label: "Bottom", item: outfit.pants, icon: Shirt },
                  { label: "Shoes", item: outfit.shoes, icon: Shirt },
                ];

                return (
                  <motion.article
                    key={`${outfit.createdAt}-${outfit.shirtId}-${outfit.pantsId}-${index}`}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(index * 0.04, 0.2),
                    }}
                    whileHover={{ y: -4 }}
                    className="group overflow-hidden rounded-[26px] border border-white/[0.08] bg-[#100e18]/90 shadow-[0_18px_55px_rgba(0,0,0,0.18)] transition-colors hover:border-violet-300/20"
                  >
                    {/* Card header */}
                    <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200">
                          <Sparkles size={16} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white/85">
                            {outfit.mood || "Personal style"}
                          </p>
                          <p className="mt-0.5 text-[10px] text-white/35">
                            {formatSavedDate(outfit.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-amber-300/15 bg-amber-300/[0.07] px-2.5 py-1.5 text-[10px] font-medium text-amber-200/90">
                          <Star size={11} />
                          {outfit.score || "Saved"}
                        </div>

                        <button
                          onClick={() => removeOutfit(outfit.originalIndex)}
                          aria-label="Remove saved outfit"
                          title="Remove outfit"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] text-white/35 transition hover:border-red-400/20 hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Outfit pieces */}
                    <div className="grid grid-cols-3 gap-2 p-4">
                      {pieces.map(({ label, item, icon: PieceIcon }) => (
                        <div
                          key={label}
                          className="min-w-0 overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20"
                        >
                          {item ? (
                            <Image
                              src={item.image}
                              alt={item.category || label}
                              width={400}
                              height={420}
                              unoptimized
                              className="h-36 w-full object-cover transition duration-500 group-hover:scale-[1.02] sm:h-40"
                            />
                          ) : (
                            <div className="flex h-36 flex-col items-center justify-center gap-2 text-white/20 sm:h-40">
                              <PieceIcon size={20} />
                              <span className="text-[10px]">Unavailable</span>
                            </div>
                          )}

                          <div className="border-t border-white/[0.05] px-2.5 py-2">
                            <p className="text-[9px] uppercase tracking-[0.12em] text-white/30">
                              {label}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] font-medium text-white/65">
                              {item?.category || "Not available"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Metadata */}
                    <div className="px-5 pb-5">
                      <div className="flex flex-wrap gap-2">
                        {outfit.occasion && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/55">
                            <CalendarDays size={11} className="text-violet-300" />
                            {outfit.occasion}
                          </span>
                        )}

                        {outfit.weather && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/55">
                            <CloudSun size={11} className="text-violet-300" />
                            {outfit.weather}
                          </span>
                        )}

                        {outfit.watchId && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.035] px-3 py-1.5 text-[10px] text-white/55">
                            <Watch size={11} className="text-violet-300" />
                            Accessory saved
                          </span>
                        )}
                      </div>

                      {outfit.watchId && outfit.watch && (
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
                          <Image
                            src={outfit.watch.image}
                            alt={outfit.watch.category || "Watch"}
                            width={64}
                            height={64}
                            unoptimized
                            className="h-11 w-11 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-[10px] text-white/35">
                              ACCESSORY
                            </p>
                            <p className="mt-0.5 text-xs text-white/70">
                              {outfit.watch.category}
                            </p>
                          </div>
                        </div>
                      )}

                      {!outfit.shirt && !outfit.pants && !outfit.shoes && (
                        <p className="mt-3 text-[11px] text-amber-200/60">
                          Some wardrobe pieces are no longer available.
                        </p>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}

          <div className="mt-10 flex items-center gap-2 border-t border-white/[0.06] pt-5 text-xs text-white/30">
            <Sparkles size={13} className="text-violet-400" />
            Your personal style archive, powered by NOVA AI.
            <ArrowUpRight size={12} />
          </div>
        </div>
      </div>
    </main>
  );
}

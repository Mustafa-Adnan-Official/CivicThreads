// Default city/ward for MVP (hackathon)
export const DEFAULT_CITY_ID = "markham";
export const DEFAULT_WARD_ID = "ward-1";

// Hardcoded city list for signup dropdowns (MVP)
export const CITIES = [
  { cityId: "markham", cityName: "Markham" },
] as const;

// Hardcoded ward list for Ward Rep signup (MVP)
// In production this would come from Firestore
export const WARDS_BY_CITY: Record<string, { wardId: string; wardName: string }[]> = {
  markham: [
    { wardId: "ward-1", wardName: "Ward 1" },
    { wardId: "ward-2", wardName: "Ward 2" },
    { wardId: "ward-3", wardName: "Ward 3" },
    { wardId: "ward-4", wardName: "Ward 4" },
    { wardId: "ward-5", wardName: "Ward 5" },
    { wardId: "ward-6", wardName: "Ward 6" },
    { wardId: "ward-7", wardName: "Ward 7" },
    { wardId: "ward-8", wardName: "Ward 8" },
  ],
};

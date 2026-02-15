// CivicThreads – TypeScript interfaces matching Firestore schema

export type UserRole = "CITY_ADMIN" | "WARD_REP" | "RESIDENT";
export type PublicIdentityMode = "ANON" | "PUBLIC";

export interface User {
  uid: string;
  role: UserRole;
  accountName: string;
  createdAt: Date;
  /** CITY_ADMIN / WARD_REP: which city this user belongs to */
  cityId?: string;
  /** WARD_REP: which ward this user is rep for */
  wardId?: string;
}

export interface City {
  cityId: string;
  cityName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Ward {
  wardId: string;
  wardName: string;
  repUid?: string;
  wardRepEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Thread {
  threadId: string;
  wardId: string;
  cityId: string;
  title: string;
  aiSummary: string;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  issueCount: number;
  upvoteCount: number;
  upvoteUids: string[];
  issueIds: string[];
}

export interface Issue {
  issueId: string;
  wardId: string;
  threadIds: string[];
  text: string;
  imageUrl?: string;
  createdAt: Date;
  authorUid: string;
  publicIdentityMode: PublicIdentityMode;
  publicDisplayName: string;
  upvoteCount: number;
  upvoteUids: string[];
}

export interface Announcement {
  announcementId: string;
  repUid: string;
  text: string;
  createdAt: Date;
}

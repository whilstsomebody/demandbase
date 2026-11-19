export interface Category {
  id: string;
  name: string;
}

export interface OwnerSummary {
  id: string;
  name: string;
  trustScore: number;
}

export interface ItemPhoto {
  id: string;
  url: string;
}

export interface Item {
  id: string;
  ownerId: string;
  type: 'PHYSICAL' | 'DIGITAL';
  title: string;
  description: string | null;
  categoryId: string;
  status: 'AVAILABLE' | 'UNAVAILABLE';
  maxLoanDurationDays: number;
  createdAt: string;
  owner: OwnerSummary;
  category: Category;
  photos: ItemPhoto[];
}

export interface ItemFile {
  id: string;
  originalFilename: string;
  accessMode: 'VIEW' | 'DOWNLOAD';
  flaggedForReview: boolean;
  createdAt: string;
}

export type RequestMode = 'DIRECT' | 'BROADCAST';
export type RequestStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED' | 'NO_MATCH';
export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'WITHDRAWN' | 'EXPIRED';
export type LoanState = 'APPROVED' | 'ACTIVE' | 'RETURN_REQUESTED' | 'CLOSED' | 'CANCELLED';

export interface RequestRecord {
  id: string;
  requesterId: string;
  mode: RequestMode;
  rawText: string | null;
  requirementText: string | null;
  status: RequestStatus;
  createdAt: string;
  offers: OfferRecord[];
}

export interface OfferRecord {
  id: string;
  requestId: string;
  ownerId: string;
  itemId: string;
  status: OfferStatus;
  createdAt: string;
  item: Item;
  request?: { requester: OwnerSummary; mode: RequestMode; requirementText: string | null };
}

export interface LoanRecord {
  id: string;
  offerId: string;
  itemId: string;
  borrowerId: string;
  ownerId: string;
  state: LoanState;
  pickupConfirmedByBorrowerAt: string | null;
  pickupConfirmedByOwnerAt: string | null;
  activatedAt: string | null;
  dueAt: string | null;
  returnConfirmedByBorrowerAt: string | null;
  returnConfirmedByOwnerAt: string | null;
  closedAt: string | null;
  createdAt: string;
  item: Item;
}

export interface FeedMessage {
  id: string;
  authorId: string;
  body: string;
  isRequest: boolean;
  requestId: string | null;
  createdAt: string;
  author: { id: string; name: string };
  request?: RequestRecord | null;
}

export interface NotificationRecord {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export interface ReviewRecord {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
  rater: { id: string; name: string };
}

export type ReportType = 'NON_RETURN' | 'DAMAGE' | 'MISUSE' | 'CONTENT_VIOLATION' | 'OTHER';
export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface ReportRecord {
  id: string;
  reporterId: string;
  reporter?: { id: string; name: string; email: string };
  type: ReportType;
  description: string;
  loanId: string | null;
  itemId: string | null;
  status: ReportStatus;
  resolution: string | null;
  createdAt: string;
}

export const EVENT_PATTERNS = {
  OFFER_CREATED: 'offer.created',
  OFFER_ACCEPTED: 'offer.accepted',
  OFFER_DECLINED: 'offer.declined',
  LOAN_PICKUP_CONFIRMED: 'loan.pickup_confirmed',
  LOAN_ACTIVATED: 'loan.activated',
  LOAN_RETURN_REQUESTED: 'loan.return_requested',
  LOAN_CLOSED: 'loan.closed',
  LOAN_CANCELLED: 'loan.cancelled',
  LOAN_DUE_SOON: 'loan.due_soon',
  LOAN_OVERDUE: 'loan.overdue',
  REQUEST_NO_MATCH: 'request.no_match',
  BROADCAST_OFFER_ACCEPTED: 'broadcast_offer.accepted',
  REQUEST_CANCELLED: 'request.cancelled',
} as const;

export interface OfferCreatedEvent {
  offerId: string;
  requestId: string;
  ownerId: string;
  itemId: string;
  requesterId: string;
}

export interface OfferAcceptedEvent {
  offerId: string;
  loanId: string;
  ownerId: string;
  borrowerId: string;
  itemId: string;
}

export interface OfferDeclinedEvent {
  offerId: string;
  ownerId: string;
  requesterId: string;
  itemId: string;
}

export interface LoanActorEvent {
  loanId: string;
  borrowerId: string;
  ownerId: string;
  itemId: string;
}

export interface LoanDueEvent {
  loanId: string;
  borrowerId: string;
  dueAt: string;
}

export interface RequestNoMatchEvent {
  requestId: string;
  requesterId: string;
  requirementText: string;
}

export interface BroadcastOfferAcceptedEvent {
  offerId: string;
  requestId: string;
  requesterId: string;
  ownerId: string;
  itemId: string;
}

export interface RequestCancelledEvent {
  requestId: string;
  ownerId: string;
  itemId: string;
}

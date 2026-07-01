// Join Request State Machine
export type RequestState = 
  | 'none'           // No request exists
  | 'pending'        // Request sent, awaiting approval
  | 'accepted'       // Request accepted
  | 'declined'       // Request declined
  | 'cancelled'      // User cancelled request
  | 'joined';        // User is a participant (accepted + added to event)

export type RequestStatus = RequestState | 'cancelled';

export interface RequestStateResult {
  state: RequestState;
  requestId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Join Request UI State
export interface JoinButtonState {
  state: RequestState;
  isLoading: boolean;
  isDisabled: boolean;
  label: string;
  variant: 'primary' | 'secondary' | 'success' | 'error' | 'outline';
}

// Organizer Request Card
export interface RequestCard {
  id: string;
  eventId: string;
  userId: string;
  status: RequestState;
  createdAt: string;
  updatedAt: string;
  profile: {
    id: string;
    username: string | null;
    firstName: string | null;
    avatarUrl: string | null;
    rating: number;
    ratingCount: number;
    mutualInterests?: string[];
  };
}

// Join Result with State
export interface JoinResult {
  success: boolean;
  state?: RequestState;
  error?: string;
  message?: string;
  requestId?: string;
}

// Event Request Stats
export interface EventRequestStats {
  pendingCount: number;
  acceptedCount: number;
  totalParticipants: number;
  maxParticipants: number;
  isOrganizer: boolean;
}

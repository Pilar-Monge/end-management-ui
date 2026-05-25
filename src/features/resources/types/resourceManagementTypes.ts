
export interface Camp {
  id: string;
  name: string;
  location: string;
  personnelCount: number;
}

export interface ResourceType {
  id: string | number;
  name: string;
  unitOfMeasure: string;
  category: "FOOD" | "WATER" | "HYGIENE" | "DEFENSE" | "AMMUNITION" | "MEDICAL" | "OTHER";
  description: string;
}

export interface CampInventory {
  campId: string;
  resourceTypeId: string;
  currentAmount: number;
  minimumAlertAmount: number;
}

export interface DailyCollectionRecord {
  id: number;
  campId: number;
  personId: number;
  resourceTypeId: number;
  date: string;
  expectedAmount: string;
  actualAmount: string;
  differenceReason: string | null;
  recordedBy: number;
  movementId: number | null;
}

export interface InventoryMovement {
  id: string;
  campId: string;
  resourceTypeId: string;
  amount: number;
  movementType: "DAILY_COLLECTION" | "DAILY_RATION" | "EXPEDITION_DEPARTURE" | "EXPEDITION_RETURN" | "TRANSFER_SENT" | "TRANSFER_RECEIVED" | "MANUAL_ADJUSTMENT";
  sourceId: string;
  sourceType: string;
  recordedBy: string;
  date: string;
  description: string;
}

export interface InventoryAlert {
  id: string;
  campId: string;
  resourceTypeId: string;
  amountAtAlertGeneration: number;
  movementId?: string;
  alertDate: string;
  resolved: boolean;
  resolutionDate?: string;
  resolvedBy?: string;
}

export interface IntercampRequest {
  id: string;
  originCampId: string;
  destinationCampId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  description: string;
  plannedDepartureDate: string;
  plannedArrivalDate: string;
  personRequirements: { occupationId: string; quantity: number }[];
  createdDate: string;
  responseDate?: string;
  createdBy: string;
  respondedBy?: string;
}

export interface RequestResourceDetail {
  id: string;
  requestId: string;
  resourceTypeId: string;
  requestedAmount: number;
  approvedAmount: number;
}

export interface Transfer {
  id: string;
  requestId: string;
  plannedDepartureDate: string;
  actualDepartureDate?: string;
  plannedArrivalDate: string;
  actualArrivalDate?: string;
  status: "PLANNING" | "EN_ROUTE" | "DELIVERED" | "CANCELED";
  departureApprovedBy?: string;
  arrivalApprovedBy?: string;
  rationsForTrip: number;
  receptionNotes?: string;
}

export interface TransferPerson {
  id: string;
  transferId: string;
  personId: string;
  status: "CONFIRMED" | "IN_TRANSIT" | "DELIVERED" | "CANCELED";
  departureDate?: string;
  arrivalDate?: string;
}

export interface TransferHistory {
  id: string;
  transferId: string;
  previousStatus: "PLANNING" | "EN_ROUTE" | "DELIVERED" | "CANCELED";
  newStatus: "PLANNING" | "EN_ROUTE" | "DELIVERED" | "CANCELED";
  date: string;
  userId: string;
  comment?: string;
}

export interface ExpeditionResource {
  id: string;
  expeditionId: string;
  resourceTypeId: string;
  amount: number;
  recordedBy: string;
  recordDate: string;
  movementId?: string;
  type: "CONSUMED" | "OBTAINED";
}

export interface DeliveredTransferResource {
  id: string;
  transferId: string;
  resourceTypeId: string;
  sentAmount: number;
  receivedAmount: number;
  recordedBy: string;
  recordDate: string;
  movementId?: string;
}

export interface Occupation {
  id: string;
  name: string;
  description: string;
}

export interface OccupationCoverage {
  campId: string;
  occupationId: string;
  required: number;
  active: number;
}

export interface OperationalNotification {
  id: string;
  campId: string;
  userId: string;
  targetRole: string;
  type: "ALERT" | "INFO" | "SUCCESS" | "WARNING";
  title: string;
  message: string;
  read: boolean;
  createdDate: string;
  readDate?: string;
  sourceType?: string;
  sourceId?: string;
}

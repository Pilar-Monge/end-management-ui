
export interface Camp {
  id: string;
  name: string;
  location: string;
  personnelCount: number;
  maxPersonCapacity?: number;
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
  id: string | number;
  campId: string | number;
  personId: string | number;
  resourceTypeId: string | number;
  date: string;
  expectedAmount: string | number;
  actualAmount: string | number;
  differenceReason: string | null;
  recordedBy: string | number;
  movementId: string | number | null;
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
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELED";
  description: string;
  plannedDepartureDate: string;
  plannedArrivalDate: string;
  personRequirements: { occupationId: string; quantity: number }[];
  createdDate: string;
  responseDate?: string;
  createdBy: string;
  respondedBy?: string;
}

export interface RequestPersonDetail {
  id: string;
  requestId: string;
  detailType: "BY_OCCUPATION" | "SPECIFIC";
  personId: string | null;
  occupationId: string | null;
  amount: number;
  status: "PROPOSED" | "CONFIRMED" | "REJECTED";
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
  status: "PLANNING" | "EN_ROUTE" | "DELIVERED" | "PENDING_DEPARTURE" | "IN_TRANSIT" | "COMPLETED" | "CANCELED";
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

export interface CampPerson {
  id: string;
  name: string;
  campId: string;
  status: "ACTIVE" | "SICK" | "INJURED" | "OUTSIDE_CAMP" | "ON_EXPEDITION" | string;
  occupationId: string;
  role?: string;
}

export interface TransferHistory {
  id: string;
  transferId: string;
  previousStatus: Transfer["status"];
  newStatus: Transfer["status"];
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
  collects_resources?: boolean;
  resource_type_id?: string;
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

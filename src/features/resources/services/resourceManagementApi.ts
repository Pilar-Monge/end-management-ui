import { apiRequest } from "../../../shared/services/httpClient";
import type {
  Camp,
  ResourceType,
  CampInventory,
  DailyCollectionRecord,
  InventoryMovement,
  InventoryAlert,
  IntercampRequest,
  RequestResourceDetail,
  Transfer,
  TransferPerson,
  TransferHistory,
  ExpeditionResource,
  DeliveredTransferResource,
  Occupation,
  OccupationCoverage,
  OperationalNotification
} from "../types/resourceManagementTypes";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function listFromPayload<T>(payload: unknown, mapper: (item: UnknownRecord) => T): T[] {
  if (Array.isArray(payload)) return payload.map(item => mapper(asRecord(item)));

  const data = asRecord(payload);
  const candidates = [data.items, data.records, data.results, data.requests, data.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.map(item => mapper(asRecord(item)));
  }

  return [];
}

function str(value: unknown, fallback = ""): string {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function num(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function dateStr(value: unknown): string {
  return str(value, new Date().toISOString());
}

function childId(item: UnknownRecord, key: string): unknown {
  const child = item[key];
  return child && typeof child === "object" ? (child as UnknownRecord).id : undefined;
}

function status<T extends string>(value: unknown, fallback: T, allowed: readonly T[]): T {
  const normalized = str(value, fallback).toUpperCase() as T;
  return allowed.includes(normalized) ? normalized : fallback;
}

function normalizeResourceCategory(value: unknown): ResourceType["category"] {
  return status<ResourceType["category"]>(value, "OTHER", ["FOOD", "WATER", "HYGIENE", "DEFENSE", "AMMUNITION", "MEDICAL", "OTHER"]);
}

function normalizeMovementType(value: unknown): InventoryMovement["movementType"] {
  return status<InventoryMovement["movementType"]>(value, "MANUAL_ADJUSTMENT", [
    "DAILY_COLLECTION",
    "DAILY_RATION",
    "EXPEDITION_DEPARTURE",
    "EXPEDITION_RETURN",
    "TRANSFER_SENT",
    "TRANSFER_RECEIVED",
    "MANUAL_ADJUSTMENT",
  ]);
}

function normalizeRequestStatus(value: unknown): IntercampRequest["status"] {
  return status<IntercampRequest["status"]>(value, "PENDING", ["PENDING", "APPROVED", "REJECTED", "CANCELED"]);
}

function normalizeTransferStatus(value: unknown): Transfer["status"] {
  return status<Transfer["status"]>(value, "PLANNING", ["PLANNING", "EN_ROUTE", "DELIVERED", "CANCELED"]);
}

function normalizeTransferPersonStatus(value: unknown): TransferPerson["status"] {
  return status<TransferPerson["status"]>(value, "CONFIRMED", ["CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELED"]);
}

function numericId(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toApiCampInventory(data: CampInventory) {
  return {
    campId: numericId(data.campId),
    resourceTypeId: numericId(data.resourceTypeId),
    quantity: data.currentAmount,
    currentAmount: data.currentAmount,
    minimumAlertAmount: data.minimumAlertAmount,
  };
}

export function toApiInventoryMovement(data: Omit<InventoryMovement, "id">) {
  return {
    campId: numericId(data.campId),
    resourceTypeId: numericId(data.resourceTypeId),
    amount: data.amount,
    quantity: data.amount,
    movementType: data.movementType,
    type: data.movementType,
    sourceId: data.sourceId,
    sourceType: data.sourceType,
    recordedBy: data.recordedBy,
    date: data.date,
    description: data.description,
    reason: data.description,
  };
}

export function toApiIntercampRequest(data: Omit<IntercampRequest, "id">) {
  return {
    originCampId: numericId(data.originCampId),
    destinationCampId: numericId(data.destinationCampId),
    status: data.status,
    description: data.description,
    plannedDepartureDate: data.plannedDepartureDate,
    plannedArrivalDate: data.plannedArrivalDate,
    personRequirements: data.personRequirements,
    createdBy: data.createdBy,
  };
}

export function toApiTransfer(data: Omit<Transfer, "id">) {
  return {
    requestId: numericId(data.requestId),
    plannedDepartureDate: data.plannedDepartureDate,
    plannedArrivalDate: data.plannedArrivalDate,
    status: data.status,
    rationsForTrip: data.rationsForTrip,
  };
}

export const resourceApi = {
  getServerTime: () => apiRequest<{ serverTime: string }>("/system/time"),

  listCamps: async (): Promise<Camp[]> => {
    const payload = await apiRequest<unknown>("/camps?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id ?? item.campId),
      name: str(item.name ?? item.nombre, `Campamento ${item.id ?? ""}`),
      location: str(item.location ?? item.ubicacion ?? item.zone, "Sin ubicacion"),
      personnelCount: num(item.personnelCount ?? item.population ?? item.peopleCount ?? item.activePersons, 0),
    }));
  },

  listResourceTypes: async (): Promise<ResourceType[]> => {
    const payload = await apiRequest<unknown>("/resource-types?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id ?? item.resourceTypeId),
      name: str(item.name ?? item.nombre, "Recurso"),
      unitOfMeasure: str(item.unitOfMeasure ?? item.unit ?? item.measureUnit, "u"),
      category: normalizeResourceCategory(item.category ?? item.type),
      description: str(item.description ?? item.descripcion),
    }));
  },

  listOccupations: async (): Promise<Occupation[]> => {
    const payload = await apiRequest<unknown>("/occupations?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id ?? item.occupationId),
      name: str(item.name ?? item.nombre, "Oficio"),
      description: str(item.description ?? item.descripcion),
    }));
  },

  listCampInventory: async (): Promise<CampInventory[]> => {
    const payload = await apiRequest<unknown>("/camp-inventory?page=1&limit=100");
    return listFromPayload(payload, item => ({
      campId: str(item.campId ?? childId(item, "camp")),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId ?? childId(item, "resourceType")),
      currentAmount: num(item.currentAmount ?? item.quantity ?? item.amount),
      minimumAlertAmount: num(item.minimumAlertAmount ?? item.minimum ?? item.minimumQuantity ?? item.threshold),
    }));
  },

  upsertCampInventory: (data: CampInventory) => apiRequest<unknown>("/camp-inventory", {
    method: "POST",
    body: JSON.stringify(toApiCampInventory(data)),
  }),

  listDailyCollectionRecords: async (): Promise<DailyCollectionRecord[]> => {
    const payload = await apiRequest<unknown>("/daily-collection-records?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: num(item.id),
      campId: num(item.campId),
      personId: num(item.personId),
      resourceTypeId: num(item.resourceTypeId),
      date: dateStr(item.date ?? item.createdAt),
      expectedAmount: str(item.expectedAmount ?? item.expected, "0"),
      actualAmount: str(item.actualAmount ?? item.actual, "0"),
      differenceReason: item.differenceReason === null || item.differenceReason === undefined ? null : str(item.differenceReason),
      recordedBy: num(item.recordedBy),
      movementId: item.movementId === null || item.movementId === undefined ? null : num(item.movementId),
    }));
  },

  listInventoryMovements: async (): Promise<InventoryMovement[]> => {
    const payload = await apiRequest<unknown>("/inventory-movements?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      campId: str(item.campId ?? childId(item, "camp")),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId ?? childId(item, "resourceType")),
      amount: num(item.amount ?? item.quantity),
      movementType: normalizeMovementType(item.movementType ?? item.type),
      sourceId: str(item.sourceId),
      sourceType: str(item.sourceType ?? item.originType),
      recordedBy: str(item.recordedBy ?? item.userId ?? (asRecord(item.user).name), "Sistema"),
      date: dateStr(item.date ?? item.createdAt),
      description: str(item.description ?? item.reason ?? item.comment),
    }));
  },

  createInventoryMovement: (data: Omit<InventoryMovement, "id">) => apiRequest<unknown>("/inventory-movements", {
    method: "POST",
    body: JSON.stringify(toApiInventoryMovement(data)),
  }),

  deleteInventoryMovement: (id: string) => apiRequest<void>(`/inventory-movements/${id}`, { method: "DELETE" }),

  listInventoryAlerts: async (): Promise<InventoryAlert[]> => {
    const payload = await apiRequest<unknown>("/inventory-alerts?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      campId: str(item.campId ?? childId(item, "camp")),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId ?? childId(item, "resourceType")),
      amountAtAlertGeneration: num(item.amountAtAlertGeneration ?? item.amount ?? item.quantity),
      movementId: item.movementId === undefined ? undefined : str(item.movementId),
      alertDate: dateStr(item.alertDate ?? item.createdAt),
      resolved: Boolean(item.resolved ?? item.isResolved),
      resolutionDate: item.resolutionDate === undefined ? undefined : dateStr(item.resolutionDate),
      resolvedBy: item.resolvedBy === undefined ? undefined : str(item.resolvedBy),
    }));
  },

  resolveInventoryAlert: (id: string, resolvedBy: string) => apiRequest<unknown>(`/inventory-alerts/${id}/resolve`, {
    method: "PATCH",
    body: JSON.stringify({ resolvedBy }),
  }),

  listIntercampRequests: async (): Promise<IntercampRequest[]> => {
    const payload = await apiRequest<unknown>("/intercamp-requests?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      originCampId: str(item.originCampId ?? item.fromCampId),
      destinationCampId: str(item.destinationCampId ?? item.toCampId),
      status: normalizeRequestStatus(item.status),
      description: str(item.description ?? item.message ?? item.title),
      plannedDepartureDate: dateStr(item.plannedDepartureDate ?? item.departureDate),
      plannedArrivalDate: dateStr(item.plannedArrivalDate ?? item.arrivalDate),
      personRequirements: Array.isArray(item.personRequirements) ? item.personRequirements as IntercampRequest["personRequirements"] : [],
      createdDate: dateStr(item.createdDate ?? item.createdAt),
      responseDate: item.responseDate === undefined ? undefined : dateStr(item.responseDate),
      createdBy: str(item.createdBy ?? item.userId, "Sistema"),
      respondedBy: item.respondedBy === undefined ? undefined : str(item.respondedBy),
    }));
  },

  createIntercampRequest: (data: Omit<IntercampRequest, "id">) => apiRequest<unknown>("/intercamp-requests", {
    method: "POST",
    body: JSON.stringify(toApiIntercampRequest(data)),
  }),

  updateIntercampRequestStatus: (id: string, requestStatus: IntercampRequest["status"], respondedBy: string) =>
    apiRequest<unknown>(`/intercamp-requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: requestStatus, respondedBy }),
    }),

  listRequestResourceDetails: async (): Promise<RequestResourceDetail[]> => {
    const payload = await apiRequest<unknown>("/request-resource-details?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      requestId: str(item.requestId ?? item.intercampRequestId),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId),
      requestedAmount: num(item.requestedAmount ?? item.quantity ?? item.amount),
      approvedAmount: num(item.approvedAmount ?? item.approvedQuantity ?? item.quantity ?? item.amount),
    }));
  },

  createRequestResourceDetail: (requestId: string, resourceTypeId: string, requestedAmount: number) =>
    apiRequest<unknown>("/request-resource-details", {
      method: "POST",
      body: JSON.stringify({
        requestId: numericId(requestId),
        resourceTypeId: numericId(resourceTypeId),
        requestedAmount,
        approvedAmount: requestedAmount,
      }),
    }),

  updateRequestResourceDetail: (id: string, updated: Partial<RequestResourceDetail>) =>
    apiRequest<unknown>(`/request-resource-details/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updated),
    }),

  deleteRequestResourceDetail: (id: string) => apiRequest<void>(`/request-resource-details/${id}`, { method: "DELETE" }),

  listTransfers: async (): Promise<Transfer[]> => {
    const payload = await apiRequest<unknown>("/transfers?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      requestId: str(item.requestId ?? item.intercampRequestId),
      plannedDepartureDate: dateStr(item.plannedDepartureDate ?? item.departureDate),
      actualDepartureDate: item.actualDepartureDate === undefined ? undefined : dateStr(item.actualDepartureDate),
      plannedArrivalDate: dateStr(item.plannedArrivalDate ?? item.arrivalDate),
      actualArrivalDate: item.actualArrivalDate === undefined ? undefined : dateStr(item.actualArrivalDate),
      status: normalizeTransferStatus(item.status),
      departureApprovedBy: item.departureApprovedBy === undefined ? undefined : str(item.departureApprovedBy),
      arrivalApprovedBy: item.arrivalApprovedBy === undefined ? undefined : str(item.arrivalApprovedBy),
      rationsForTrip: num(item.rationsForTrip ?? item.rations),
      receptionNotes: item.receptionNotes === undefined ? undefined : str(item.receptionNotes),
    }));
  },

  createTransfer: (data: Omit<Transfer, "id">) => apiRequest<unknown>("/transfers", {
    method: "POST",
    body: JSON.stringify(toApiTransfer(data)),
  }),

  updateTransfer: (id: string, data: Partial<Transfer> & { notes?: string }) => apiRequest<unknown>(`/transfers/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),

  listTransferPersons: async (): Promise<TransferPerson[]> => {
    const payload = await apiRequest<unknown>("/transfer-persons?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      transferId: str(item.transferId),
      personId: str(item.personId),
      status: normalizeTransferPersonStatus(item.status),
      departureDate: item.departureDate === undefined ? undefined : dateStr(item.departureDate),
      arrivalDate: item.arrivalDate === undefined ? undefined : dateStr(item.arrivalDate),
    }));
  },

  createTransferPerson: (transferId: string, personId: string) => apiRequest<unknown>("/transfer-persons", {
    method: "POST",
    body: JSON.stringify({ transferId: numericId(transferId), personId: numericId(personId) || personId, status: "CONFIRMED" }),
  }),

  updateTransferPerson: (id: string, data: Partial<TransferPerson>) => apiRequest<unknown>(`/transfer-persons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }),

  deleteTransferPerson: (id: string) => apiRequest<void>(`/transfer-persons/${id}`, { method: "DELETE" }),

  listTransferHistory: async (): Promise<TransferHistory[]> => {
    const payload = await apiRequest<unknown>("/transfer-history?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      transferId: str(item.transferId),
      previousStatus: normalizeTransferStatus(item.previousStatus),
      newStatus: normalizeTransferStatus(item.newStatus),
      date: dateStr(item.date ?? item.createdAt),
      userId: str(item.userId ?? item.createdBy),
      comment: item.comment === undefined ? undefined : str(item.comment),
    }));
  },

  createTransferHistory: (data: Omit<TransferHistory, "id">) => apiRequest<unknown>("/transfer-history", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  listDeliveredTransferResources: async (): Promise<DeliveredTransferResource[]> => {
    const payload = await apiRequest<unknown>("/delivered-transfer-resources?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      transferId: str(item.transferId),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId),
      sentAmount: num(item.sentAmount),
      receivedAmount: num(item.receivedAmount),
      recordedBy: str(item.recordedBy ?? item.userId, "Sistema"),
      recordDate: dateStr(item.recordDate ?? item.createdAt),
      movementId: item.movementId === undefined ? undefined : str(item.movementId),
    }));
  },

  createDeliveredTransferResource: (data: Omit<DeliveredTransferResource, "id">) => apiRequest<unknown>("/delivered-transfer-resources", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      transferId: numericId(data.transferId),
      resourceTypeId: numericId(data.resourceTypeId),
    }),
  }),

  listExpeditionResources: async (): Promise<ExpeditionResource[]> => {
    const payload = await apiRequest<unknown>("/expedition-resources?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      expeditionId: str(item.expeditionId),
      resourceTypeId: str(item.resourceTypeId ?? item.resourceId),
      amount: num(item.amount ?? item.quantity),
      recordedBy: str(item.recordedBy ?? item.userId, "Sistema"),
      recordDate: dateStr(item.recordDate ?? item.createdAt),
      movementId: item.movementId === undefined ? undefined : str(item.movementId),
      type: status<ExpeditionResource["type"]>(item.type, "CONSUMED", ["CONSUMED", "OBTAINED"]),
    }));
  },

  createExpeditionResource: (data: Omit<ExpeditionResource, "id">) => apiRequest<unknown>("/expedition-resources", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  listOccupationCoverage: async (): Promise<OccupationCoverage[]> => {
    const payload = await apiRequest<unknown>("/occupation-coverage?page=1&limit=100");
    return listFromPayload(payload, item => ({
      campId: str(item.campId),
      occupationId: str(item.occupationId),
      required: num(item.required ?? item.requiredCount),
      active: num(item.active ?? item.activeCount),
    }));
  },

  listNotifications: async (): Promise<OperationalNotification[]> => {
    const payload = await apiRequest<unknown>("/notifications?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      campId: str(item.campId),
      userId: str(item.userId),
      targetRole: str(item.targetRole, "RESOURCE_MANAGEMENT"),
      type: status<OperationalNotification["type"]>(item.type ?? item.level, "INFO", ["ALERT", "INFO", "SUCCESS", "WARNING"]),
      title: str(item.title, "Notificacion"),
      message: str(item.message ?? item.body ?? item.description),
      read: Boolean(item.read ?? item.isRead),
      createdDate: dateStr(item.createdDate ?? item.createdAt),
      readDate: item.readDate === undefined ? undefined : dateStr(item.readDate),
      sourceType: item.sourceType === undefined ? undefined : str(item.sourceType),
      sourceId: item.sourceId === undefined ? undefined : str(item.sourceId),
    }));
  },

  createNotification: (data: Omit<OperationalNotification, "id">) => apiRequest<unknown>("/notifications", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  markNotificationRead: (id: string) => apiRequest<unknown>(`/notifications/${id}/read`, { method: "PATCH" }),
};

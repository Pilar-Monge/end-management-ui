import { apiRequest } from "../../../shared/services/httpClient";
import type {
  Camp,
  ResourceType,
  CampInventory,
  DailyCollectionRecord,
  InventoryMovement,
  InventoryAlert,
  IntercampRequest,
  RequestPersonDetail,
  RequestResourceDetail,
  Transfer,
  TransferPerson,
  TransferHistory,
  ExpeditionResource,
  DeliveredTransferResource,
  Occupation,
  OccupationCoverage,
  OperationalNotification,
  CampPerson
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
  return status<IntercampRequest["status"]>(value, "DRAFT", ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CANCELED"]);
}

function normalizePersonDetailType(value: unknown): RequestPersonDetail["detailType"] {
  return status<RequestPersonDetail["detailType"]>(value, "BY_OCCUPATION", ["BY_OCCUPATION", "SPECIFIC"]);
}

function normalizePersonDetailStatus(value: unknown): RequestPersonDetail["status"] {
  return status<RequestPersonDetail["status"]>(value, "PROPOSED", ["PROPOSED", "CONFIRMED", "REJECTED"]);
}

function normalizeTransferPersonStatus(value: unknown): TransferPerson["status"] {
  return status<TransferPerson["status"]>(value, "CONFIRMED", ["CONFIRMED", "IN_TRANSIT", "DELIVERED", "CANCELED"]);
}

function normalizePersonStatus(value: unknown): CampPerson["status"] {
  const raw = str(value, "ACTIVE").toUpperCase();
  if (["ACTIVE", "SICK", "INJURED", "OUTSIDE_CAMP", "ON_EXPEDITION"].includes(raw)) return raw;
  return raw || "ACTIVE";
}

function numericId(value: string): number {
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;

  const match = value.match(/\d+/);
  if (!match) return 0;
  const parsedFromText = Number(match[0]);
  return Number.isFinite(parsedFromText) ? parsedFromText : 0;
}

function readCurrentUserId(): number {
  if (typeof window === "undefined") return 0;

  const candidates = [
    localStorage.getItem("session_user"),
    localStorage.getItem("user"),
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as { userId?: unknown; id?: unknown };
      const id = Number(parsed.userId ?? parsed.id);
      if (Number.isFinite(id) && id > 0) return id;
    } catch {}
  }

  return 3;
}

function toBackendTransferStatus(statusValue?: Transfer["status"]) {
  if (statusValue === "EN_ROUTE" || statusValue === "IN_TRANSIT") return "IN_TRANSIT";
  if (statusValue === "DELIVERED" || statusValue === "COMPLETED") return "COMPLETED";
  if (statusValue === "CANCELED") return "CANCELED";
  return "PENDING_DEPARTURE";
}

function fromBackendTransferStatus(item: UnknownRecord): Transfer["status"] {
  const rawStatus = str(item.status, "PENDING_DEPARTURE").toUpperCase();
  if (rawStatus === "PENDING_DEPARTURE") return "PENDING_DEPARTURE";
  if (rawStatus === "IN_TRANSIT") return "IN_TRANSIT";
  if (rawStatus === "COMPLETED") return "COMPLETED";
  if (rawStatus === "CANCELED") return "CANCELED";
  return "PENDING_DEPARTURE";
}

function mapTransfer(item: UnknownRecord): Transfer {
  return {
    id: str(item.id),
    requestId: str(item.requestId ?? item.intercampRequestId),
    plannedDepartureDate: dateStr(item.plannedDepartureDate ?? item.departureDate),
    actualDepartureDate: item.actualDepartureDate === undefined ? undefined : dateStr(item.actualDepartureDate),
    plannedArrivalDate: dateStr(item.plannedArrivalDate ?? item.arrivalDate),
    actualArrivalDate: item.actualArrivalDate === undefined ? undefined : dateStr(item.actualArrivalDate),
    status: fromBackendTransferStatus(item),
    departureApprovedBy: item.departureApprovedBy === undefined ? undefined : str(item.departureApprovedBy),
    arrivalApprovedBy: item.arrivalApprovedBy === undefined ? undefined : str(item.arrivalApprovedBy),
    rationsForTrip: num(item.rationsForTrip ?? item.rations),
    receptionNotes: item.receptionNotes === undefined ? undefined : str(item.receptionNotes),
  };
}

function mapTransferPerson(item: UnknownRecord): TransferPerson {
  return {
    id: str(item.id),
    transferId: str(item.transferId),
    personId: str(item.personId),
    status: normalizeTransferPersonStatus(item.status),
    departureDate: item.departureDate === undefined ? undefined : dateStr(item.departureDate),
    arrivalDate: item.arrivalDate === undefined ? undefined : dateStr(item.arrivalDate),
  };
}

function mapDeliveredTransferResource(item: UnknownRecord): DeliveredTransferResource {
  return {
    id: str(item.id),
    transferId: str(item.transferId),
    resourceTypeId: str(item.resourceTypeId ?? item.resourceId),
    sentAmount: num(item.sentAmount),
    receivedAmount: num(item.receivedAmount),
    recordedBy: str(item.recordedBy ?? item.userId, "Sistema"),
    recordDate: dateStr(item.recordDate ?? item.createdAt),
    movementId: item.movementId === undefined ? undefined : str(item.movementId),
  };
}

function toUiNotificationType(value: unknown): OperationalNotification["type"] {
  const rawType = str(value, "INFO").toUpperCase();
  if (rawType.includes("ALERT")) return "ALERT";
  if (rawType.includes("REJECTED") || rawType.includes("CANCELED")) return "WARNING";
  if (rawType.includes("APPROVED") || rawType.includes("COMPLETED") || rawType.includes("RECORDED")) return "SUCCESS";
  return "INFO";
}

function toBackendNotificationType(value: OperationalNotification["type"]) {
  if (value === "ALERT" || value === "WARNING") return "INVENTORY_ALERT";
  if (value === "SUCCESS") return "TRANSFER_COMPLETED";
  return "ROLE_UPDATED";
}

function mapNotification(item: UnknownRecord): OperationalNotification {
  return {
    id: str(item.id),
    campId: str(item.campId),
    userId: str(item.userId),
    targetRole: str(item.targetRole, "RESOURCE_MANAGEMENT"),
    type: toUiNotificationType(item.type ?? item.level),
    title: str(item.title, "Notificacion"),
    message: str(item.message ?? item.body ?? item.description),
    read: Boolean(item.read ?? item.isRead),
    createdDate: dateStr(item.createdDate ?? item.createdAt),
    readDate: item.readDate === undefined ? undefined : dateStr(item.readDate),
    sourceType: item.sourceType === undefined ? undefined : str(item.sourceType),
    sourceId: item.sourceId === undefined ? undefined : str(item.sourceId),
  };
}

function toApiNotification(data: Omit<OperationalNotification, "id">) {
  const payload: Record<string, unknown> = {
    campId: numericId(data.campId),
    type: toBackendNotificationType(data.type),
    title: data.title,
    message: data.message,
    read: data.read,
    createdDate: data.createdDate,
    sourceType: data.sourceType ?? "resource_panel",
    sourceId: data.sourceId ? numericId(data.sourceId) : null,
  };

  if (data.userId) {
    payload.userId = numericId(data.userId);
  }

  if (data.targetRole) {
    payload.targetRole = data.targetRole;
  }

  return payload;
}

async function listAccessibleTransfers(): Promise<Transfer[]> {
  const requestsPayload = await apiRequest<unknown>("/intercamp-requests?page=1&limit=100");
  const requests = listFromPayload(requestsPayload, item => ({ id: str(item.id) })).filter(request => request.id);

  const batches = await Promise.allSettled(
    requests.map(request => apiRequest<unknown>(`/transfers?requestId=${encodeURIComponent(request.id)}&page=1&limit=100`)),
  );

  return batches.flatMap(result => (
    result.status === "fulfilled"
      ? listFromPayload(result.value, mapTransfer)
      : []
  ));
}

export function toApiCampInventory(data: CampInventory) {
  return {
    campId: numericId(data.campId),
    resourceTypeId: numericId(data.resourceTypeId),
    currentAmount: String(data.currentAmount),
    minimumAlertAmount: String(data.minimumAlertAmount),
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
    description: data.description,
    plannedDepartureDate: data.plannedDepartureDate,
    plannedArrivalDate: data.plannedArrivalDate,
    createdBy: numericId(data.createdBy) || readCurrentUserId(),
  };
}

function mapIntercampRequest(item: UnknownRecord): IntercampRequest {
  return {
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
  };
}

export function toApiTransfer(data: Omit<Transfer, "id">) {
  return {
    requestId: numericId(data.requestId),
    plannedDepartureDate: data.plannedDepartureDate,
    plannedArrivalDate: data.plannedArrivalDate,
    status: toBackendTransferStatus(data.status),
    rationsForTrip: String(data.rationsForTrip ?? 0),
  };
}

export const resourceApi = {
  getServerTime: () => apiRequest<{ serverTime: string }>("/system/time"),

  listCamps: async (): Promise<Camp[]> => {
    const payload = await apiRequest<unknown>("/camps?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id ?? item.campId),
      name: str(item.name ?? item.nombre, `Campamento ${item.id ?? ""}`),
      location: str(item.location ?? item.ubicacion ?? item.zone ?? item.description, "Sin ubicacion"),
      personnelCount: num(item.personnelCount ?? item.population ?? item.peopleCount ?? item.activePersons, 0),
      maxPersonCapacity: num(item.maxPersonCapacity ?? item.maximumCapacity ?? item.capacity, 0),
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

  upsertCampInventory: (data: CampInventory) => apiRequest<unknown>(`/camp-inventory/${numericId(data.campId)}/${numericId(data.resourceTypeId)}`, {
    method: "PUT",
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

  resolveInventoryAlert: (id: string, resolvedBy: string) => apiRequest<unknown>(`/inventory-alerts/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      resolved: true,
      resolvedBy: numericId(resolvedBy),
      resolutionDate: new Date().toISOString(),
    }),
  }),

  listIntercampRequests: async (): Promise<IntercampRequest[]> => {
    const payload = await apiRequest<unknown>("/intercamp-requests?page=1&limit=100");
    return listFromPayload(payload, mapIntercampRequest);
  },

  createIntercampRequest: async (data: Omit<IntercampRequest, "id">): Promise<IntercampRequest | null> => {
    const payload = await apiRequest<unknown>("/intercamp-requests", {
      method: "POST",
      body: JSON.stringify(toApiIntercampRequest(data)),
    });
    const record = asRecord(payload);
    const dataRecord = record.data !== undefined && record.data !== null ? asRecord(record.data) : record;
    return dataRecord.id !== undefined ? mapIntercampRequest(dataRecord) : null;
  },

  updateIntercampRequestStatus: (id: string, requestStatus: IntercampRequest["status"], respondedBy: string, transportPersonIds?: string[]) =>
    apiRequest<unknown>(`/intercamp-requests/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        status: requestStatus,
        respondedBy: numericId(respondedBy),
        responseDate: new Date().toISOString(),
        ...(transportPersonIds && transportPersonIds.length > 0
          ? { transportPersonIds: transportPersonIds.map(numericId).filter(idValue => idValue > 0) }
          : {}),
      }),
    }),

  submitIntercampRequest: (id: string) =>
    apiRequest<unknown>(`/intercamp-requests/${id}/submit`, {
      method: "POST",
    }),

  listRequestPersonDetails: async (): Promise<RequestPersonDetail[]> => {
    const payload = await apiRequest<unknown>("/request-person-details?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id),
      requestId: str(item.requestId ?? item.intercampRequestId),
      detailType: normalizePersonDetailType(item.detailType),
      personId: item.personId === null || item.personId === undefined ? null : str(item.personId),
      occupationId: item.occupationId === null || item.occupationId === undefined ? null : str(item.occupationId),
      amount: num(item.amount, 1),
      status: normalizePersonDetailStatus(item.status),
    }));
  },

  createRequestPersonDetail: (data: Omit<RequestPersonDetail, "id">) =>
    apiRequest<unknown>("/request-person-details", {
      method: "POST",
      body: JSON.stringify({
        requestId: numericId(data.requestId),
        detailType: data.detailType,
        personId: data.personId ? numericId(data.personId) : null,
        occupationId: data.occupationId ? numericId(data.occupationId) : null,
        amount: data.amount,
        status: data.status,
      }),
    }),

  deleteRequestPersonDetail: (id: string) =>
    apiRequest<void>(`/request-person-details/${id}`, { method: "DELETE" }),

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
        requestedAmount: String(requestedAmount),
        approvedAmount: null,
      }),
    }),

  updateRequestResourceDetail: (id: string, updated: Partial<RequestResourceDetail>) =>
    apiRequest<unknown>(`/request-resource-details/${id}`, {
      method: "PUT",
      body: JSON.stringify(updated),
    }),

  deleteRequestResourceDetail: (id: string) => apiRequest<void>(`/request-resource-details/${id}`, { method: "DELETE" }),

  listTransfers: async (): Promise<Transfer[]> => {
    try {
      const payload = await apiRequest<unknown>("/transfers?page=1&limit=100");
      return listFromPayload(payload, mapTransfer);
    } catch {
      return listAccessibleTransfers();
    }
  },

  updateTransferTransportStaff: (id: string, transportPersonIds: string[]) =>
    apiRequest<unknown>(`/transfers/${id}/transport-staff`, {
      method: "PUT",
      body: JSON.stringify({
        transportPersonIds: transportPersonIds.map(numericId).filter(idValue => idValue > 0),
      }),
    }),

  createTransfer: (data: Omit<Transfer, "id">) => apiRequest<unknown>("/transfers", {
    method: "POST",
    body: JSON.stringify(toApiTransfer(data)),
  }),

  updateTransfer: (id: string, data: Partial<Transfer> & { notes?: string }) => {
    const actorId = readCurrentUserId();
    const payload: Record<string, unknown> = {
      ...data,
      status: toBackendTransferStatus(data.status),
      receptionNotes: data.receptionNotes ?? data.notes,
    };

    delete payload.notes;

    if (data.status === "EN_ROUTE") {
      payload.departureApprovedBy = actorId;
      payload.actualDepartureDate = data.actualDepartureDate ?? new Date().toISOString();
    }

    if (data.status === "DELIVERED" || data.status === "COMPLETED") {
      payload.departureApprovedBy = data.departureApprovedBy ? numericId(data.departureApprovedBy) : actorId;
      payload.arrivalApprovedBy = actorId;
      payload.actualArrivalDate = data.actualArrivalDate ?? new Date().toISOString();
    }

    return apiRequest<unknown>(`/transfers/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  listTransferPersons: async (): Promise<TransferPerson[]> => {
    try {
      const payload = await apiRequest<unknown>("/transfer-persons?page=1&limit=100");
      return listFromPayload(payload, mapTransferPerson);
    } catch {
      const transfers = await listAccessibleTransfers();
      const batches = await Promise.allSettled(
        transfers.map(transfer => apiRequest<unknown>(`/transfer-persons?transferId=${encodeURIComponent(transfer.id)}&page=1&limit=100`)),
      );

      return batches.flatMap(result => (
        result.status === "fulfilled"
          ? listFromPayload(result.value, mapTransferPerson)
          : []
      ));
    }
  },

  createTransferPerson: (transferId: string, personId: string) => apiRequest<unknown>("/transfer-persons", {
    method: "POST",
    body: JSON.stringify({ transferId: numericId(transferId), personId: numericId(personId) || personId, status: "CONFIRMED" }),
  }),

  updateTransferPerson: (id: string, data: Partial<TransferPerson>) => apiRequest<unknown>(`/transfer-persons/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  }),

  listTransferHistory: async (): Promise<TransferHistory[]> => {
    const mapHistory = (item: UnknownRecord): TransferHistory => ({
      id: str(item.id),
      transferId: str(item.transferId),
      previousStatus: fromBackendTransferStatus({ status: item.previousStatus }),
      newStatus: fromBackendTransferStatus({ status: item.newStatus }),
      date: dateStr(item.date ?? item.createdAt),
      userId: str(item.userId ?? item.createdBy),
      comment: item.comment === undefined ? undefined : str(item.comment),
    });

    try {
      const payload = await apiRequest<unknown>("/transfer-history?page=1&limit=100");
      return listFromPayload(payload, mapHistory);
    } catch {
      const transfers = await listAccessibleTransfers();
      const batches = await Promise.allSettled(
        transfers.map(transfer => apiRequest<unknown>(`/transfer-history?transferId=${encodeURIComponent(transfer.id)}&page=1&limit=100`)),
      );

      return batches.flatMap(result => (
        result.status === "fulfilled"
          ? listFromPayload(result.value, mapHistory)
          : []
      ));
    }
  },

  createTransferHistory: (data: Omit<TransferHistory, "id">) => apiRequest<unknown>("/transfer-history", {
    method: "POST",
    body: JSON.stringify(data),
  }),

  listDeliveredTransferResources: async (): Promise<DeliveredTransferResource[]> => {
    try {
      const payload = await apiRequest<unknown>("/delivered-transfer-resources?page=1&limit=100");
      return listFromPayload(payload, mapDeliveredTransferResource);
    } catch {
      const transfers = await listAccessibleTransfers();
      const batches = await Promise.allSettled(
        transfers.map(transfer => apiRequest<unknown>(`/delivered-transfer-resources?transferId=${encodeURIComponent(transfer.id)}&page=1&limit=100`)),
      );

      return batches.flatMap(result => (
        result.status === "fulfilled"
          ? listFromPayload(result.value, mapDeliveredTransferResource)
          : []
      ));
    }
  },

  listPeople: async (): Promise<CampPerson[]> => {
    const payload = await apiRequest<unknown>("/person?page=1&limit=100");
    return listFromPayload(payload, item => ({
      id: str(item.id ?? item.personId),
      name: str(item.name ?? item.fullName ?? item.username ?? `Persona ${item.id ?? ""}`),
      campId: str(item.campId ?? childId(item, "camp")),
      status: normalizePersonStatus(item.currentStatus ?? item.status ?? item.current_status),
      occupationId: str(item.occupationId ?? childId(item, "occupation")),
    }));
  },


  createDeliveredTransferResource: (data: Omit<DeliveredTransferResource, "id">) => apiRequest<unknown>("/delivered-transfer-resources", {
    method: "POST",
    body: JSON.stringify({
      ...data,
      transferId: numericId(data.transferId),
      resourceTypeId: numericId(data.resourceTypeId),
      recordedBy: numericId(data.recordedBy) || readCurrentUserId(),
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
    return listFromPayload(payload, mapNotification);
  },

  createNotification: async (data: Omit<OperationalNotification, "id">): Promise<OperationalNotification> => {
    const payload = await apiRequest<unknown>("/notifications", {
    method: "POST",
      body: JSON.stringify(toApiNotification(data)),
    });
    return mapNotification(asRecord(payload));
  },

  markNotificationRead: (id: string) => apiRequest<unknown>(`/notifications/${id}`, {
    method: "PUT",
    body: JSON.stringify({ read: true }),
  }),
};

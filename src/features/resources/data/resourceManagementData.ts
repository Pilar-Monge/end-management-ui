
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

export const INITIAL_CAMPS: Camp[] = [
  { id: "1", name: "Alpha Bunker", location: "Sector Central Militar", personnelCount: 35 },
  { id: "2", name: "Sierra Base", location: "Barranco de Titanio - Minería", personnelCount: 18 },
  { id: "3", name: "Delta Refuge", location: "Río Este - Hidropónicos", personnelCount: 24 },
  { id: "4", name: "Omega Fortress", location: "Frontera Defensiva", personnelCount: 12 },
  { id: "5", name: "Echo Outpost", location: "Zonificación Exterior", personnelCount: 15 },
];

export const INITIAL_RESOURCE_TYPES: ResourceType[] = [
  { id: "rt-food", name: "Raciones Rústicas d-AL alimentos", unitOfMeasure: "kg", category: "FOOD", description: "Comida deshidratada compactada de supervivencia" },
  { id: "rt-water", name: "H2O Filtrada ultra-pura", unitOfMeasure: "lts", category: "WATER", description: "Agua purificada destilada libre de toxinas" },
  { id: "rt-medical", name: "Packs de Insumo BioClínico", unitOfMeasure: "packs", category: "MEDICAL", description: "Botiquines analgésicos y de trauma avanzado" },
  { id: "rt-defense", name: "Celdas de Escudo Defensa", unitOfMeasure: "units", category: "DEFENSE", description: "Empaques electromagnéticos de protección zonal" },
  { id: "rt-fuel", name: "Combustible Hidrógeno Sintético", unitOfMeasure: "lts", category: "OTHER", description: "Carga química de combustión densa" },
  { id: "rt-parts", name: "Aleaciones para Repuesto Técnico", unitOfMeasure: "u", category: "OTHER", description: "Enseres mecánicos universales de titanio" },
];

export const INITIAL_CAMP_INVENTORIES: CampInventory[] = [
  { campId: "1", resourceTypeId: "rt-food", currentAmount: 500, minimumAlertAmount: 100 },
  { campId: "1", resourceTypeId: "rt-water", currentAmount: 800, minimumAlertAmount: 150 },
  { campId: "1", resourceTypeId: "rt-medical", currentAmount: 150, minimumAlertAmount: 30 },
  { campId: "1", resourceTypeId: "rt-defense", currentAmount: 200, minimumAlertAmount: 40 },
  { campId: "1", resourceTypeId: "rt-fuel", currentAmount: 400, minimumAlertAmount: 100 },
  { campId: "1", resourceTypeId: "rt-parts", currentAmount: 250, minimumAlertAmount: 50 },

  { campId: "2", resourceTypeId: "rt-food", currentAmount: 120, minimumAlertAmount: 100 },
  { campId: "2", resourceTypeId: "rt-water", currentAmount: 150, minimumAlertAmount: 150 },
  { campId: "2", resourceTypeId: "rt-medical", currentAmount: 25, minimumAlertAmount: 30 },
  { campId: "2", resourceTypeId: "rt-defense", currentAmount: 80, minimumAlertAmount: 25 },
  { campId: "2", resourceTypeId: "rt-fuel", currentAmount: 180, minimumAlertAmount: 80 },
  { campId: "2", resourceTypeId: "rt-parts", currentAmount: 90, minimumAlertAmount: 35 },

  { campId: "3", resourceTypeId: "rt-food", currentAmount: 450, minimumAlertAmount: 120 },
  { campId: "3", resourceTypeId: "rt-water", currentAmount: 550, minimumAlertAmount: 150 },
  { campId: "3", resourceTypeId: "rt-medical", currentAmount: 40, minimumAlertAmount: 25 },
  { campId: "3", resourceTypeId: "rt-defense", currentAmount: 60, minimumAlertAmount: 15 },
  { campId: "3", resourceTypeId: "rt-fuel", currentAmount: 120, minimumAlertAmount: 50 },
  { campId: "3", resourceTypeId: "rt-parts", currentAmount: 45, minimumAlertAmount: 30 },

  { campId: "4", resourceTypeId: "rt-food", currentAmount: 80, minimumAlertAmount: 125 },
  { campId: "4", resourceTypeId: "rt-water", currentAmount: 90, minimumAlertAmount: 120 },
  { campId: "4", resourceTypeId: "rt-medical", currentAmount: 15, minimumAlertAmount: 25 },
  { campId: "4", resourceTypeId: "rt-defense", currentAmount: 400, minimumAlertAmount: 50 },
  { campId: "4", resourceTypeId: "rt-fuel", currentAmount: 70, minimumAlertAmount: 80 },
  { campId: "4", resourceTypeId: "rt-parts", currentAmount: 30, minimumAlertAmount: 20 },

  { campId: "5", resourceTypeId: "rt-food", currentAmount: 200, minimumAlertAmount: 50 },
  { campId: "5", resourceTypeId: "rt-water", currentAmount: 250, minimumAlertAmount: 50 },
  { campId: "5", resourceTypeId: "rt-medical", currentAmount: 30, minimumAlertAmount: 10 },
  { campId: "5", resourceTypeId: "rt-defense", currentAmount: 50, minimumAlertAmount: 10 },
  { campId: "5", resourceTypeId: "rt-fuel", currentAmount: 100, minimumAlertAmount: 30 },
  { campId: "5", resourceTypeId: "rt-parts", currentAmount: 60, minimumAlertAmount: 15 },
];

export const INITIAL_DAILY_COLLECTIONS: DailyCollectionRecord[] = [
  { id: 1, campId: 3, personId: 301, resourceTypeId: 1, date: "2026-05-19", expectedAmount: "200.00", actualAmount: "215.00", differenceReason: "Cosecha mayoritaria en invernaderos", recordedBy: 3, movementId: null },
  { id: 2, campId: 4, personId: 401, resourceTypeId: 2, date: "2026-05-19", expectedAmount: "50.00", actualAmount: "35.00", differenceReason: "Escapes de válvula de recolector", recordedBy: 3, movementId: null },
];

export const INITIAL_MOVEMENTS: InventoryMovement[] = [
  { id: "mov-init-1", campId: "2", resourceTypeId: "rt-food", amount: 50, movementType: "DAILY_RATION", sourceId: "ext-ration", sourceType: "System", recordedBy: "M. Operator", date: "19/05 12:00", description: "Racionamiento ordinario del personal" },
  { id: "mov-init-2", campId: "2", resourceTypeId: "rt-parts", amount: 90, movementType: "DAILY_COLLECTION", sourceId: "ext-taller", sourceType: "System", recordedBy: "M. Operator", date: "19/05 14:30", description: "Producción local de taller de repuestos" },
  { id: "mov-init-3", campId: "4", resourceTypeId: "rt-water", amount: 30, movementType: "DAILY_RATION", sourceId: "ext-exp", sourceType: "System", recordedBy: "M. Operator", date: "19/05 16:00", description: "Asignación para expediciones tácticas" },
];

export const INITIAL_ALERTS: InventoryAlert[] = [
  { id: "al-1", campId: "4", resourceTypeId: "rt-food", amountAtAlertGeneration: 80, alertDate: "19/05 10:15", resolved: false },
  { id: "al-2", campId: "4", resourceTypeId: "rt-water", amountAtAlertGeneration: 90, alertDate: "19/05 11:30", resolved: false },
  { id: "al-3", campId: "2", resourceTypeId: "rt-water", amountAtAlertGeneration: 150, alertDate: "19/05 13:00", resolved: true, resolutionDate: "19/05 15:40", resolvedBy: "M. Operator" },
];

export const INITIAL_INTERCAMP_REQUESTS: IntercampRequest[] = [
  {
    id: "req-1",
    originCampId: "1",
    destinationCampId: "4",
    status: "APPROVED",
    description: "Abastecimiento urgente de comida e insumo médico",
    plannedDepartureDate: "2026-05-20",
    plannedArrivalDate: "2026-05-21",
    personRequirements: [{ occupationId: "occ-soldier", quantity: 2 }, { occupationId: "occ-pilot", quantity: 1 }],
    createdDate: "19/05 18:00",
    createdBy: "Operator Alfa",
  },
  {
    id: "req-2",
    originCampId: "3",
    destinationCampId: "2",
    status: "PENDING",
    description: "Suministro complementario de alimentos frescos",
    plannedDepartureDate: "2026-05-22",
    plannedArrivalDate: "2026-05-23",
    personRequirements: [{ occupationId: "occ-driver", quantity: 1 }],
    createdDate: "19/05 21:00",
    createdBy: "Camp Bravo Admin",
  }
];

export const INITIAL_REQUEST_RESOURCE_DETAILS: RequestResourceDetail[] = [
  { id: "det-1", requestId: "req-1", resourceTypeId: "rt-food", requestedAmount: 150, approvedAmount: 150 },
  { id: "det-2", requestId: "req-1", resourceTypeId: "rt-medical", requestedAmount: 20, approvedAmount: 20 },
  { id: "det-3", requestId: "req-2", resourceTypeId: "rt-food", requestedAmount: 50, approvedAmount: 0 },
];

export const INITIAL_TRANSFERS: Transfer[] = [
  { id: "tr-1", requestId: "req-1", plannedDepartureDate: "2026-05-20", plannedArrivalDate: "2026-05-21", status: "PLANNING", rationsForTrip: 10, receptionNotes: "" },
];

export const INITIAL_TRANSFER_PERSONS: TransferPerson[] = [
  { id: "tp-1", transferId: "tr-1", personId: "p-soldier1", status: "CONFIRMED" },
  { id: "tp-2", transferId: "tr-1", personId: "p-pilot1", status: "CONFIRMED" },
];

export const INITIAL_EXPEDITIONS_RESOURCES: ExpeditionResource[] = [
  { id: "er-1", expeditionId: "exp-09", resourceTypeId: "rt-food", amount: 15, recordedBy: "Operator Alfa", recordDate: "19/05 12:00", type: "CONSUMED" },
  { id: "er-2", expeditionId: "exp-09", resourceTypeId: "rt-water", amount: 20, recordedBy: "Operator Alfa", recordDate: "19/05 12:00", type: "CONSUMED" },
  { id: "er-3", expeditionId: "exp-09", resourceTypeId: "rt-parts", amount: 45, recordedBy: "Operator Alfa", recordDate: "19/05 18:00", type: "OBTAINED" },
];

export const INITIAL_DELIVERED_TRANSFER_RESOURCES: DeliveredTransferResource[] = [
  { id: "dtr-1", transferId: "tr-sample", resourceTypeId: "rt-food", sentAmount: 100, receivedAmount: 100, recordedBy: "M. Operator", recordDate: "19/05 18:00" },
];

export const INITIAL_OCCUPATIONS: Occupation[] = [
  { id: "occ-soldier", name: "Guarda / Defensor Armado", description: "Perímetro blindado y resguardo hostil táctico" },
  { id: "occ-pilot", name: "Piloto de Aeronave Quad VTOL", description: "Conductor especialista en vehículos de vuelo" },
  { id: "occ-driver", name: "Conductor de Blindado Terrestre", description: "Maniobras de convoy pesado de recursos" },
  { id: "occ-medic", name: "Médico de Emergencia de Campo", description: "Diagnósticos rápidos e intervenciones de trauma" },
];

export const INITIAL_OCCUPATION_COVERAGES: OccupationCoverage[] = [
  { campId: "1", occupationId: "occ-soldier", required: 10, active: 10 },
  { campId: "1", occupationId: "occ-pilot", required: 4, active: 4 },
  { campId: "2", occupationId: "occ-medic", required: 2, active: 1 }, 
  { campId: "3", occupationId: "occ-driver", required: 3, active: 3 },
  { campId: "4", occupationId: "occ-soldier", required: 8, active: 4 }, 
];

export const INITIAL_NOTIFICATIONS: OperationalNotification[] = [
  { id: "not-1", campId: "4", userId: "user-op", targetRole: "RESOURCE_MANAGEMENT", type: "WARNING", title: "Carga Crítica", message: "Avanzada Delta tiene menos del 20% de alimentos estándar", read: false, createdDate: "19/05 10:30" },
  { id: "not-2", campId: "2", userId: "user-op", targetRole: "RESOURCE_MANAGEMENT", type: "SUCCESS", title: "Resolución de Alerta", message: "Se han rellenado las celdas de agua en Campamento Bravo", read: true, createdDate: "19/05 15:40" },
];

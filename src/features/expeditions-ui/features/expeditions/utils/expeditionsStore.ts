export interface DBExpedition {
  id: number;
  name: string;
  dest: string;
  status: "PLANIFICADA" | "COMPLETADA" | "CANCELADA" | "IN_PROGRESS" | "DELAYED" | "LOST" | "RETURNED_AFTER_LOST" | "PLANNED" | "COMPLETED" | "CANCELED";
  departure: string;
  returnDate: string;
  participants: number;
  resources: string;
  extraDays: number;
  extraUsed: number;
  objective: string;
  lat: number;
  lng: number;
  danger: string;
  climate: string;
  assignedPersonnelIds: number[];
  startLat?: number;
  startLng?: number;
  startLabel?: string;
}

const STORAGE_KEY = "tactical_expeditions_list";

export function getExpeditions(): DBExpedition[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Error parsing stored expeditions", e);
    }
  }

  // Pre-seed with mock expeditions having lat/lng coordinates matching the regional camps
  const seeded: DBExpedition[] = [
    {
      id: 1,
      name: "Valle Profundo",
      dest: "Valle Poás (CR)",
      status: "IN_PROGRESS",
      departure: "15/05 08:00",
      returnDate: "20/05 18:00",
      participants: 2,
      resources: "20 kg",
      extraDays: 3,
      extraUsed: 2,
      objective: "Reconocimiento de zona norte en el borde botánico",
      lat: 10.20,
      lng: -84.23,
      danger: "Alto",
      climate: "Húmedo templado",
      assignedPersonnelIds: [7, 12],
      startLat: 9.93,
      startLng: -84.08,
      startLabel: "Base Alfa CR"
    },
    {
      id: 2,
      name: "Río Oeste en Tránsito",
      dest: "Isla Coiba (PA)",
      status: "PLANNED",
      departure: "28/05 06:00",
      returnDate: "02/06 16:00",
      participants: 0,
      resources: "Suministros biológicos",
      extraDays: 5,
      extraUsed: 0,
      objective: "Muestreo fluvial e hidráulico en las inmediaciones del litoral costero",
      lat: 7.47,
      lng: -81.80,
      danger: "Medio",
      climate: "Húmedo",
      assignedPersonnelIds: [],
      startLat: 8.53,
      startLng: -80.78,
      startLabel: "Base Sur PA"
    },
    {
      id: 3,
      name: "Montaña Negra Extra",
      dest: "Isla Ometepe (NI)",
      status: "DELAYED",
      departure: "10/05 08:00",
      returnDate: "15/05 18:00",
      participants: 1,
      resources: "15 kg",
      extraDays: 3,
      extraUsed: 3,
      objective: "Exploración de fallas tectónicas y búsqueda de cristales energéticos",
      lat: 11.54,
      lng: -85.52,
      danger: "Extremo",
      climate: "Ceniza Fría",
      assignedPersonnelIds: [3],
      startLat: 12.11,
      startLng: -86.25,
      startLabel: "Base Norte NI"
    },
    {
      id: 4,
      name: "Costa Esmeralda",
      dest: "Islas Galápagos (EC)",
      status: "COMPLETED",
      departure: "01/05 07:00",
      returnDate: "05/05 17:00",
      participants: 3,
      resources: "45 kg",
      extraDays: 2,
      extraUsed: 0,
      objective: "Recuperación de cápsulas espaciales caídas en el Pacífico Occidental",
      lat: -0.75,
      lng: -91.07,
      danger: "Bajo",
      climate: "Árido seco",
      assignedPersonnelIds: [5, 9, 15],
      startLat: -0.18,
      startLng: -78.46,
      startLabel: "Base Occidente EC"
    },
  ];

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}

export function saveExpedition(exp: Omit<DBExpedition, "id">): DBExpedition {
  const current = getExpeditions();
  const nextId = current.length > 0 ? Math.max(...current.map(e => e.id)) + 1 : 1;
  const newExp: DBExpedition = {
    ...exp,
    id: nextId,
  };
  const updated = [...current, newExp];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  // Sync back-end / static assignments triggers
  const storedAssignments = localStorage.getItem("expedition_assignments") || "{}";
  try {
    const assignmentsObj = JSON.parse(storedAssignments);
    exp.assignedPersonnelIds.forEach(pId => {
      if (!assignmentsObj[pId]) assignmentsObj[pId] = [];
      if (!assignmentsObj[pId].includes(nextId)) {
        assignmentsObj[pId].push(nextId);
      }
    });
    localStorage.setItem("expedition_assignments", JSON.stringify(assignmentsObj));
  } catch (err) {
    console.error(err);
  }

  return newExp;
}

export function getAssignments(): Record<number, number[]> {
  const stored = localStorage.getItem("expedition_assignments");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  // Default pre-seeded assignments
  const defaultAssignments: Record<number, number[]> = {
    7: [1], // Mario Hugo to Valle Profundo
    12: [1], // Ana García to Valle Profundo
    3: [3], // María Sánchez to Montaña Negra
    5: [4], // Juan López to Costa Esmeralda
    9: [4], // Carlos Ruiz to Costa Esmeralda
    15: [4], // Lucía Torres to Costa Esmeralda
  };
  localStorage.setItem("expedition_assignments", JSON.stringify(defaultAssignments));
  return defaultAssignments;
}

export function assignPersonToExpedition(personId: number, expeditionId: number): void {
  const currentAssignments = getAssignments();
  if (!currentAssignments[personId]) {
    currentAssignments[personId] = [];
  }
  if (!currentAssignments[personId].includes(expeditionId)) {
    currentAssignments[personId].push(expeditionId);
    localStorage.setItem("expedition_assignments", JSON.stringify(currentAssignments));

    // Also update the expedition participants count
    const exps = getExpeditions();
    const updated = exps.map(e => {
      if (e.id === expeditionId) {
        const personnel = e.assignedPersonnelIds || [];
        if (!personnel.includes(personId)) {
          const newPersonnel = [...personnel, personId];
          return {
            ...e,
            assignedPersonnelIds: newPersonnel,
            participants: newPersonnel.length
          };
        }
      }
      return e;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
}

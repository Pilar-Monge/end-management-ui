import { useState, useEffect } from "react";
import {
  Btn,
  MissionShell,
  MissionStack,
} from "../components/SharedLayout";
import { TacticalDatePicker, TacticalTimePicker } from "../components/TacticalDateTimePicker";
import {
  createExpedition,
  getCurrentExpeditionUser,
  listAvailablePeople,
  listCampInventory,
  type ExpeditionPerson,
} from "../../../services/expeditionsUi.service";

interface ExpeditionCreateProps {
  onNavigate?: (sub: string, id?: number) => void;
}

const CAMPS = [
  { id: "camp_alfa", name: "Alpha Bunker [USA]", lat: 39.8283, lng: -98.5795, country: "USA" },
  { id: "camp_norte", name: "Sierra Base [Berlín]", lat: 52.52, lng: 13.405, country: "Alemania" },
  { id: "camp_sur", name: "Delta Refuge [Buenos Aires]", lat: -34.6037, lng: -58.3816, country: "Argentina" },
  { id: "camp_este", name: "Omega Fortress [Tokio]", lat: 35.6762, lng: 139.6503, country: "Japón" },
  { id: "camp_oeste", name: "Echo Outpost [Namibia]", lat: -22.5621, lng: 17.0658, country: "Namibia" }
];

interface CurrentUser {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  campId: number;
  campName: string;
  photoUrl?: string;
}

const USER_CAMP_ID_MAP: Record<number, string> = {
  1: "camp_alfa",
  2: "camp_norte",
  3: "camp_sur",
  4: "camp_este",
  5: "camp_oeste"
};

const USER_CAMP_NAME_MAP: Record<string, string> = {
  "Alpha Bunker": "camp_alfa",
  "Sierra Base": "camp_norte",
  "Delta Refuge": "camp_sur",
  "Omega Fortress": "camp_este",
  "Echo Outpost": "camp_oeste"
};

const PERSON_CAMP_MAPPING: Record<number, string> = {
  7: "camp_alfa",   // Mario Hugo
  12: "camp_alfa",  // Ana García
  5: "camp_sur",    // Juan López (Delta Refuge)
  3: "camp_norte",  // María Sánchez (Sierra Base)
  9: "camp_este",   // Carlos Ruiz (Omega Fortress)
  15: "camp_oeste"  // Lucía Torres (Echo Outpost)
};

type PersonCard = ExpeditionPerson & { age?: number; img?: string };

const allowedExpeditionRoles = [
  "SCOUT",
  "EXPEDITIONIST",
  "EXPEDITION_MEMBER",
  "TRAVEL_MANAGER",
  "TEMPORARY_TRAVELER"
];

const getPersonBackendRole = (person: PersonCard): string => {
  const map: Record<number, string> = {
    7: "EXPEDITION_MEMBER",   // Mario Hugo
    12: "EXPEDITION_MEMBER",  // Ana García
    5: "EXPEDITIONIST",        // Juan López
    3: "EXPEDITION_MEMBER",   // María Sánchez
    9: "SCOUT",               // Carlos Ruiz
    15: "TEMPORARY_TRAVELER"  // Lucía Torres
  };
  return map[person.id] || person.role || "EXPEDITION_MEMBER";
};

const getReadableRoleLabel = (role: string) => {
  const mapping: Record<string, string> = {
    "SCOUT": "Scout",
    "EXPEDITIONIST": "Expedicionista",
    "TRAVEL_MANAGER": "Enc. de Expediciones",
    "TEMPORARY_TRAVELER": "Viajero temporal",
    "EXPEDITION_MEMBER": "Miembro de expedición"
  };
  return mapping[role] || role;
};

const PRESETS: Record<string, Array<{ name: string; lat: number; lng: number; danger: string; climate: string }>> = {
  camp_alfa: [
    { name: "Parque Yellowstone", lat: 44.4280, lng: -110.5885, danger: "Medio", climate: "Húmedo templado" },
    { name: "Gran Cañón", lat: 36.0544, lng: -112.1401, danger: "Alto", climate: "Cálido Desértico" }
  ],
  camp_norte: [
    { name: "Selva Negra", lat: 48.0167, lng: 8.25, danger: "Alto", climate: "Templado húmedo" },
    { name: "Lago de Constanza", lat: 47.636, lng: 9.389, danger: "Bajo", climate: "Cálido templado" }
  ],
  camp_sur: [
    { name: "Quebrada de Humahuaca", lat: -23.5855, lng: -65.3524, danger: "Alto", climate: "Árido andino" },
    { name: "Minas de Wanda", lat: -25.97, lng: -54.57, danger: "Extremo", climate: "Subtropical húmedo" }
  ],
  camp_este: [
    { name: "Monte Fuji", lat: 35.3606, lng: 138.7278, danger: "Bajo", climate: "Frío alpino" },
    { name: "Fosa de Japón", lat: 38.0, lng: 143.0, danger: "Medio", climate: "Vientos marinos" }
  ],
  camp_oeste: [
    { name: "Desierto del Kalahari", lat: -24.0, lng: 21.0, danger: "Extremo", climate: "Seco árido" },
    { name: "Delta del Okavango", lat: -19.0, lng: 23.0, danger: "Alto", climate: "Zonas pantanosas" }
  ]
};

function calculateExpeditionDays(depDate: string, retDate: string) {
  if (!depDate || !retDate) return 0;
  const dep = new Date(depDate);
  const ret = new Date(retDate);
  const diffTime = ret.getTime() - dep.getTime();
  if (isNaN(diffTime) || diffTime < 0) return 0;
  // Convert milliseconds to days, rounding up
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays);
}

async function saveExpedition(exp: {
  name: string;
  objective: string;
  dest: string;
  lat: number;
  lng: number;
  departure: string;
  returnDate: string;
  extraDays: number;
  assignedPersonnelIds: number[];
  campId: number;
  [key: string]: unknown;
}) {
  await createExpedition({
    campId: exp.campId,
    name: exp.name,
    objective: exp.objective,
    destinationDescription: exp.dest,
    destinationLatitude: exp.lat,
    destinationLongitude: exp.lng,
    plannedDepartureDate: new Date(exp.departure.replace(" ", "T")).toISOString(),
    plannedReturnDate: new Date(exp.returnDate.replace(" ", "T")).toISOString(),
    maxExtraDays: exp.extraDays,
    participantIds: exp.assignedPersonnelIds,
  });
}

export function ExpeditionCreate({ onNavigate }: ExpeditionCreateProps) {
  const [step, setStep] = useState(1);

  const [adventureOriginInfo, setAdventureOriginInfo] = useState<{
    name: string;
    resources: string;
    type: string;
  } | null>(null);

  useEffect(() => {
    const storedAdventure = localStorage.getItem("selectedAdventureForExpedition");
    if (storedAdventure) {
      try {
        const parsed = JSON.parse(storedAdventure);
        if (parsed && parsed.name) {
          setName(`Expedición a ${parsed.name}`);
          setDest(parsed.name);
          setObjective(`Travesía táctica recomendada. Zona: ${parsed.name}. Tipo de misión: ${parsed.type || "Exploración"}.`);
          
          if (parsed.lat !== undefined) setLat(parsed.lat.toString());
          if (parsed.lng !== undefined) setLng(parsed.lng.toString());
          
          if (parsed.risk) {
            const riskMap: Record<string, string> = {
              "Bajo": "Bajo",
              "Medio": "Medio",
              "Alto": "Alto",
              "Muy alto": "Extremo",
              "Extremo": "Extremo"
            };
            const mappedDanger = riskMap[parsed.risk] || parsed.risk;
            setDanger(mappedDanger);
          }
          
          if (parsed.climate) {
            setClimate(parsed.climate);
          }
          
          if (parsed.originCampKey) {
            setSelectedCamp(parsed.originCampKey);
          }

          setAdventureOriginInfo({
            name: parsed.name,
            resources: parsed.resources || "No especificado.",
            type: parsed.type || "Exploración"
          });
        }
      } catch (err) {
        console.error("Failed to parse stored adventure data:", err);
      } finally {
        localStorage.removeItem("selectedAdventureForExpedition");
      }
    }
  }, []);

  const getFutureDateStr = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Form State
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [dest, setDest] = useState("");
  const [selectedCamp, setSelectedCamp] = useState("camp_alfa");
  const [lat, setLat] = useState("39.8283");
  const [lng, setLng] = useState("-98.5795");
  const [danger, setDanger] = useState("Medio");
  const [climate, setClimate] = useState("Caluroso");
  const [departureDate, setDepartureDate] = useState(getFutureDateStr(1));
  const [departureTime, setDepartureTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState(getFutureDateStr(5));
  const [returnTime, setReturnTime] = useState("18:00");
  const [extraDays, setExtraDays] = useState("0");
  const [requestedResources, setRequestedResources] = useState({
    foodRations: 0,
    waterLiters: 0,
    medicalKits: 0,
    defenseUnits: 0,
    otherUnits: 0
  });
  const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
  const [success, setSuccess] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
    return {
      id: 0,
      username: "",
      name: "Usuario",
      email: "",
      role: "TRAVEL_MANAGER",
      campId: 1,
      campName: "Alpha Bunker"
    };
  });
  const [peopleCards, setPeopleCards] = useState<PersonCard[]>([]);
  const [inventoryByKey, setInventoryByKey] = useState({
    foodRations: { current_amount: 0, minimum_alert_amount: 0, unit: "raciones" },
    waterLiters: { current_amount: 0, minimum_alert_amount: 0, unit: "litros" },
    medicalKits: { current_amount: 0, minimum_alert_amount: 0, unit: "kits" },
    defenseUnits: { current_amount: 0, minimum_alert_amount: 0, unit: "unidades" },
    otherUnits: { current_amount: 0, minimum_alert_amount: 0, unit: "unidades" }
  });
  const [backendWarning, setBackendWarning] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadBackendContext() {
      try {
        const user = await getCurrentExpeditionUser();
        if (!mounted) return;
        setCurrentUser(user);

        const [people, inventory] = await Promise.all([
          listAvailablePeople(user.campId),
          listCampInventory(user.campId),
        ]);
        if (!mounted) return;

        setPeopleCards(people.map((person) => ({
          ...person,
          age: person.age ?? 0,
          img: person.img || `https://i.pravatar.cc/150?u=${person.id}`,
        })));

        const findInventory = (...categories: string[]) => {
          const normalized = categories.map(category => category.toUpperCase());
          return inventory.find(item => normalized.includes(item.category.toUpperCase()));
        };
        const toInventoryItem = (item: ReturnType<typeof findInventory> | undefined, unit: string) => ({
          current_amount: item?.currentAmount ?? 0,
          minimum_alert_amount: item?.minimumAlertAmount ?? 0,
          unit: item?.unit ?? unit,
        });

        setInventoryByKey({
          foodRations: toInventoryItem(findInventory("FOOD"), "raciones"),
          waterLiters: toInventoryItem(findInventory("WATER"), "litros"),
          medicalKits: toInventoryItem(findInventory("MEDICAL"), "kits"),
          defenseUnits: toInventoryItem(findInventory("DEFENSE", "AMMUNITION"), "unidades"),
          otherUnits: toInventoryItem(findInventory("OTHER"), "unidades"),
        });
        if (people.length === 0 || inventory.length === 0) {
          setBackendWarning("Algunos endpoints de lectura aun no estan habilitados para TRAVEL_MANAGER; se muestran solo datos disponibles del backend.");
        }
      } catch (err) {
        console.warn("Backend auth/context failed in ExpeditionCreate:", err);
        if (mounted) setBackendWarning("No se pudo cargar el contexto real del backend.");
      }
    }
    loadBackendContext();
    return () => {
      mounted = false;
    }
  }, []);

  // Synchronize selectedcamp/lat/lng to current user's camp
  useEffect(() => {
    const adventurePending = localStorage.getItem("selectedAdventureForExpedition");
    if (adventurePending || adventureOriginInfo) {
      return;
    }
    const campKey = USER_CAMP_ID_MAP[currentUser.campId] || USER_CAMP_NAME_MAP[currentUser.campName] || "camp_alfa";
    setSelectedCamp(campKey);
    const campObj = CAMPS.find(c => c.id === campKey);
    if (campObj) {
      setLat(campObj.lat.toString());
      setLng(campObj.lng.toString());
    }
  }, [currentUser, adventureOriginInfo]);

  // Reset selected people when camp changes
  useEffect(() => {
    setSelectedPeople([]);
  }, [selectedCamp]);

  const isPersonEligible = (person: PersonCard) => {
    const campMatch = person.campId === currentUser.campId;
    const backendRole = getPersonBackendRole(person);
    const roleMatch = allowedExpeditionRoles.includes(backendRole) || person.role !== "";
    const isCardActive = person.status === "ACTIVE" || person.status === "ACTIVO";
    return campMatch && roleMatch && isCardActive;
  };

  const eligiblePeople = peopleCards.filter(isPersonEligible);

  const resources = `Comida: ${requestedResources.foodRations} raciones, Agua: ${requestedResources.waterLiters} L, Kits médicos: ${requestedResources.medicalKits}, Defensa/equipo: ${requestedResources.defenseUnits}, Otros: ${requestedResources.otherUnits}`;

  const mockCampInventory = inventoryByKey;

  const RATION_PER_PERSON_PER_DAY = 1;

  const expeditionDays = calculateExpeditionDays(departureDate, returnDate);

  const maxFoodRations =
    selectedPeople.length * expeditionDays * RATION_PER_PERSON_PER_DAY;

  const maxWaterLiters =
    selectedPeople.length * expeditionDays * RATION_PER_PERSON_PER_DAY;

  const getResourceError = (
    key: "foodRations" | "waterLiters" | "medicalKits" | "defenseUnits" | "otherUnits",
    val: number
  ) => {
    if (val < 0) {
      return "No se permiten números negativos.";
    }

    const inv = mockCampInventory[key];
    const availableForUse = inv.current_amount - inv.minimum_alert_amount;

    if (key === "foodRations" || key === "waterLiters") {
      if (val < 1) {
        return "Debe solicitar al menos 1 unidad para la expedición.";
      }
      const maxAllowed = key === "foodRations" ? maxFoodRations : maxWaterLiters;
      if (val > maxAllowed) {
        return `Excede el límite recomendado según participantes y días (Máx: ${maxAllowed}).`;
      }
    }

    if (val > availableForUse) {
      return "El campamento no cuenta con este recurso disponible sin afectar su reserva mínima.";
    }

    return null;
  };

  const hasStep5Errors = () => {
    return (
      getResourceError("foodRations", requestedResources.foodRations) !== null ||
      getResourceError("waterLiters", requestedResources.waterLiters) !== null ||
      getResourceError("medicalKits", requestedResources.medicalKits) !== null ||
      getResourceError("defenseUnits", requestedResources.defenseUnits) !== null ||
      getResourceError("otherUnits", requestedResources.otherUnits) !== null
    );
  };

  const getDepartureError = () => {
    if (!departureDate) return null;
    const dep = new Date(`${departureDate}T${departureTime || "00:00"}`);
    if (isNaN(dep.getTime())) return null;
    const now = new Date();
    if (dep < now) {
      return "La fecha y hora de salida no puede ser anterior a la hora actual del servidor.";
    }
    return null;
  };

  const getReturnError = () => {
    if (!departureDate || !returnDate) return null;
    const dep = new Date(`${departureDate}T${departureTime || "00:00"}`);
    const ret = new Date(`${returnDate}T${returnTime || "00:00"}`);
    if (isNaN(dep.getTime()) || isNaN(ret.getTime())) return null;
    if (ret <= dep) {
      return "La fecha y hora de retorno debe ser posterior a la salida.";
    }
    return null;
  };

  const isDateRangeValid = () => {
    return getDepartureError() === null && getReturnError() === null;
  };

  const isNextDisabled = () => {
    if (step === 1) return !name.trim();
    if (step === 2) return !dest.trim() || !lat || !lng;
    if (step === 3) return !isDateRangeValid();
    if (step === 4) return !isDateRangeValid() || selectedPeople.length === 0;
    if (step === 5) return hasStep5Errors();
    return false;
  };

  const steps = [
    "Información general",
    "Ubicación / destino",
    "Fechas",
    "Participantes",
    "Recursos solicitados",
    "Resumen"
  ];

  const togglePerson = (id: number) => {
    const person = peopleCards.find((p) => p.id === id);
    if (!person) return;

    const backendRole = getPersonBackendRole(person);
    
    if (selectedPeople.includes(id)) {
      setRoleError(null);
      setSelectedPeople((prev) => prev.filter((p) => p !== id));
    } else {
      if (!allowedExpeditionRoles.includes(backendRole)) {
        setRoleError("Esta persona no tiene un rol permitido para participar en expediciones.");
        return;
      }
      setRoleError(null);
      setSelectedPeople((prev) => [...prev, id]);
    }
  };

  const handleConfirm = async () => {
    if (getDepartureError() || getReturnError() || selectedPeople.length === 0 || hasStep5Errors()) {
      return;
    }
    const currentCamp = CAMPS.find(c => c.id === selectedCamp) || CAMPS[0];
    
    const backendPayload = {
      name,
      objective,
      destination: dest,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      departureDate,
      departureTime,
      returnDate,
      returnTime,
      assignedPersonnelIds: selectedPeople,
      requestedResources
    };
    // TODO backend integration: backend must validate requested resources against camp minimum safety levels.
    console.log("Tactical payload ready:", backendPayload);
    
    // Save expedition through expeditionsStore
    await saveExpedition({
      name: name || "Nueva Expedición Desconocida",
      dest: dest || "Área Inexplorada",
      status: "PLANNED",
      departure: `${departureDate} ${departureTime}`,
      returnDate: `${returnDate} ${returnTime}`,
      participants: selectedPeople.length,
      resources: resources || "Suministros Básicos",
      extraDays: parseInt(extraDays) || 0,
      extraUsed: 0,
      objective: objective || "Sin descripción proporcionada.",
      lat: parseFloat(lat) || 0,
      lng: parseFloat(lng) || 0,
      danger,
      climate,
      assignedPersonnelIds: selectedPeople,
      campId: currentUser.campId,
      startLat: currentCamp.lat,
      startLng: currentCamp.lng,
      startLabel: currentCamp.name,
    });

    setSuccess(true);
  };

  const handleFinish = () => {
    if (onNavigate) {
      // Go to the tactical map to see the newly created dot
      onNavigate("Analizador Satelital");
    }
  };

  if (success) {
    return (
      <MissionShell kicker="Registro definitivo" title="Misión Registrada">
        <MissionStack>
          <div className="mission-card mission-card-wide text-center py-12 flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-full flex items-center justify-center text-2xl font-black mb-4 animate-bounce">
              ✓
            </div>
            <h3 className="text-xl font-bold text-[#f0fafa] uppercase tracking-wider mb-2">
              EXPEDICIÓN REGISTRADA CON ÉXITO
            </h3>
            <p className="text-[#A4C2C5]/80 text-sm max-w-md mx-auto mb-6">
              La expedición "{name}" ha sido grabada encriptadamente en los registros tácticos del campamento y su trazo geográfico ya está disponible en el mapa satelital.
            </p>

            <div className="bg-[#051717] border border-[#67ACA9]/30 p-5 rounded max-w-md w-full text-left font-mono text-[11px] leading-relaxed mb-8">
              <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                <span className="text-[#A4C2C5]/50">EXPEDICIÓN:</span>
                <strong className="text-emerald-300 font-bold uppercase">{name}</strong>
              </div>
              <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                <span className="text-[#A4C2C5]/50">ZONA/DESTINO:</span>
                <strong className="text-[#69BFB7] truncate max-w-[200px]">{dest}</strong>
              </div>
              <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                <span className="text-[#A4C2C5]/50">COORDENADAS:</span>
                <strong className="text-[#A4C2C5]">LAT: {lat} | LNG: {lng}</strong>
              </div>
              <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                <span className="text-[#A4C2C5]/50">DURACIÓN Y FECHA:</span>
                <strong className="text-[#A4C2C5]">{departureDate} → {returnDate}</strong>
              </div>
              <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5 mb-1.5">
                <span className="text-[#A4C2C5]/50">RECURSOS ASIGNADOS:</span>
                <strong className="text-emerald-300 font-bold uppercase truncate max-w-[200px]">{resources}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#A4C2C5]/50">PERSONAL ASIGNADO:</span>
                <strong className="text-[#69BFB7] text-right font-bold uppercase">
                  {selectedPeople.length > 0
                    ? `${selectedPeople.length} Integrantes`
                    : "Ninguno (Debe asignarse luego)"}
                </strong>
              </div>
            </div>

            <div className="flex gap-4">
              <Btn variant="primary" onClick={handleFinish}>
                Ver en la Central de Operaciones (Mapa)
              </Btn>
            </div>
          </div>
        </MissionStack>
      </MissionShell>
    );
  }

  return (
    <MissionShell kicker="Nuevo protocolo de salida" title="Crear Expedición">
      <MissionStack>
        {/* Wizard Steps indicator */}
        <div className="mission-wizard-steps">
          {steps.map((s, i) => (
            <div key={s} className={`mission-wizard-step ${i + 1 <= step ? "is-active" : ""}`}>
              <span className="mission-wizard-num">{i + 1}</span>
              <span className="mission-wizard-label">{s}</span>
            </div>
          ))}
        </div>

        {adventureOriginInfo && (
          <div className="bg-[#69BFB7]/10 border border-[#69BFB7] p-3 rounded-sm flex items-center justify-between text-xs font-mono text-[#69BFB7] mb-4 shadow-[rgba(105,191,183,0.1)_0_0_8px]">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-[#69BFB7] animate-pulse" />
              Expedición iniciada desde aventura: {adventureOriginInfo.name}
            </span>
            <span className="text-[10px] text-[#A4C2C5]/70 italic">
              [PROTOCOLO DE AVENTURA ACTIVADO]
            </span>
          </div>
        )}

        <div className="mission-card mission-card-wide">
          {/* STEP 1: INFO GENERAL */}
          {step === 1 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 1: Información General
              </div>
              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Nombre de expedición *
                </label>
                <input
                  type="text"
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                  placeholder="Ej: Exploración de Cavernas Altas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Objetivo / Descripción táctica
                </label>
                <textarea
                  className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] h-28 focus:outline-none focus:border-[#69BFB7]"
                  placeholder="Escriba los objetivos específicos, riesgos iniciales observados y recursos estratégicos esperados en la ruta..."
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
              {adventureOriginInfo && (
                <div className="bg-black/20 border border-[#67ACA9]/10 p-3 rounded-sm font-mono text-[11px] mt-1.5">
                  <span className="text-[#69BFB7] font-bold block mb-1 uppercase text-[10px] tracking-wider">[!] RECURSOS ESPERADOS EN LA RUTA</span>
                  <p className="text-[#A4C2C5] italic">{adventureOriginInfo.resources}</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: UBICACIÓN Y COORDENADAS */}
          {step === 2 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 2: Ubicación y Posición Satelital
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Campamento Base de Origen
                  </label>
                  {currentUser.role === "SYSTEM_ADMIN" ? (
                    <select
                      className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                      value={selectedCamp}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCamp(val);
                        const c = CAMPS.find((item) => item.id === val);
                        if (c) {
                          setLat(c.lat.toString());
                          setLng(c.lng.toString());
                        }
                      }}
                    >
                      {CAMPS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.country})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="w-full bg-[#051414] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#69BFB7] font-mono select-none">
                      Campamento de origen: {CAMPS.find(c => c.id === selectedCamp)?.name || currentUser.campName}
                    </div>
                  )}
                  <span className="text-[9px] text-[#A4C2C5]/40 mt-1 block">
                    Define la base emisora encargada de monitorizar la travesía.
                  </span>
                </div>

                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Descripción del destino o zona
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    placeholder="Ej: Cráter septentrional a 40km"
                    value={dest}
                    onChange={(e) => setDest(e.target.value)}
                  />
                  <span className="text-[9px] text-[#A4C2C5]/40 mt-1 block">
                    Nombre o hito representativo de la zona de exploración.
                  </span>
                </div>
              </div>

              {/* ── SECCIÓN DE RECOMENDADOS EN RANGO DEL CAMPAMENTO SELECCIONADO ── */}
              <div className="bg-[#051111]/70 border border-[#67ACA9]/20 p-2.5 rounded-sm">
                <span className="text-[9px] font-mono text-amber-400 uppercase tracking-widest block mb-1.5">
                  ✦ Sugerencias en Rango del Campamiento ({CAMPS.find(c => c.id === selectedCamp)?.country}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {PRESETS[selectedCamp]?.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setDest(p.name);
                        setLat(p.lat.toString());
                        setLng(p.lng.toString());
                        setDanger(p.danger);
                        setClimate(p.climate);
                      }}
                      className="text-[9.5px] bg-[#020706] hover:bg-[#67ACA9]/20 border border-[#67ACA9]/30 text-[#69BFB7] px-2 py-1 rounded transition-all cursor-pointer hover:border-[#69BFB7] flex items-center gap-1"
                    >
                      <span>⬡</span>
                      <strong>{p.name}</strong>
                      <span className="text-[8px] opacity-60">({p.climate})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Latitud Satelital (Grados)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    placeholder="De -90 a 90 (e.g. 10.45)"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                  />
                  <span className="text-[9px] text-[#A4C2C5]/40 mt-1 block">Coordenada en eje Y del mapa</span>
                </div>
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Longitud Satelital (Grados)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    placeholder="De -180 a 180 (e.g. -45.12)"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                  />
                  <span className="text-[9px] text-[#A4C2C5]/40 mt-1 block">Coordenada en eje X del mapa</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-1">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Nivel de Riesgo Operativo
                  </label>
                  <select
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-1.5 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    value={danger}
                    onChange={(e) => setDanger(e.target.value)}
                  >
                    <option value="Bajo">Bajo</option>
                    <option value="Medio">Medio</option>
                    <option value="Alto">Alto</option>
                    <option value="Extremo">Extremo</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Ambiente / Clima Estimado
                  </label>
                  <input
                    type="text"
                    className="w-full bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none focus:border-[#69BFB7]"
                    placeholder="Ej: Frío extremo, Lluvioso"
                    value={climate}
                    onChange={(e) => setClimate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: FECHAS */}
          {step === 3 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 3: Fechas y Contingencia
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Salida de Campamento (Fecha)
                  </label>
                  <TacticalDatePicker
                    value={departureDate}
                    onChange={setDepartureDate}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Salida (Hora militar)
                  </label>
                  <TacticalTimePicker
                    value={departureTime}
                    onChange={setDepartureTime}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2">
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Retorno Planeado (Fecha)
                  </label>
                  <TacticalDatePicker
                    value={returnDate}
                    onChange={setReturnDate}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                    Retorno (Hora militar)
                  </label>
                  <TacticalTimePicker
                    value={returnTime}
                    onChange={setReturnTime}
                  />
                </div>
              </div>

              <div className="mt-2">
                <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1">
                  Días de contingencia extra permitidos
                </label>
                <input
                  type="number"
                  className="w-24 bg-[#020706] border border-[#67ACA9]/30 rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none"
                  value={extraDays}
                  onChange={(e) => setExtraDays(e.target.value)}
                  min="0"
                  max="15"
                />
                <span className="text-[9px] text-[#A4C2C5]/40 mt-1 block">Rango de tolerancia de atraso permitido antes de declarar estado de alerta.</span>
              </div>

              {getDepartureError() && (
                <div className="bg-red-950/20 border border-red-500/35 p-3 rounded-sm text-red-300 font-mono text-xs leading-relaxed mt-2">
                  ⚠️ {getDepartureError()}
                </div>
              )}

              {getReturnError() && (
                <div className="bg-[#110505]/80 border border-red-500/35 p-3 rounded-sm text-red-300 font-mono text-xs leading-relaxed mt-2">
                  ⚠️ {getReturnError()}
                </div>
              )}
            </div>
          )}

          {/* STEP 4: PERSONAL (ASSIGNMENT IN WIZARD!) */}
          {step === 4 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 4: Selección de Personal y Personal de Campo
              </div>
              <p className="text-[#A4C2C5]/70 text-xs leading-relaxed mb-1">
                Marque los operadores y especialistas residentes en el campamento que integrarán esta expedición. Podrá actualizar o agregar más integrantes en cualquier momento.
              </p>

              <div className="text-[10px] font-mono text-[#69BFB7] bg-[#020706]/50 border border-[#67ACA9]/20 px-3 py-1.5 rounded-sm">
                ℹ️ Solo se muestran personas disponibles con rol válido para expediciones.
              </div>

              {roleError && (
                <div className="bg-red-950/20 border border-red-500/35 p-3 rounded-sm text-red-300 font-mono text-xs leading-relaxed">
                  ⚠️ {roleError}
                </div>
              )}

              {selectedPeople.length === 0 && (
                <div className="bg-[#0b1f1f]/80 border border-[#67ACA9]/30 p-3 rounded-sm text-amber-300 font-mono text-xs leading-relaxed">
                  ⚠️ Debe asignar al menos una persona disponible a la expedición.
                </div>
              )}

              {eligiblePeople.length === 0 ? (
                <div className="bg-[#1a0f0f]/80 border border-red-500/30 p-4 rounded-sm text-red-300 font-mono text-xs text-center leading-relaxed">
                  ⚠️ No hay personal disponible con rol válido para esta expedición.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[340px] overflow-y-auto pr-1">
                  {eligiblePeople.map((person) => {
                    const isSelected = selectedPeople.includes(person.id);
                    const backendRole = getPersonBackendRole(person);
                    const readableRole = getReadableRoleLabel(backendRole);

                    return (
                      <div
                        key={person.id}
                        onClick={() => togglePerson(person.id)}
                        className={`p-2.5 border rounded cursor-pointer transition-all flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-[#67ACA9]/10 border-[#69BFB7] shadow-[rgba(103,172,169,0.1)_0_0_10px]"
                            : "bg-black/30 border-[#67ACA9]/20 hover:border-[#67ACA9]/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#67ACA9]/20 flex-shrink-0">
                            <img
                              src={person.img}
                              alt={person.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className={`text-xs font-bold uppercase truncate ${isSelected ? "text-[#69BFB7]" : "text-[#f0fafa]"}`}>
                              {person.name}
                            </h4>
                            <span className="text-[9px] text-[#A4C2C5]/70 block">{readableRole}</span>
                            <span className="text-[8px] uppercase font-bold tracking-tight block mt-0.5 text-emerald-400">
                              ✓ Disponible
                            </span>
                          </div>
                        </div>

                        <div className="flex-shrink-0 pr-1">
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-[#69BFB7]"
                            checked={isSelected}
                            readOnly
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 5: RECURSOS SOLICITADOS */}
          {step === 5 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 5: Recursos solicitados
              </div>
              
              <div className="border border-[#67ACA9]/20 bg-black/30 p-4 rounded-sm">
                <span className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block mb-1.5 font-bold">[!] CONFIGURACIÓN DE RECURSOS</span>
                <p className="text-[#A4C2C5]/85 text-xs leading-relaxed mb-4">
                  Estos recursos se solicitan antes de la salida. Las cantidades están sujetas a la disponibilidad actual de almacén y a las reservas de seguridad del campamento base. Los recursos obtenidos al regresar se calcularán de manera automatizada.
                </p>

                {adventureOriginInfo && (
                  <div className="border-l-[3px] border-[#69BFB7] bg-[#69BFB7]/5 p-3 rounded-r-sm mb-4 text-xs font-mono">
                    <span className="text-[10.5px] font-bold text-[#69BFB7] uppercase block mb-1">
                      [REFERENCIA] RECURSOS ESPERADOS EN LA AVENTURA:
                    </span>
                    <p className="text-[#A4C2C5] italic leading-relaxed">
                      {adventureOriginInfo.resources}
                    </p>
                    <p className="text-[10px] text-[#A4C2C5]/50 mt-1 font-sans">
                      * Nota: Estos recursos son puramente informativos y de referencia. No rellenan automáticamente los recursos solicitados a continuación, que deben registrarse de forma manual.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                  {/* Food Rations */}
                  <div className="bg-[#020706]/40 border border-[#67ACA9]/20 p-3.5 rounded-sm flex flex-col gap-2">
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block font-bold">
                      Raciones de comida
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#020706] border rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none font-mono ${
                        getResourceError("foodRations", requestedResources.foodRations) ? "border-red-500 focus:border-red-400" : "border-[#67ACA9]/35 focus:border-[#69BFB7]"
                      }`}
                      value={requestedResources.foodRations}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setRequestedResources(prev => ({ ...prev, foodRations: val }));
                      }}
                    />
                    <div className="text-[10px] font-mono text-[#A4C2C5]/70">
                      Disponible para uso: <strong className="text-emerald-400">{mockCampInventory.foodRations.current_amount - mockCampInventory.foodRations.minimum_alert_amount}</strong> (Inventario: {mockCampInventory.foodRations.current_amount}, Reserva mínima: {mockCampInventory.foodRations.minimum_alert_amount})
                    </div>
                    <div className="text-[9.5px] font-mono text-[#A4C2C5]/50 leading-relaxed pt-1.5 border-t border-[#67ACA9]/10">
                      <div>Máximo recomendado: <strong className="text-[#69BFB7]">{maxFoodRations} raciones</strong></div>
                      <div>Cálculo: {selectedPeople.length} personas × {expeditionDays} días × {RATION_PER_PERSON_PER_DAY} ración diaria</div>
                    </div>
                    {getResourceError("foodRations", requestedResources.foodRations) && (
                      <div className="text-red-400 font-mono text-[10px] mt-1 bg-red-950/20 border border-red-500/30 p-2 rounded-xs leading-relaxed">
                        ⚠️ {getResourceError("foodRations", requestedResources.foodRations)}
                      </div>
                    )}
                  </div>

                  {/* Water Liters */}
                  <div className="bg-[#020706]/40 border border-[#67ACA9]/20 p-3.5 rounded-sm flex flex-col gap-2">
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block font-bold">
                      Litros de agua
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#020706] border rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none font-mono ${
                        getResourceError("waterLiters", requestedResources.waterLiters) ? "border-red-500 focus:border-red-400" : "border-[#67ACA9]/35 focus:border-[#69BFB7]"
                      }`}
                      value={requestedResources.waterLiters}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setRequestedResources(prev => ({ ...prev, waterLiters: val }));
                      }}
                    />
                    <div className="text-[10px] font-mono text-[#A4C2C5]/70">
                      Disponible para uso: <strong className="text-emerald-400">{mockCampInventory.waterLiters.current_amount - mockCampInventory.waterLiters.minimum_alert_amount}</strong> (Inventario: {mockCampInventory.waterLiters.current_amount}, Reserva mínima: {mockCampInventory.waterLiters.minimum_alert_amount})
                    </div>
                    <div className="text-[9.5px] font-mono text-[#A4C2C5]/50 leading-relaxed pt-1.5 border-t border-[#67ACA9]/10">
                      <div>Máximo recomendado: <strong className="text-[#69BFB7]">{maxWaterLiters} litros</strong></div>
                      <div>Cálculo: {selectedPeople.length} personas × {expeditionDays} días × {RATION_PER_PERSON_PER_DAY} unidad diaria</div>
                    </div>
                    {getResourceError("waterLiters", requestedResources.waterLiters) && (
                      <div className="text-red-400 font-mono text-[10px] mt-1 bg-red-950/20 border border-red-500/30 p-2 rounded-xs leading-relaxed">
                        ⚠️ {getResourceError("waterLiters", requestedResources.waterLiters)}
                      </div>
                    )}
                  </div>

                  {/* Medical Kits */}
                  <div className="bg-[#020706]/40 border border-[#67ACA9]/20 p-3.5 rounded-sm flex flex-col gap-2">
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block font-bold">
                      Kits médicos
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#020706] border rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none font-mono ${
                        getResourceError("medicalKits", requestedResources.medicalKits) ? "border-red-500 focus:border-red-400" : "border-[#67ACA9]/35 focus:border-[#69BFB7]"
                      }`}
                      value={requestedResources.medicalKits}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setRequestedResources(prev => ({ ...prev, medicalKits: val }));
                      }}
                    />
                    <div className="text-[10px] font-mono text-[#A4C2C5]/70">
                      Disponible para uso: <strong className="text-emerald-400">{mockCampInventory.medicalKits.current_amount - mockCampInventory.medicalKits.minimum_alert_amount}</strong> (Inventario: {mockCampInventory.medicalKits.current_amount}, Reserva mínima: {mockCampInventory.medicalKits.minimum_alert_amount})
                    </div>
                    {getResourceError("medicalKits", requestedResources.medicalKits) && (
                      <div className="text-red-400 font-mono text-[10px] mt-1 bg-red-950/20 border border-red-500/30 p-2 rounded-xs leading-relaxed">
                        ⚠️ {getResourceError("medicalKits", requestedResources.medicalKits)}
                      </div>
                    )}
                  </div>

                  {/* Defense Units */}
                  <div className="bg-[#020706]/40 border border-[#67ACA9]/20 p-3.5 rounded-sm flex flex-col gap-2">
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block font-bold">
                      Unidades de defensa/equipo
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#020706] border rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none font-mono ${
                        getResourceError("defenseUnits", requestedResources.defenseUnits) ? "border-red-500 focus:border-red-400" : "border-[#67ACA9]/35 focus:border-[#69BFB7]"
                      }`}
                      value={requestedResources.defenseUnits}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setRequestedResources(prev => ({ ...prev, defenseUnits: val }));
                      }}
                    />
                    <div className="text-[10px] font-mono text-[#A4C2C5]/70">
                      Disponible para uso: <strong className="text-emerald-400">{mockCampInventory.defenseUnits.current_amount - mockCampInventory.defenseUnits.minimum_alert_amount}</strong> (Inventario: {mockCampInventory.defenseUnits.current_amount}, Reserva mínima: {mockCampInventory.defenseUnits.minimum_alert_amount})
                    </div>
                    {getResourceError("defenseUnits", requestedResources.defenseUnits) && (
                      <div className="text-red-400 font-mono text-[10px] mt-1 bg-red-950/20 border border-red-500/30 p-2 rounded-xs leading-relaxed">
                        ⚠️ {getResourceError("defenseUnits", requestedResources.defenseUnits)}
                      </div>
                    )}
                  </div>

                  {/* Other Units */}
                  <div className="bg-[#020706]/40 border border-[#67ACA9]/20 p-3.5 rounded-sm flex flex-col gap-2">
                    <label className="text-[10px] font-mono tracking-wider text-[#69BFB7] uppercase block font-bold">
                      Otros suministros
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={`w-full bg-[#020706] border rounded-sm p-2 text-xs text-[#A4C2C5] focus:outline-none font-mono ${
                        getResourceError("otherUnits", requestedResources.otherUnits) ? "border-red-500 focus:border-red-400" : "border-[#67ACA9]/35 focus:border-[#69BFB7]"
                      }`}
                      value={requestedResources.otherUnits}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setRequestedResources(prev => ({ ...prev, otherUnits: val }));
                      }}
                    />
                    <div className="text-[10px] font-mono text-[#A4C2C5]/70">
                      Disponible para uso: <strong className="text-emerald-400">{mockCampInventory.otherUnits.current_amount - mockCampInventory.otherUnits.minimum_alert_amount}</strong> (Inventario: {mockCampInventory.otherUnits.current_amount}, Reserva mínima: {mockCampInventory.otherUnits.minimum_alert_amount})
                    </div>
                    {getResourceError("otherUnits", requestedResources.otherUnits) && (
                      <div className="text-red-400 font-mono text-[10px] mt-1 bg-red-950/20 border border-red-500/30 p-2 rounded-xs leading-relaxed">
                        ⚠️ {getResourceError("otherUnits", requestedResources.otherUnits)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: RESUMEN GENERAL */}
          {step === 6 && (
            <div className="v-form-grid flex flex-col gap-4">
              <div className="mission-card-title border-b border-[#67ACA9]/10 pb-2 mb-2">
                Paso 6: Resumen y Confirmación de Salida
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div className="flex flex-col gap-2.5 font-mono text-xs">
                  <div>
                    <span className="text-[#A4C2C5]/50 block text-[9px] uppercase">EXPEDICIÓN</span>
                    <strong className="text-emerald-300 text-sm font-bold uppercase">{name || "[SIN NOMBRE]"}</strong>
                  </div>
                  <div>
                    <span className="text-[#A4C2C5]/50 block text-[9px] uppercase">Recursos solicitados:</span>
                    <div className="text-[#69BFB7] tracking-wider text-xs border-l-2 border-[#67ACA9]/30 pl-2.5 py-0.5 mt-1 font-mono flex flex-col gap-0.5">
                      <div>• Comida: <strong className="text-[#F0FAFA]">{requestedResources.foodRations}</strong> raciones</div>
                      <div>• Agua: <strong className="text-[#F0FAFA]">{requestedResources.waterLiters}</strong> litros</div>
                      <div>• Kits médicos: <strong className="text-[#F0FAFA]">{requestedResources.medicalKits}</strong></div>
                      <div>• Defensa/equipo: <strong className="text-[#F0FAFA]">{requestedResources.defenseUnits}</strong></div>
                      <div>• Otros: <strong className="text-[#F0FAFA]">{requestedResources.otherUnits}</strong></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[#A4C2C5]/50 block text-[9px] uppercase">MISIÓN / OBJETIVO</span>
                    <p className="text-slate-300 text-[11px] italic mt-0.5 leading-snug border-l-2 border-[#69BFB7]/30 pl-2">
                      "{objective || "Sin descripción ni objetivo configurado."}"
                    </p>
                  </div>
                  <div>
                    <span className="text-[#A4C2C5]/50 block text-[9px] uppercase">ZONA GEOGRÁFICA</span>
                    <strong className="text-[#69BFB7] uppercase">{dest || "[ZONA INEXPLORADA]"}</strong>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 font-mono text-xs bg-black/25 p-3 rounded border border-[#67ACA9]/10">
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5">
                    <span className="text-[#A4C2C5]/50 uppercase">Coordenadas:</span>
                    <strong className="text-[#69BFB7]">LAT {lat} | LNG {lng}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5">
                    <span className="text-[#A4C2C5]/50 uppercase">Salida:</span>
                    <strong className="text-[#f0fafa]">{departureDate} @ {departureTime}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5">
                    <span className="text-[#A4C2C5]/50 uppercase">Retorno:</span>
                    <strong className="text-[#f0fafa]">{returnDate} @ {returnTime}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#67ACA9]/10 pb-1.5">
                    <span className="text-[#A4C2C5]/50 uppercase">Tolerancia Atraso:</span>
                    <strong>{extraDays} días adicionales</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#A4C2C5]/50 uppercase">Integrantes del Equipo:</span>
                    <strong className="text-emerald-400 font-bold">
                      {selectedPeople.length} personas asignadas
                    </strong>
                  </div>
                </div>
              </div>

              {selectedPeople.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[#67ACA9]/10">
                  <span className="font-mono text-[9px] text-[#69BFB7] uppercase block mb-2 tracking-widest font-bold">
                    Operadores Seleccionados
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedPeople.map(pId => {
                      const found = peopleCards.find(p => p.id === pId);
                      return found ? (
                        <div key={pId} className="flex items-center gap-1.5 bg-[#67ACA9]/10 border border-[#67ACA9]/30 px-2 py-1 rounded-sm text-[10px] text-emerald-300">
                          <img src={found.img} alt={found.name} className="w-4 h-4 rounded-full object-cover" />
                          <span className="font-bold">{found.name}</span>
                          <span className="text-[#A4C2C5]/60">({found.role})</span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wizard Control Actions Bottom */}
        <div className="mission-wizard-actions flex justify-between gap-4 mt-2">
          <Btn
            variant="ghost"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            Atrás
          </Btn>
          {step < 6 ? (
            <Btn
              variant="primary"
              onClick={() => setStep((s) => Math.min(6, s + 1))}
              disabled={isNextDisabled()}
            >
              Siguiente Step
            </Btn>
          ) : (
            <Btn variant="success" onClick={handleConfirm}>
              Confirmar y Lanzar Expedición
            </Btn>
          )}
        </div>
      </MissionStack>
    </MissionShell>
  );
}

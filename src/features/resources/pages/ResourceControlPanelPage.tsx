
import "./resource-control-panel.css";
import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { checkCurrentSessionStatus, clearCachedSession, logoutCurrentSession } from "../../../shared/services/sessionProfile";
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
  DeliveredTransferResource,
  Occupation,
  OccupationCoverage,
  OperationalNotification,
  CampPerson
} from "../types/resourceManagementTypes";
import {
  INITIAL_CAMPS,
  INITIAL_RESOURCE_TYPES,
  INITIAL_MOVEMENTS,
  INITIAL_ALERTS,
  INITIAL_INTERCAMP_REQUESTS,
  INITIAL_REQUEST_RESOURCE_DETAILS,
  INITIAL_TRANSFERS,
  INITIAL_TRANSFER_PERSONS,
  INITIAL_DELIVERED_TRANSFER_RESOURCES,
  INITIAL_OCCUPATIONS,
  INITIAL_OCCUPATION_COVERAGES,
  INITIAL_NOTIFICATIONS
} from "../data/resourceManagementData";
import {
  ViewDashboard,
  ViewRecoleccionDiaria,
  ViewMovimientosInventario,
  ViewAlertasInventario,
  ViewSolicitudesIntercampamento,
  ViewTraslados,
  ViewTiposDeRecurso,
  ViewCampamentos,
  ViewOficiosCobertura,
  ViewNotificaciones,
  ViewPersonalDashboard,
  ViewHistorialDeTraslado,
  ROSTER_PEOPLE
} from "../views/ResourceManagementViews";
import { WorldMapDashboard } from "../views/WorldMapView";
import { LoadingScreen } from "../components/ResourcePanelLoadingScreen";
import { resourceApi } from "../services/resourceManagementApi";
import { ApiHttpError } from "../../../shared/services/httpClient";
import { PopupMessage } from "../../../shared/components/PopupMessage";


const NAVIGATION_DATA = [
  {
    id: "almacenes",
    label: "Almacenes",
    icon: <PackageIcon />,
    subOptions: [
      "Inventario actual",
      "Historial de recursos",
      "Recolección diaria",
      "Alertas de inventario",
    ]
  },
  {
    id: "logistica",
    label: "Logística y Traslados",
    icon: <TruckIcon />,
    subOptions: [
      "Solicitudes intercampamento",
      "Traslados",
      "Historial de traslados"
    ]
  },
  {
    id: "cobertura",
    label: "Personal",
    icon: <SquadIcon />,
    subOptions: [
      "Dashboard global",
      "Glosario",
      "Notificaciones"
    ]
  }
];

const LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS = 60 * 1000;

interface ResourceControlPanelPageProps {
  onExit?: () => void;
}

export default function ResourceControlPanelPage({ onExit }: ResourceControlPanelPageProps) {
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  const [activeNav, setActiveNav] = useState<string | null>("almacenes");
  const [activeSub, setActiveSub] = useState<string>("Inventario actual");
  const [lastActiveNav, setLastActiveNav] = useState<string>("almacenes");

  const [catalogsLoaded, setCatalogsLoaded] = useState(false);
  const [hasPeoplePermission, setHasPeoplePermission] = useState(true);
  const [hasCoveragePermission, setHasCoveragePermission] = useState(true);

  
  const [camps, setCamps] = useState<Camp[]>(INITIAL_CAMPS);

  
  const [globalTimeState, setGlobalTimeState] = useState<{
    baseServerTime: Date;
    syncedAtClientMs: number;
    lastSyncAt: Date;
    status: 'synced' | 'syncing' | 'error';
  }>({
    baseServerTime: new Date("2026-05-25T06:25:47Z"),
    syncedAtClientMs: Date.now(),
    lastSyncAt: new Date(),
    status: 'syncing',
  });
  const globalTimeStateRef = useRef(globalTimeState);
  const lastSyncedGlobalTimeRef = useRef<{
    baseServerTime: Date;
    syncedAtClientMs: number;
  } | null>(null);

  useEffect(() => {
    globalTimeStateRef.current = globalTimeState;
    if (globalTimeState.status === 'synced') {
      lastSyncedGlobalTimeRef.current = {
        baseServerTime: globalTimeState.baseServerTime,
        syncedAtClientMs: globalTimeState.syncedAtClientMs,
      };
    }
  }, [globalTimeState]);

  const redirectExpiredLogicalSession = () => {
    clearCachedSession(true);
    navigate('/main-homepage', {
      replace: true,
      state: {
        initialAppState: 'login',
        sessionMessage: 'Sesion expirada por avance del tiempo logico. Inicia sesion para continuar.',
      },
    });
  };

  const validateSessionAfterLogicalTimeJump = async (nextServerTime: Date): Promise<boolean> => {
    const previous = lastSyncedGlobalTimeRef.current;
    if (!previous) {
      return false;
    }

    const expectedServerTimeMs = previous.baseServerTime.getTime() + Math.max(0, Date.now() - previous.syncedAtClientMs);
    const forwardJumpMs = nextServerTime.getTime() - expectedServerTimeMs;

    if (forwardJumpMs <= LOGICAL_TIME_SESSION_CHECK_THRESHOLD_MS) {
      return false;
    }

    const status = await checkCurrentSessionStatus();
    if (status !== 'expired') {
      return false;
    }

    redirectExpiredLogicalSession();
    return true;
  };

  const syncGlobalTime = async () => {
    setGlobalTimeState(prev => ({ ...prev, status: 'syncing' }));
    try {
      const data = await resourceApi.getServerTime();
      const parsed = new Date(data.serverTime);

      if (Number.isNaN(parsed.getTime())) {
        throw new Error('Invalid server time');
      }

      const sessionExpired = await validateSessionAfterLogicalTimeJump(parsed);
      if (sessionExpired) return;

      setGlobalTimeState({
        baseServerTime: parsed,
        syncedAtClientMs: Date.now(),
        lastSyncAt: new Date(),
        status: 'synced',
      });
    } catch (err) {
      console.warn("Could not sync with /system/time backend endpoint. Using client system time.", err);
      setGlobalTimeState(prev => ({
        ...prev,
        status: 'error',
      }));
    }
  };

  useEffect(() => {
    syncGlobalTime();


    const syncInterval = setInterval(() => {
      syncGlobalTime();
    }, 10000);

    return () => clearInterval(syncInterval);
  }, []);

  const getCurrentServerTime = () => {
    const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs;
    return new Date(globalTimeState.baseServerTime.getTime() + elapsedClientMs);
  };


  const [resourceTypes, setResourceTypesState] = useState<ResourceType[]>(INITIAL_RESOURCE_TYPES);
  const [campInventories, setCampInventories] = useState<CampInventory[]>([]);
  const [dailyCollectionRecords, setDailyCollectionRecords] = useState<DailyCollectionRecord[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>(INITIAL_MOVEMENTS);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>(INITIAL_ALERTS);
  const [intercampRequests, setIntercampRequests] = useState<IntercampRequest[]>(INITIAL_INTERCAMP_REQUESTS);
  const [requestResourceDetails, setRequestResourceDetails] = useState<RequestResourceDetail[]>(INITIAL_REQUEST_RESOURCE_DETAILS);
  const [transfers, setTransfers] = useState<Transfer[]>(INITIAL_TRANSFERS);
  const [transferPersons, setTransferPersons] = useState<TransferPerson[]>(INITIAL_TRANSFER_PERSONS);
  const [deliveredTransferResources, setDeliveredTransferResources] = useState<DeliveredTransferResource[]>(INITIAL_DELIVERED_TRANSFER_RESOURCES);
  const [occupations, setOccupationsState] = useState<Occupation[]>(INITIAL_OCCUPATIONS);
  const [occupationCoverages, setOccupationCoverages] = useState<OccupationCoverage[]>(INITIAL_OCCUPATION_COVERAGES);
  const [notifications, setNotifications] = useState<OperationalNotification[]>(INITIAL_NOTIFICATIONS);
  const [people, setPeople] = useState<CampPerson[]>(ROSTER_PEOPLE);
  const [requestPopupMessage, setRequestPopupMessage] = useState<string | null>(null);
  const [requestPopupVariant, setRequestPopupVariant] = useState<"success" | "error">("success");

  const applyList = <T,>(list: T[], setter: (value: T[]) => void) => {
    if (list.length > 0) setter(list);
  };

  const showRequestSuccess = (message: string) => {
    setRequestPopupVariant("success");
    setRequestPopupMessage(message);
  };

  const showRequestError = (message: string, error?: unknown) => {
    const details = error instanceof ApiHttpError ? error.details : undefined;
    const detailText = Array.isArray(details) ? details.join(" ") : details;
    setRequestPopupVariant("error");
    setRequestPopupMessage(detailText || message);
  };

  const fetchAllSystemData = async () => {
    const promises: Promise<any>[] = [];
    const indexMap: string[] = [];

    if (!catalogsLoaded) {
      promises.push(resourceApi.listCamps());
      indexMap.push("camps");
      promises.push(resourceApi.listResourceTypes());
      indexMap.push("resourceTypes");
      promises.push(resourceApi.listOccupations());
      indexMap.push("occupations");
    }

    promises.push(resourceApi.listCampInventory());
    indexMap.push("campInventory");
    promises.push(resourceApi.listDailyCollectionRecords());
    indexMap.push("dailyCollectionRecords");
    promises.push(resourceApi.listInventoryMovements());
    indexMap.push("inventoryMovements");
    promises.push(resourceApi.listInventoryAlerts());
    indexMap.push("inventoryAlerts");
    promises.push(resourceApi.listIntercampRequests());
    indexMap.push("intercampRequests");
    promises.push(resourceApi.listRequestResourceDetails());
    indexMap.push("requestResourceDetails");
    promises.push(resourceApi.listTransfers());
    indexMap.push("transfers");
    promises.push(resourceApi.listTransferPersons());
    indexMap.push("transferPersons");
    promises.push(resourceApi.listTransferHistory());
    indexMap.push("transferHistory");
    promises.push(resourceApi.listDeliveredTransferResources());
    indexMap.push("deliveredTransferResources");

    if (hasCoveragePermission) {
      promises.push(resourceApi.listOccupationCoverage());
      indexMap.push("occupationCoverage");
    }
    promises.push(resourceApi.listNotifications());
    indexMap.push("notifications");

    if (hasPeoplePermission) {
      promises.push(resourceApi.listPeople());
      indexMap.push("people");
    }

    const results = await Promise.allSettled(promises);

    results.forEach((result, idx) => {
      const type = indexMap[idx];
      if (result.status === "fulfilled") {
        const val = result.value;
        if (type === "camps") applyList(val, setCamps);
        else if (type === "resourceTypes") applyList(val, setResourceTypesState);
        else if (type === "occupations") applyList(val, setOccupationsState);
        else if (type === "campInventory") setCampInventories(val);
        else if (type === "dailyCollectionRecords") setDailyCollectionRecords(val);
        else if (type === "inventoryMovements") applyList(val, setInventoryMovements);
        else if (type === "inventoryAlerts") applyList(val, setInventoryAlerts);
        else if (type === "intercampRequests") applyList(val, setIntercampRequests);
        else if (type === "requestResourceDetails") applyList(val, setRequestResourceDetails);
        else if (type === "transfers") applyList(val, setTransfers);
        else if (type === "transferPersons") { applyList(val, setTransferPersons); enrichPeopleFromTransfers(people, val as TransferPerson[]); }
        else if (type === "transferHistory") applyList(val, setTransferHistories);
        else if (type === "deliveredTransferResources") applyList(val, setDeliveredTransferResources);
        else if (type === "occupationCoverage") applyList(val, setOccupationCoverages);
        else if (type === "notifications") applyList(val, setNotifications);
        else if (type === "people") setPeople(val);
      } else {
        console.warn(`Could not load dataset ${type} from backend. Keeping current data.`, result.reason);
        const isForbiddenOrNotFound = 
          result.reason instanceof ApiHttpError && 
          (result.reason.statusCode === 403 || result.reason.statusCode === 404);
        
        if (type === "people" && isForbiddenOrNotFound) {
          setHasPeoplePermission(false);
        } else if (type === "occupationCoverage" && isForbiddenOrNotFound) {
          setHasCoveragePermission(false);
        }
      }
    });

    if (!catalogsLoaded) {
      setCatalogsLoaded(true);
    }
  };

  const enrichPeopleFromTransfers = async (currentPeople: CampPerson[], currentTransferPersons: TransferPerson[]) => {
    if (!hasPeoplePermission) return;
    const knownIds = new Set(currentPeople.map(p => String(p.id)));
    const unknownIds = [...new Set(
      currentTransferPersons
        .map(tp => String(tp.personId))
        .filter(id => id && !knownIds.has(id))
    )];
    if (unknownIds.length === 0) return;
    const fetched = await Promise.allSettled(unknownIds.map(id => resourceApi.getPersonById(id)));
    const newPersons: CampPerson[] = fetched
      .filter((r): r is PromiseFulfilledResult<CampPerson | null> => r.status === "fulfilled" && r.value !== null)
      .map(r => r.value as CampPerson);
    if (newPersons.length > 0) {
      setPeople(prev => {
        const existing = new Set(prev.map(p => String(p.id)));
        return [...prev, ...newPersons.filter(p => !existing.has(String(p.id)))];
      });
    }
  };

  useEffect(() => {
    fetchAllSystemData();
  }, []);

  const [transferHistories, setTransferHistories] = useState<TransferHistory[]>([
    {
      id: "th-1",
      transferId: "tr-1",
      previousStatus: "PLANNING",
      newStatus: "DELIVERED",
      date: "2026-05-20T12:00:00Z",
      userId: "3",
      comment: "Traslado inicial completado satisfactoriamente."
    }
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = () => {
    setHasEntered(true);
    setTimeout(() => {
      setShowLoading(false);
    }, 150);
  };

  const handleLogout = async () => {
    await logoutCurrentSession();
    navigate('/main-homepage', { state: { initialAppState: 'explore' } });
  };

  const handleNavClick = (navId: string) => {
    if (navId === "mapa") {
      setActiveNav(null);
    } else {
      setActiveNav(navId);
      setLastActiveNav(navId);
      const navItem = NAVIGATION_DATA.find((item) => item.id === navId);
      setActiveSub(navItem?.subOptions[0] || "");
    }
  };

  const handleInnerNavigation = (sub: string) => {
    const match = NAVIGATION_DATA.find((item) => item.subOptions.includes(sub));
    if (match) {
      setActiveNav(match.id);
      setLastActiveNav(match.id);
    } else {
      setActiveNav(null);
    }
    setActiveSub(sub);
  };

  

  const handleUpdateInventory = async (campId: string, resourceTypeId: string, currentAmount: number, minimumAlertAmount: number) => {
    try {
      await resourceApi.upsertCampInventory({ campId, resourceTypeId, currentAmount, minimumAlertAmount });
    } catch (error) {
      console.warn("Could not persist inventory update.", error);
      alert("No se pudo guardar el inventario en la API. Se aplicará solo en pantalla.");
    }

    setCampInventories(prev =>
      prev.map(item =>
        item.campId === campId && item.resourceTypeId === resourceTypeId
          ? { ...item, currentAmount, minimumAlertAmount }
          : item
      )
    );


    if (currentAmount <= minimumAlertAmount) {
      const alreadyHasAlert = inventoryAlerts.some(a => a.campId === campId && a.resourceTypeId === resourceTypeId && !a.resolved);
      if (!alreadyHasAlert) {
        const newAlert: InventoryAlert = {
          id: `al-${Date.now().toString().slice(-4)}`,
          campId,
          resourceTypeId,
          amountAtAlertGeneration: currentAmount,
          alertDate: new Date().toLocaleTimeString("es-ES") + " UTC",
          resolved: false
        };
        setInventoryAlerts(prev => [...prev, newAlert]);
        

        const newNot: OperationalNotification = {
          id: `not-${Date.now().toString().slice(-4)}`,
          campId,
          userId: "user-op",
          targetRole: "RESOURCE_MANAGEMENT",
          type: "ALERT",
          title: "Suministro Crítico",
          message: `El campamento detectó descenso crítico de recursos.`,
          read: false,
          createdDate: "Ahora"
        };
        setNotifications(prev => [newNot, ...prev]);
      }
    }
  };



  const handleAddManualMovement = async (data: Omit<InventoryMovement, "id">) => {
    try {
      await resourceApi.createInventoryMovement(data);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not persist inventory movement.", error);
      alert("No se pudo registrar el movimiento en la API. Se aplicará solo en pantalla.");
    }

    const record: InventoryMovement = { ...data, id: `mov-${Date.now().toString().slice(-4)}` };
    setInventoryMovements(prev => [...prev, record]);


    const op = (data.movementType === "DAILY_RATION" || data.movementType === "EXPEDITION_DEPARTURE" || data.movementType === "TRANSFER_SENT") ? -1 : 1;
    setCampInventories(prev =>
      prev.map(item =>
        item.campId === data.campId && item.resourceTypeId === data.resourceTypeId
          ? { ...item, currentAmount: Math.max(0, item.currentAmount + (data.amount * op)) }
          : item
      )
    );
  };

  const handleAddRequest = async (data: Omit<IntercampRequest, "id">): Promise<string | null> => {
    try {
      const created = await resourceApi.createIntercampRequest(data);
      await fetchAllSystemData();
      showRequestSuccess("Borrador de solicitud intercampamento creado correctamente.");
      return created?.id ?? null;
    } catch (error) {
      console.warn("Could not create intercamp request.", error);
      showRequestError("No se pudo crear la solicitud en la API.", error);
      return null;
    }
  };

  const handleSubmitIntercampRequest = async (id: string): Promise<boolean> => {
    try {
      await resourceApi.submitIntercampRequest(id);
      await fetchAllSystemData();
      showRequestSuccess("Solicitud intercampamento enviada correctamente.");
      return true;
    } catch (error) {
      console.warn("Could not submit intercamp request.", error);
      showRequestError("No se pudo enviar la solicitud en la API.", error);
      return false;
    }
  };

  const handleUpdateRequestStatus = async (id: string, status: IntercampRequest["status"], responder: string, transportPersonIds?: string[]): Promise<boolean> => {
    try {
      await resourceApi.updateIntercampRequestStatus(id, status, responder, transportPersonIds);
      await fetchAllSystemData();
      return true;
    } catch (error) {
      console.warn("Could not update intercamp request status.", error);
      const details = error instanceof ApiHttpError ? error.details : undefined;
      alert(`No se pudo actualizar la solicitud en la API.\nMotivo: ${details || "Error de conexión o de validación"}`);
    }

    if (status !== "APPROVED") {
      setIntercampRequests(prev =>
        prev.map(r => (r.id === id ? { ...r, status, responseDate: "Hoy", respondedBy: responder } : r))
      );
    }
    return false;
  };

  const handleAddResourceToRequest = async (requestId: string, resourceTypeId: string, requestedAmount: number) => {
    try {
      await resourceApi.createRequestResourceDetail(requestId, resourceTypeId, requestedAmount);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not create request resource detail.", error);
      showRequestError("No se pudo agregar el recurso solicitado en la API.", error);
    }
  };

  const handleAddPersonToRequest = async (detail: Omit<RequestPersonDetail, "id">) => {
    try {
      await resourceApi.createRequestPersonDetail(detail);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not create request person detail.", error);
      showRequestError("No se pudo agregar el detalle de persona en la API.", error);
    }

  };

  const handleDeleteRequestResource = async (id: string) => {
    try {
      await resourceApi.deleteRequestResourceDetail(id);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not delete request resource detail.", error);
      alert("No se pudo eliminar el detalle en la API. Se quitará solo en pantalla.");
    }

    setRequestResourceDetails(prev => prev.filter(d => d.id !== id));
  };

  const handleAddTransfer = async (data: Omit<Transfer, "id">) => {
    try {
      await resourceApi.createTransfer(data);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not create transfer.", error);
      alert("No se pudo crear el traslado en la API. Se agregará solo en pantalla.");
    }

    const record: Transfer = { ...data, id: `tr-${Date.now().toString().slice(-4)}` };
    setTransfers(prev => [...prev, record]);
  };

  const handleUpdateTransferStatus = async (id: string, status: Transfer["status"], notes: string) => {
    try {
      await resourceApi.updateTransfer(id, {
        status,
        notes,
        ...(status === "EN_ROUTE" ? { actualDepartureDate: new Date().toISOString() } : {}),
        ...(status === "DELIVERED" ? { actualArrivalDate: new Date().toISOString(), receptionNotes: notes } : {}),
      });
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not update transfer status.", error);
      alert("No se pudo actualizar el traslado en la API. Se actualizará solo en pantalla.");
    }

    setTransfers(prev => {
      const match = prev.find(t => t.id === id);
      if (match && match.status !== status) {
        const newHistory: TransferHistory = {
          id: `th-${Date.now().toString().slice(-4)}`,
          transferId: id,
          previousStatus: match.status,
          newStatus: status,
          date: new Date().toISOString(),
          userId: "3",
          comment: notes || "Cambio de estado del convoy"
        };
        setTransferHistories(h => [...h, newHistory]);
      }
      return prev.map(t => {
        if (t.id === id) {
          const updated: Partial<Transfer> = { status };
          if (status === "EN_ROUTE") {
            updated.actualDepartureDate = new Date().toISOString();
          } else if (status === "DELIVERED") {
            updated.actualArrivalDate = new Date().toISOString();
            updated.receptionNotes = notes;
          }
          return { ...t, ...updated };
        }
        return t;
      });
    });
  };

  const handleUpdateTransferTransportStaff = async (id: string, transportPersonIds: string[]) => {
    try {
      await resourceApi.updateTransferTransportStaff(id, transportPersonIds);
      await fetchAllSystemData();
      showRequestSuccess("Manifiesto operativo actualizado correctamente.");
      return;
    } catch (error) {
      console.warn("Could not update transfer transport staff.", error);
      showRequestError("No se pudo actualizar el manifiesto operativo.", error);
    }
  };

  const handleAddPersonToTransfer = async (transferId: string, personId: string) => {
    try {
      await resourceApi.createTransferPerson(transferId, personId);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not add transfer person.", error);
      alert("No se pudo vincular la persona en la API. Se agregará solo en pantalla.");
    }

    const record: TransferPerson = {
      id: `tp-${Date.now().toString().slice(-4)}`,
      transferId,
      personId,
      status: "CONFIRMED"
    };
    setTransferPersons(prev => [...prev, record]);
  };

  const handleUpdatePersonStatus = async (id: string, status: TransferPerson["status"] | Partial<TransferPerson>) => {
    const patch = typeof status === "string" ? { status } : status;
    try {
      await resourceApi.updateTransferPerson(id, patch);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not update transfer person.", error);
      alert("No se pudo actualizar la persona del traslado en la API. Se actualizará solo en pantalla.");
    }

    setTransferPersons(prev =>
      prev.map(p => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const handleSaveDelivery = async (data: Omit<DeliveredTransferResource, "id">) => {
    try {
      await resourceApi.createDeliveredTransferResource(data);
      await fetchAllSystemData();
      return;
    } catch (error) {
      console.warn("Could not save delivered transfer resource.", error);
      alert("No se pudo guardar la entrega en la API. Se agregará solo en pantalla.");
    }

    const record: DeliveredTransferResource = { ...data, id: `dl-${Date.now().toString().slice(-4)}` };
    setDeliveredTransferResources(prev => [...prev, record]);
  };

  const handleAddNotification = async (data: Omit<OperationalNotification, "id">) => {
    const currentHudUser = getStoredHudUser();
    const optimisticRecord: OperationalNotification = {
      ...data,
      id: `not-${Date.now().toString().slice(-4)}`,
    };

    setNotifications(prev => [optimisticRecord, ...prev]);

    try {
      const created = await resourceApi.createNotification(data);
      const createdUserId = Number(created.userId);
      const belongsToCurrentUser = Number.isFinite(createdUserId) && createdUserId === currentHudUser.userId;
      const belongsToCurrentRole = created.targetRole === currentHudUser.role;

      setNotifications(prev => (
        belongsToCurrentUser || belongsToCurrentRole
          ? [created, ...prev.filter(item => item.id !== optimisticRecord.id)]
          : prev.filter(item => item.id !== optimisticRecord.id)
      ));
      return;
    } catch (error) {
      console.warn("Could not create notification.", error);
      throw error;
    }
  };

  const handleMarkAsRead = async (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true, readDate: "Hoy" } : n))
    );

    try {
      await resourceApi.markNotificationRead(id);
      return;
    } catch (error) {
      console.warn("Could not mark notification as read.", error);
      alert("No se pudo marcar la notificación como leída en la API. Se mantendrá actualizada solo en pantalla.");
    }
  };

  const handleSaveCollection = async (data: Omit<DailyCollectionRecord, "id">) => {
    const tempId = `col-${Date.now().toString().slice(-5)}`;
    setDailyCollectionRecords(prev => [
      {
        ...data,
        id: tempId
      },
      ...prev
    ]);

    // Optimistically update local inventory balance
    setCampInventories(prev =>
      prev.map(item =>
        String(item.campId) === String(data.campId) && String(item.resourceTypeId) === String(data.resourceTypeId)
          ? { ...item, currentAmount: Math.max(0, item.currentAmount + Number(data.actualAmount)) }
          : item
      )
    );

    try {
      await resourceApi.createDailyCollectionRecord(data);
    } catch (error) {
      console.warn("Could not save daily collection record in API.", error);
    }

    try {
      await resourceApi.createInventoryMovement({
        campId: String(data.campId),
        resourceTypeId: String(data.resourceTypeId),
        amount: Number(data.actualAmount),
        movementType: "DAILY_COLLECTION",
        sourceId: tempId,
        sourceType: "DAILY_COLLECTION_RECORD",
        recordedBy: String(data.recordedBy),
        date: new Date().toISOString().split("T")[0],
        description: `Recolección diaria: ${data.differenceReason || ""}`,
      });
    } catch (error) {
      console.warn("Could not create daily collection movement in API.", error);
    }

    await fetchAllSystemData();
  };

  const handleAdjustRecord = (id: string, actualAmount: number, reason: string) => {
    setDailyCollectionRecords(prev =>
      prev.map(record =>
        String(record.id) === id
          ? { ...record, actualAmount, differenceReason: reason }
          : record
      )
    );
  };

  const handleDeleteMovement = (id: string) => {
    setInventoryMovements(prev => prev.filter(item => item.id !== id));
  };

  const activeNavData = NAVIGATION_DATA.find((item) => item.id === activeNav);


  const renderContentArea = () => {
    switch (activeSub) {
      case "Dashboard":
        return (
          <ViewDashboard
            camps={camps}
            resourceTypes={resourceTypes}
            campInventories={campInventories}
            inventoryAlerts={inventoryAlerts}
            inventoryMovements={inventoryMovements}
            dailyCollectionRecords={dailyCollectionRecords}
            intercampRequests={intercampRequests}
            transfers={transfers}
            notifications={notifications}
            transferPersons={transferPersons}
            occupations={occupations}
            occupationCoverages={occupationCoverages}
            requestResourceDetails={requestResourceDetails}
            deliveredTransferResources={deliveredTransferResources}
            onSaveCollection={handleSaveCollection}
            onAddManualMovement={handleAddManualMovement}
            onAddRequest={handleAddRequest}
            onAddNotification={handleAddNotification}
            onMarkAsRead={handleMarkAsRead}
            onUpdateInventory={handleUpdateInventory}
            onNavigateToSub={handleInnerNavigation}
            globalTimeState={globalTimeState}
          />
        );
      case "Inventario actual":
      case "Tipos de recurso":
        return (
          <ViewTiposDeRecurso
            resourceTypes={resourceTypes}
            campInventories={campInventories}
            onUpdateInventory={handleUpdateInventory}
            onNavigateToSub={handleInnerNavigation}
          />
        );
      case "Campamentos":
        return <ViewCampamentos camps={camps} />;
      case "Recolección diaria":
        return (
          <ViewRecoleccionDiaria
            camps={camps}
            resourceTypes={resourceTypes}
            dailyCollectionRecords={dailyCollectionRecords}
            campPersonnel={people}
            setCampPersonnel={setPeople}
            onSaveRecord={handleSaveCollection}
            onAdjustRecord={handleAdjustRecord}
            onDeleteRecord={(id) => {
              setDailyCollectionRecords(prev => prev.filter(r => String(r.id) !== id));
            }}
          />
        );
      case "Historial de recursos":
      case "Historial de movimientos":
        return (
          <ViewMovimientosInventario
            camps={camps}
            resourceTypes={resourceTypes}
            inventoryMovements={inventoryMovements}
            onAddManualMovement={handleAddManualMovement}
            onDeleteMovement={handleDeleteMovement}
          />
        );
      case "Alertas de inventario":
        return (
          <ViewAlertasInventario
            camps={camps}
            resourceTypes={resourceTypes}
            inventoryAlerts={inventoryAlerts}
            campInventories={campInventories}
            inventoryMovements={inventoryMovements}
            onNavigateToSub={handleInnerNavigation}
          />
        );
      case "Solicitudes intercampamento":
        return (
          <ViewSolicitudesIntercampamento
            camps={camps}
            resourceTypes={resourceTypes}
            intercampRequests={intercampRequests}
            requestResourceDetails={requestResourceDetails}
            onAddRequest={handleAddRequest}
            onUpdateRequestStatus={handleUpdateRequestStatus}
            onAddResourceToRequest={handleAddResourceToRequest}
            onDeleteRequestResource={handleDeleteRequestResource}
            onAddPersonToRequest={handleAddPersonToRequest}
            onSubmitRequest={handleSubmitIntercampRequest}
            onUpdateTransportStaff={handleUpdateTransferTransportStaff}
            onUpdateRequest={(id, patch) => {
              setIntercampRequests(prev => prev.map(req => req.id === id ? { ...req, ...patch } : req));
            }}
            campInventories={campInventories}
            setCampInventories={setCampInventories}
            transfers={transfers}
            setTransfers={setTransfers}
            transferPersons={transferPersons}
            setTransferPersons={setTransferPersons}
            transferHistories={transferHistories}
            serverNow={getCurrentServerTime()}
            campPersonnel={people}
          />
        );
      case "Traslados":
        return (
          <ViewTraslados
            camps={camps}
            resourceTypes={resourceTypes}
            intercampRequests={intercampRequests}
            requestResourceDetails={requestResourceDetails}
            transfers={transfers}
            setTransfers={setTransfers}
            transferPersons={transferPersons}
            setTransferPersons={setTransferPersons}
            transferHistories={transferHistories}
            setTransferHistories={setTransferHistories}
            campInventories={campInventories}
            setCampInventories={setCampInventories}
            deliveredTransferResources={deliveredTransferResources}
            onAddTransfer={handleAddTransfer}
            onUpdateTransferStatus={handleUpdateTransferStatus}
            onAddPersonToTransfer={handleAddPersonToTransfer}
            onUpdatePersonStatus={handleUpdatePersonStatus}
            onUpdateTransportStaff={handleUpdateTransferTransportStaff}
            onAddHistoryEntry={async (data) => {
              try {
                await resourceApi.createTransferHistory(data);
                await fetchAllSystemData();
                return;
              } catch (error) {
                console.warn("Could not create transfer history entry.", error);
                alert("No se pudo guardar el historial en la API. Se agregará solo en pantalla.");
              }
              setTransferHistories(prev => [...prev, {
                ...data,
                id: `th-${Date.now().toString().slice(-4)}`
              }]);
            }}
            onSaveDelivery={handleSaveDelivery}
            campPersonnel={people}
          />
        );
      case "Historial de traslados":
        return (
          <ViewHistorialDeTraslado
            transfers={transfers}
            transferHistories={transferHistories}
            intercampRequests={intercampRequests}
            requestResourceDetails={requestResourceDetails}
            camps={camps}
            resourceTypes={resourceTypes}
            occupations={occupations}
            onAddHistoryEntry={async (data) => {
              try {
                await resourceApi.createTransferHistory(data);
                await fetchAllSystemData();
                return;
              } catch (error) {
                console.warn("Could not create transfer history entry.", error);
                alert("No se pudo guardar el historial en la API. Se agregará solo en pantalla.");
              }
              setTransferHistories(prev => [...prev, {
                ...data,
                id: `th-${Date.now().toString().slice(-4)}`
              }]);
            }}
          />
        );
      case "Dashboard global":
        return (
          <ViewPersonalDashboard
            camps={camps}
            resourceTypes={resourceTypes}
            campInventories={campInventories}
            inventoryAlerts={inventoryAlerts}
            inventoryMovements={inventoryMovements}
            notifications={notifications}
            occupationCoverages={occupationCoverages}
            onNavigateToSub={handleInnerNavigation}
          />
        );
      case "Glosario":
        return (
          <ViewOficiosCobertura
            occupations={occupations}
            resourceTypes={resourceTypes}
          />
        );
      case "Notificaciones":
        return (
          <ViewNotificaciones
            camps={camps}
            notifications={notifications}
            onAddNotification={handleAddNotification}
            onMarkAsRead={handleMarkAsRead}
          />
        );
      default:
        return (
          <div className="text-center p-6 text-xs text-[#A4C2C5]/40 italic">
            Módulo en calibración táctica...
          </div>
        );
    }
  };

  return (
    <div className="game-screen-layout text-[#A4C2C5]">
      <div className="holo-grid" />

      <PopupMessage
        message={requestPopupMessage}
        onClose={() => setRequestPopupMessage(null)}
        variant={requestPopupVariant}
      />

      
      <LoadingScreen
        show={showLoading}
        isLoaded={isLoaded}
        onEnter={handleEnter}
        onBack={onExit}
      />

      
      {hasEntered && (
        <TopHud 
          onLogout={handleLogout} 
          onVolver={() => onExit?.()} 
          globalTimeState={globalTimeState}
        />
      )}

      
      {hasEntered && (
        <div className="main-area">
          {activeNavData ? (
            <div className="content-scroll">
              <SectionTitle title={activeNavData.label} />
              <section aria-label="Panel principal de recursos" className="settings-shell h-full w-full">
                <div className="paint-glow" role="presentation" />
                <div className="settings-inner h-full flex flex-col" style={{ padding: "42px 0 0 0", overflow: "hidden" }}>
                  <div className="watermark-x" role="presentation" />
                  <div className="inner-layout">
                    <aside className="inner-sidebar pt-4">
                      
                      <SideMenu
                        items={activeNavData.subOptions}
                        activeItem={activeSub}
                        onSelect={setActiveSub}
                      />
                    </aside>
                    <div className="inner-divider" />
                    <div className="inner-content">
                      {renderContentArea()}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            
            <div className="content-scroll">
              <SectionTitle title="Mapa Operativo de Suministros" />
              <section aria-label="Mapa de distribución de red" className="settings-shell h-full w-full">
                <div className="paint-glow" role="presentation" />
                <div className="settings-inner h-full flex flex-col" style={{ padding: "42px 0 0 0", overflow: "hidden" }}>
                  <div className="watermark-x" role="presentation" />
                  <div className="inner-content px-4 xs:px-5 sm:px-8 md:px-10 py-5 sm:py-7" style={{ overflowY: "auto", height: "100%" }}>
                    <WorldMapDashboard
                      camps={camps}
                      intercampRequests={intercampRequests}
                      transfers={transfers}
                      resourceTypes={resourceTypes}
                      campInventories={campInventories}
                      onNavigateToTab={handleInnerNavigation}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      )}

      
      {hasEntered && (
        <>
          <BottomDock activeDock={activeNav || "mapa"} onSelect={handleNavClick} />
          <SettingsHint />
        </>
      )}
    </div>
  );
}

function getStoredHudUser() {
  if (typeof window === "undefined") {
    return {
      userId: 0,
      username: "OPERADOR",
      role: "RESOURCE_MANAGEMENT",
      roleLabel: "ADMINISTRADOR DE RECURSOS",
    };
  }

  const savedDisplayName = localStorage.getItem("game_username");
  const rawUser = localStorage.getItem("session_user") ?? localStorage.getItem("user");

  try {
    const parsed = rawUser ? JSON.parse(rawUser) as {
      username?: unknown;
      name?: unknown;
      fullName?: unknown;
      userId?: unknown;
      id?: unknown;
      rol?: unknown;
      role?: unknown;
    } : null;

    const sessionName = String(parsed?.username ?? parsed?.name ?? parsed?.fullName ?? "").trim();
    const role = String(parsed?.rol ?? parsed?.role ?? "RESOURCE_MANAGEMENT").toUpperCase();
    const roleLabel = role === "RESOURCE_MANAGEMENT"
      ? "ADMINISTRADOR DE RECURSOS"
      : role.replace(/_/g, " ");
    const userId = Number(parsed?.userId ?? parsed?.id ?? 0);

    return {
      userId: Number.isFinite(userId) ? userId : 0,
      username: sessionName || savedDisplayName || "OPERADOR",
      role,
      roleLabel,
    };
  } catch {
    return {
      userId: 0,
      username: savedDisplayName || "OPERADOR",
      role: "RESOURCE_MANAGEMENT",
      roleLabel: "ADMINISTRADOR DE RECURSOS",
    };
  }
}

const TopHud = memo(function TopHud({ 
  onLogout, 
  onVolver,
  globalTimeState
}: { 
  onLogout: () => void; 
  onVolver: () => void;
  globalTimeState: {
    baseServerTime: Date;
    syncedAtClientMs: number;
    status: 'synced' | 'syncing' | 'error';
  };
}) {
  const initialHudUser = getStoredHudUser();
  const username = initialHudUser.username;
  const roleLabel = initialHudUser.roleLabel;
  const [currentGlobalTime, setCurrentGlobalTime] = useState(() => {
    const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs;
    return new Date(globalTimeState.baseServerTime.getTime() + elapsedClientMs);
  });

  useEffect(() => {
    const tickInterval = window.setInterval(() => {
      const elapsedClientMs = Date.now() - globalTimeState.syncedAtClientMs;
      setCurrentGlobalTime(new Date(globalTimeState.baseServerTime.getTime() + elapsedClientMs));
    }, 1000);

    return () => window.clearInterval(tickInterval);
  }, [globalTimeState.baseServerTime, globalTimeState.syncedAtClientMs]);

  return (
    <header className="game-hud-header pointer-events-none flex items-center justify-between px-3 pt-3 pb-2 text-[10px] font-black uppercase tracking-[-0.02em] text-[#A4C2C5]/80">
      <div className="flex flex-wrap items-center gap-3">
        <button className="pointer-events-auto top-hud-btn shrink-0" type="button" onClick={onVolver}>
          <span className="btn-text">
            ◀ VOLVER
          </span>
        </button>

        
        <div className="pointer-events-auto flex items-center gap-2 bg-[#0d1414]/90 border border-[#67ACA9]/25 px-2.5 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[-0.02em] text-white shadow-md shrink-0">
          <div className="inline-flex items-center shrink-0">
            {globalTimeState.status === "synced" && (
              <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <title>Sincronizado</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            )}
            {globalTimeState.status === "syncing" && (
              <svg className="h-3.5 w-3.5 text-amber-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <title>Sincronizando...</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            )}
            {globalTimeState.status === "error" && (
              <svg className="h-3.5 w-3.5 text-rose-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <title>Hora local (sin conexión)</title>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            )}
          </div>
          <span className="text-white">
            {currentGlobalTime.getUTCDate().toString().padStart(2, '0')}/{(currentGlobalTime.getUTCMonth() + 1).toString().padStart(2, '0')}/{currentGlobalTime.getUTCFullYear()}
          </span>
          <span className="text-[#67ACA9] opacity-30 px-0.5">|</span>
          <span className="text-white">
            {currentGlobalTime.getUTCHours().toString().padStart(2, '0')}:{currentGlobalTime.getUTCMinutes().toString().padStart(2, '0')}:{currentGlobalTime.getUTCSeconds().toString().padStart(2, '0')} UTC
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="pointer-events-auto flex items-center gap-2.5 bg-[#0d1414]/90 border border-[#67ACA9]/25 px-2.5 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-[-0.02em] text-white shadow-md shrink-0">
          <div className="inline-flex items-center shrink-0">
            <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>

          <div className="flex flex-col justify-center leading-tight">
            <div className="flex items-center gap-1">
              <span className="text-[#A4C2C5]/50 font-black">USUARIO:</span>
              <span className="text-white font-black">{username}</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[#A4C2C5]/50 font-black">ROL:</span>
              <span className="text-white font-black">{roleLabel}</span>
            </div>
          </div>
        </div>

        <button className="pointer-events-auto top-hud-btn shrink-0" type="button" onClick={onLogout}>
          <span className="btn-text">
            CERRAR SESIÓN
            <span className="logout-mark" aria-hidden="true" />
          </span>
        </button>
      </div>
    </header>
  );
});

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div
        className="section-title-brush"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(25deg) translateZ(10px)",
        }}
      >
        <span className="btn-text">{title}</span>
      </div>
    </div>
  );
}

function SideMenu({ items, activeItem, onSelect }: { items: string[]; activeItem: string; onSelect: (item: string) => void }) {
  return (
    <nav aria-label="Resource sub-options" className="w-full pl-2 pt-2 h-full flex flex-col">
      <div className="flex flex-col gap-[10px] perspective-[800px]">
        {items.map((item) => (
          <button
            className={`side-button ${activeItem === item ? "is-active" : ""} relative`}
            key={item}
            onClick={() => onSelect(item)}
            type="button"
            style={{
              transformStyle: "preserve-3d",
              transform: "rotateY(20deg) translateZ(8px)",
            }}
          >
            <span className="btn-text text-[13px] uppercase tracking-wider whitespace-normal leading-normal py-1 pr-1.5 drop-shadow-md">{item}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function BottomDock({ activeDock, onSelect }: { activeDock: string; onSelect: (id: string) => void }) {
  const items = [
    { id: "mapa", label: "Mapa Operativo de Suministros", subtext: "MAPA", icon: <CompassIcon /> },
    { id: "almacenes", label: "Almacenes", subtext: "ALMACENES", icon: <PackageIcon /> },
    { id: "logistica", label: "Logística y Traslados", subtext: "LOGÍSTICA", icon: <TruckIcon /> },
    { id: "cobertura", label: "Personal", subtext: "PERSONAL", icon: <SquadIcon /> }
  ];

  return (
    <footer aria-label="Game navigation" className="dock justify-center flex gap-6">
      {items.map((item) => (
        <button
          aria-label={item.label}
          className={`dock-item ${activeDock === item.id ? "is-active" : ""}`}
          key={item.id}
          onClick={() => onSelect(item.id)}
          type="button"
        >
          <span className="dock-content flex flex-col items-center gap-1">
            {item.icon}
            <span className="text-[7px] uppercase font-bold tracking-widest leading-none drop-shadow-md">
              {item.subtext}
            </span>
          </span>
        </button>
      ))}
    </footer>
  );
}

function SettingsHint() {
  return null;
}

function IconSvg({ children, className = "h-6 w-6" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 32 32"
    >
      {children}
    </svg>
  );
}

function CompassIcon() {
  return (
    <IconSvg>
      <path d="M16 3v26M3 16h26" />
      <path d="m16 7 4.5 9L16 25l-4.5-9L16 7Z" />
      <path d="m7 7 18 18M25 7 7 25" />
    </IconSvg>
  );
}

function PackageIcon() {
  return (
    <IconSvg>
      <path d="M6 10l10-5 10 5-10 5-10-5z" />
      <path d="M6 10v12l10 5v-12" />
      <path d="M26 10v12l-10 5v-12" />
      <path d="M11 7.5l10 5" />
    </IconSvg>
  );
}

function TruckIcon() {
  return (
    <IconSvg>
      <path d="M4 18h20v-8H4v8z" />
      <path d="M24 14h4l1.5 2V18h-5.5" strokeLinecap="square" />
      <circle cx="8" cy="22" r="3" />
      <circle cx="20" cy="22" r="3" />
    </IconSvg>
  );
}

function SquadIcon() {
  return (
    <IconSvg>
      
      <circle cx="16" cy="11" r="4" />
      <path d="M7 28v-2a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2" />
      <circle cx="7" cy="15" r="3" />
      <path d="M2 24v-1a2 2 0 0 1 2-2h3" />
      <circle cx="25" cy="15" r="3" />
      <path d="M25 21h3a2 2 0 0 1 2 2v1" />
    </IconSvg>
  );
}

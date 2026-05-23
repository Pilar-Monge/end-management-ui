# Matriz de Roles y Permisos del Sistema

**Roles del Sistema:**
- 🔴 **SYSTEM_ADMIN** - Administrador total
- 🟢 **RESOURCE_MANAGEMENT** - Gestión de inventario y recursos
- 🔵 **TRAVEL_MANAGER** - Gestión de expediciones y traslados
- 🟡 **WORKER** - Trabajador operativo

---

## 1. Access Log (Registro de Acceso)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 2. Achievement (Logros)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 3. Admission Request (Solicitudes de Admisión)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear solicitud | 🌐 PÚBLICO | 🌐 PÚBLICO | 🌐 PÚBLICO | 🌐 PÚBLICO |
| Ver AI features | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar solicitudes | ✅ | ❌ | ❌ | ❌ |
| Subir foto | ✅ | ❌ | ❌ | ❌ |
| Actualizar foto | ✅ | ❌ | ❌ | ❌ |
| Actualizar solicitud | ✅ | ❌ | ❌ | ❌ |
| Eliminar solicitud | ❌ | ❌ | ❌ | ❌ |
| Procesar con IA | ✅ | ❌ | ❌ | ❌ |
| Revisar como admin | ✅ | ❌ | ❌ | ❌ |
| Ver pendientes por camp | ✅ | ❌ | ❌ | ❌ |

---

## 4. AI Admission Report (Reportes de Admisión con IA)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 5. Camp (Campamentos)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Listar | ✅ | ✅ | ✅ | ❌ |
| Ver detalle | ✅ | ✅ | ✅ | ❌ |
| Crear campamento | ❌ | ❌ | ❌ | ❌ |
| Editar campamento | ❌ | ❌ | ❌ | ❌ |
| Eliminar campamento | ❌ | ❌ | ❌ | ❌ |

---

## 6. Camp Achievement (Logros de Campamento)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 7. Camp Inventory (Inventario de Campamento)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ❌ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ✅ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 8. Daily Collection Record (Registro de Recolección Diaria)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ✅ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Ajustar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ✅ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 9. Daily Consumption (Consumo Diario)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| API pública | ❌ | ❌ | ❌ | ❌ |
| Uso interno por automatización | ✅ | ✅ | ✅ | ✅ |

> Este módulo no tiene controller HTTP propio. Los registros se crean internamente desde `temporalAutomation` al aplicar el consumo diario.

---

## 10. Dashboard (Panel General)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Dashboard general | ✅ | ❌ | ❌ | ❌ |
| Dashboard inventario | ✅ | ✅ | ❌ | ❌ |
| Dashboard expediciones | ✅ | ❌ | ✅ | ❌ |
| Dashboard personal | ✅ | ✅ | ✅ | ✅ |

---

## 11. Decision Tree (Árbol de Decisión)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Entrenar modelo | ✅ | ❌ | ❌ | ❌ |
| Predecir | ✅ | ❌ | ❌ | ❌ |
| Explicar predicción | ✅ | ❌ | ❌ | ❌ |
| Listar modelos | ✅ | ❌ | ❌ | ❌ |
| Ver modelo por id | ✅ | ❌ | ❌ | ❌ |

---

## 12. Delivered Transfer Resource (Recurso Transferido Entregado)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ❌ | ❌ |
| Ver detalle | ✅ | ✅ | ❌ | ❌ |
| Listar | ✅ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 13. Expedition (Expedición)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ✅ | ❌ |
| Listar activas | ❌ | ❌ | ✅ | ❌ |
| Ver detalle | ❌ | ❌ | ✅ | ❌ |
| Listar | ❌ | ❌ | ✅ | ❌ |
| Actualizar | ❌ | ❌ | ✅ | ❌ |
| Completar | ❌ | ❌ | ✅ | ❌ |
| Forzar actualización de estado | ❌ | ❌ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 14. Expedition Participant (Participante de Expedición)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ✅ | ❌ |
| Ver detalle | ❌ | ❌ | ✅ | ❌ |
| Listar | ❌ | ❌ | ✅ | ❌ |
| Actualizar | ❌ | ❌ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 15. Expedition Resource Consumed (Recurso Consumido en Expedición)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ❌ | ✅ | ✅ | ❌ |
| Listar | ❌ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ✅ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 16. Expedition Resource Obtained (Recurso Obtenido en Expedición)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ❌ | ✅ | ✅ | ❌ |
| Listar | ❌ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ✅ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 17. Intercamp Request (Solicitud Intercamp)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ❌ | ✅ | ✅ | ❌ |
| Listar | ❌ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ✅ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 18. Inventory Alert (Alerta de Inventario)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ❌ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ✅ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 19. Inventory Movement (Movimiento de Inventario)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ❌ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ✅ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 20. Notification (Notificación)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ✅ | ✅ | ❌ |
| Ver detalle | ✅ | ✅ | ✅ | ✅ |
| Listar | ✅ | ✅ | ✅ | ✅ |
| Actualizar | ✅ | ✅ | ✅ | ✅ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 21. Occupation (Oficio)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Listar | ✅ | ✅ | ✅ | ✅ |
| Ver detalle | ✅ | ✅ | ✅ | ✅ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 22. Occupation Coverage (Cobertura de Oficio)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Ver cobertura por campamento | ✅ | ✅ | ✅ | ✅ |
| Ver cobertura por ocupación | ✅ | ✅ | ✅ | ✅ |
| Ver ocupaciones críticas | ✅ | ✅ | ✅ | ✅ |
| Ver ocupaciones en riesgo | ✅ | ✅ | ✅ | ✅ |
| Ver sugerencias de reemplazo | ✅ | ✅ | ✅ | ✅ |
| Auto asignar reemplazo | ✅ | ✅ | ✅ | ✅ |

---

## 23. Person (Persona)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Subir foto | ✅ | ❌ | ❌ | ❌ |
| Actualizar foto | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 24. Person Status History (Historial de Estado de Persona)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 25. Request Person Detail (Detalle de Persona en Solicitud)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 26. Request Resource Detail (Detalle de Recurso en Solicitud)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ❌ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ✅ | ❌ | ❌ |
| Eliminar | ❌ | ✅ | ❌ | ❌ |

---

## 27. Resource Type (Tipo de Recurso)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ❌ | ✅ | ❌ | ❌ |
| Listar | ❌ | ✅ | ❌ | ❌ |
| Actualizar | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |


---

## 28. Session (Sesión)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 29. System Time (Tiempo del Sistema)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Obtener hora | 🌐 PÚBLICO | 🌐 PÚBLICO | 🌐 PÚBLICO | 🌐 PÚBLICO |
| Avanzar tiempo | ✅ | ❌ | ❌ | ❌ |
| Desplazar tiempo | ✅ | ❌ | ❌ | ❌ |

> El endpoint público solo expone la hora actual. Las operaciones de avance/offset están restringidas a SYSTEM_ADMIN.

---

## 30. System User (Usuario del Sistema)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Listar | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Crear | ❌ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 31. Temporary Occupation Assignment (Asignación Temporal de Oficio)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Listar | ✅ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Crear | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ✅ | ❌ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |

---

## 32. Transfer (Traslado)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ❌ | ✅ | ✅ | ❌ |
| Listar | ❌ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ✅ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 33. Transfer History (Historial de Traslado)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ❌ | ✅ | ✅ | ❌ |
| Listar | ❌ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 34. Transfer Person (Persona en Traslado)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ✅ | ✅ | ❌ |
| Ver detalle | ✅ | ✅ | ✅ | ❌ |
| Listar | ✅ | ✅ | ✅ | ❌ |
| Actualizar | ❌ | ✅ | ✅ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |

---

## 35. User Role History (Historial de Rol de Usuario)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| Crear | ❌ | ❌ | ❌ | ❌ |
| Ver detalle | ✅ | ❌ | ❌ | ❌ |
| Listar | ✅ | ❌ | ❌ | ❌ |
| Actualizar | ❌ | ❌ | ❌ | ❌ |
| Eliminar | ❌ | ❌ | ❌ | ❌ |


---

## 36. Email (Correo electrónico)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| API pública | ❌ | ❌ | ❌ | ❌ |
| Uso interno por servicios | ✅ | ✅ | ✅ | ✅ |

> Este módulo no expone controller HTTP propio. Solo contiene proveedores, servicios, repositorio y procesador de entrega de correos.

---

## 37. Temporal Automation (Automatización temporal)

| Acción | SYSTEM_ADMIN | RESOURCE_MANAGEMENT | TRAVEL_MANAGER | WORKER |
|--------|:------------:|:-------------------:|:--------------:|:------:|
| API pública | ❌ | ❌ | ❌ | ❌ |
| Uso interno por automatización del sistema | ✅ | ✅ | ✅ | ✅ |

> Este módulo no expone controller HTTP propio. Se ejecuta como servicio interno para automatizar ciclos diarios, estados de expedición, cierre de sesiones e invalidación de tokens.

---

**Leyenda:**
- ✅ = Acceso permitido
- ❌ = Acceso denegado
- 🌐 = Acceso público (sin autenticación requerida)

**Notas importantes:**
- Todos los módulos validan id de campamento para aislar datos entre campamentos
- Las operaciones de lectura respetan la pertenencia del usuario al campamento
- Los registros históricos (History) son inmutables después de creación
- Los accesos bloqueados con ❌ lanzan ForbiddenException en la API
- **WORKER** tiene acceso muy limitado, solo a operaciones específicas de recolección y movimiento de datos

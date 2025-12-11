# Bloque 4: Dominio de Negocio

**Estado:** Pendiente
**Dependencias:** Bloque 3 (Permisos)

---

## Contenido (Por definir)

1. Modelo: Service (configuración de tipos de evento)
2. Modelo: Resource (recursos reservables)
3. Modelo: Event (la entidad central)
4. Validación de disponibilidad
5. Conflictos y solapamientos

---

## Filosofía

```
ORGANIZATION → SERVICE → RESOURCE → EVENT
```

**Todo es un Evento:** Reserva, clase, partido, evento especial... todos son Events con diferentes configuraciones.

---

## Decisiones Pendientes

- [ ] ¿Event con participants embebidos o referenciados?
- [ ] ¿Recurrencia: RRULE o instancias explícitas?
- [ ] ¿Histórico de cambios en Event?

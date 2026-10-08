package com.panstock.api.repository;

import com.panstock.api.entity.WasteRecord;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Consultas de {@link WasteRecord} que no se pueden expresar con métodos derivados.
 */
public interface WasteRecordRepositoryCustom {

    /**
     * Búsqueda con todos los filtros opcionales: rango de fechas + createdById.
     * Si from/to son null no se aplica filtro de fecha.
     * Si createdById es null no se aplica filtro de usuario.
     */
    List<WasteRecord> search(LocalDateTime from, LocalDateTime to, Long createdById);
}

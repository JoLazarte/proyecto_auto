package com.panstock.api.repository;

import com.panstock.api.entity.WasteRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * {@code search(...)} viene del fragment {@link WasteRecordRepositoryCustom}
 * (implementado en {@code WasteRecordRepositoryCustomImpl}).
 */
public interface WasteRecordRepository
        extends JpaRepository<WasteRecord, Long>, WasteRecordRepositoryCustom {

    /**
     * Todos los registros ordenados por fecha descendente (más recientes primero).
     */
    List<WasteRecord> findAllByOrderByWasteDateDesc();

    /**
     * Registros en un rango de fechas, ordenados por fecha descendente.
     * Usado para filtros de período y para reportes.
     */
    List<WasteRecord> findByWasteDateBetweenOrderByWasteDateDesc(
            LocalDateTime from,
            LocalDateTime to
    );
}

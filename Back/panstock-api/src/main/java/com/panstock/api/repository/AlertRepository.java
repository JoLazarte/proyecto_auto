package com.panstock.api.repository;

import com.panstock.api.entity.Alert;
import com.panstock.api.enums.AlertStatus;
import com.panstock.api.enums.AlertType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {

    /** Todas las alertas, de la más reciente a la más antigua. */
    List<Alert> findAllByOrderByCreatedAtDesc();

    List<Alert> findByStatusOrderByCreatedAtDesc(AlertStatus status);

    boolean existsByAlertTypeAndBatch_IdAndStatus(
            AlertType alertType,
            Long batchId,
            AlertStatus status
    );

    boolean existsByAlertTypeAndProduct_IdAndStatus(
            AlertType alertType,
            Long productId,
            AlertStatus status
    );

    // ── Atajos de dominio ────────────────────────────────────────────────────

    default List<Alert> findActive() {
        return findByStatusOrderByCreatedAtDesc(AlertStatus.ACTIVE);
    }

    default boolean existsActiveByAlertTypeAndBatchId(AlertType alertType, Long batchId) {
        return existsByAlertTypeAndBatch_IdAndStatus(alertType, batchId, AlertStatus.ACTIVE);
    }

    default boolean existsActiveByAlertTypeAndProductId(AlertType alertType, Long productId) {
        return existsByAlertTypeAndProduct_IdAndStatus(alertType, productId, AlertStatus.ACTIVE);
    }
}

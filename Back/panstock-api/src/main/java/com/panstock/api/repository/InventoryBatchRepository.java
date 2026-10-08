package com.panstock.api.repository;

import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.enums.BatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface InventoryBatchRepository extends JpaRepository<InventoryBatch, Long> {

    List<InventoryBatch> findByBatchStatusAndCurrentQuantityGreaterThan(
            BatchStatus batchStatus,
            BigDecimal currentQuantity
    );

    @Query("""
            SELECT b
            FROM InventoryBatch b
            WHERE b.product.id = :productId
              AND b.currentQuantity > 0
              AND b.batchStatus = :batchStatus
              AND (b.expirationDate IS NULL OR b.expirationDate >= CURRENT_DATE)
            ORDER BY
              CASE WHEN b.expirationDate IS NULL THEN 1 ELSE 0 END,
              b.expirationDate ASC,
              b.receivedDate ASC,
              b.id ASC
            """)
    List<InventoryBatch> findSellableByProductIdAndBatchStatus(
            @Param("productId") Long productId,
            @Param("batchStatus") BatchStatus batchStatus
    );

    // ── Atajos de dominio ────────────────────────────────────────────────────

    /** Lotes disponibles con stock > 0. */
    default List<InventoryBatch> findAvailableWithStock() {
        return findByBatchStatusAndCurrentQuantityGreaterThan(BatchStatus.AVAILABLE, BigDecimal.ZERO);
    }

    /** Lotes vendibles de un producto, en orden FEFO (primero los que vencen antes). */
    default List<InventoryBatch> findSellableByProductId(Long productId) {
        return findSellableByProductIdAndBatchStatus(productId, BatchStatus.AVAILABLE);
    }
}

package com.panstock.api.dto.request;

import com.panstock.api.enums.WasteReason;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/**
 * WasteRecordRequest
 *
 * El usuario que registra la merma NO viaja en el request: el backend lo toma
 * del usuario autenticado (token JWT).
 *
 * automatic es OPCIONAL (por defecto false): el frontend lo envía en true cuando
 * descarta un lote ya vencido de forma automática. En ese caso createdBy queda
 * null en la base de datos, lo que indica origen automático. Solo se acepta
 * junto con reason = EXPIRED (el servicio lo valida).
 */
public record WasteRecordRequest(

        @NotNull(message = "El id del lote es obligatorio.")
        Long batchId,

        // Sin @NotNull → null se interpreta como false
        Boolean automatic,

        @NotNull(message = "La cantidad es obligatoria.")
        @Positive(message = "La cantidad debe ser mayor a cero.")
        BigDecimal quantity,

        @NotNull(message = "El motivo de la merma es obligatorio.")
        WasteReason reason,

        String notes
) {
}
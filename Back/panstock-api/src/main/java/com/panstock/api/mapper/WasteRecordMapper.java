package com.panstock.api.mapper;

import com.panstock.api.dto.response.WasteRecordResponse;
import com.panstock.api.entity.InventoryBatch;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.Supplier;
import com.panstock.api.entity.User;
import com.panstock.api.entity.WasteRecord;

public class WasteRecordMapper {

    private WasteRecordMapper() {
    }

    public static WasteRecordResponse toResponse(WasteRecord wasteRecord) {
        User createdBy     = wasteRecord.getCreatedBy();
        Product product    = wasteRecord.getProduct();
        InventoryBatch batch = wasteRecord.getBatch();

        // Proveedor: primero del lote, luego del producto como fallback
        Supplier supplier = null;
        if (batch != null && batch.getSupplier() != null) {
            supplier = batch.getSupplier();
        } else if (product != null && product.getDefaultSupplier() != null) {
            supplier = product.getDefaultSupplier();
        }

        return new WasteRecordResponse(
                wasteRecord.getId(),

                product != null ? product.getId() : null,
                product != null ? product.getName() : null,

                // Categoría
                product != null && product.getCategory() != null ? product.getCategory().getId() : null,
                product != null && product.getCategory() != null ? product.getCategory().getName() : null,

                batch != null ? batch.getId() : null,

                // Usuario que registró
                createdBy != null ? createdBy.getId() : null,
                createdBy != null ? createdBy.getFirstName() + " " + createdBy.getLastName() : null,

                wasteRecord.getQuantity(),
                wasteRecord.getReason(),

                // Proveedor
                supplier != null ? supplier.getId() : null,
                supplier != null ? supplier.getName() : null,

                wasteRecord.getUnitCost(),
                wasteRecord.getUnitSalePrice(),
                wasteRecord.getEconomicLoss(),

                wasteRecord.getWasteDate(),
                wasteRecord.getNotes()
        );
    }
}
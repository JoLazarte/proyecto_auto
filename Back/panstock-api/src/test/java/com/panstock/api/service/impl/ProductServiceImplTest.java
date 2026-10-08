package com.panstock.api.service.impl;

import com.panstock.api.dto.request.ProductRequest;
import com.panstock.api.dto.response.ProductResponse;
import com.panstock.api.entity.Product;
import com.panstock.api.entity.ProductCategory;
import com.panstock.api.enums.ProductOrigin;
import com.panstock.api.enums.UnitType;
import com.panstock.api.exception.BadRequestException;
import com.panstock.api.repository.ProductCategoryRepository;
import com.panstock.api.repository.ProductRepository;
import com.panstock.api.repository.SupplierRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProductServiceImplTest {

    private static final Long CATEGORY_ID = 7L;

    private ProductRepository productRepository;
    private ProductCategoryRepository categoryRepository;
    private SupplierRepository supplierRepository;
    private ProductServiceImpl productService;

    @BeforeEach
    void setUp() {
        productRepository = mock(ProductRepository.class);
        categoryRepository = mock(ProductCategoryRepository.class);
        supplierRepository = mock(SupplierRepository.class);
        productService = new ProductServiceImpl(
                productRepository,
                categoryRepository,
                supplierRepository
        );
    }

    @Test
    void createRejectsDuplicateProductName() {
        when(productRepository.existsByNameIgnoreCase("barrita de cereal externa")).thenReturn(true);
        ProductRequest request = productRequest("barrita de cereal externa");

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> productService.create(request)
        );

        assertThat(exception.getMessage())
                .isEqualTo("Ya existe un producto con el nombre barrita de cereal externa");
        verify(productRepository, never()).save(any(Product.class));
        verify(categoryRepository, never()).findById(any());
        verify(supplierRepository, never()).findById(any());
    }

    @Test
    void createSavesProductWhenNameIsAvailable() {
        when(productRepository.existsByNameIgnoreCase(any())).thenReturn(false);
        when(categoryRepository.findById(CATEGORY_ID)).thenReturn(Optional.of(productCategory()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        String name = "Barrita de cereal externa";

        ProductResponse response = productService.create(productRequest(name));

        assertThat(response.id()).isNotNull();
        assertThat(response.name()).isEqualTo(name);
        assertThat(response.categoryId()).isEqualTo(CATEGORY_ID);
        assertThat(response.categoryName()).isEqualTo("Snacks");
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void updateRejectsNameUsedByAnotherProduct() {
        when(productRepository.findById(10L)).thenReturn(Optional.of(product(10L, "Nombre anterior")));
        when(productRepository.existsByNameIgnoreCaseAndIdNot("barrita de cereal externa", 10L)).thenReturn(true);
        ProductRequest request = productRequest("barrita de cereal externa");

        BadRequestException exception = assertThrows(
                BadRequestException.class,
                () -> productService.update(10L, request)
        );

        assertThat(exception.getMessage())
                .isEqualTo("Ya existe otro producto con el nombre barrita de cereal externa");
        verify(productRepository, never()).save(any(Product.class));
        verify(categoryRepository, never()).findById(any());
        verify(supplierRepository, never()).findById(any());
    }

    @Test
    void updateAllowsSameProductWhenNameIsAvailableForOtherIds() {
        when(productRepository.findById(10L))
                .thenReturn(Optional.of(product(10L, "Barrita de cereal externa")));
        when(productRepository.existsByNameIgnoreCaseAndIdNot("Barrita de cereal externa", 10L)).thenReturn(false);
        when(categoryRepository.findById(CATEGORY_ID)).thenReturn(Optional.of(productCategory()));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = productService.update(
                10L,
                productRequest("Barrita de cereal externa")
        );

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.name()).isEqualTo("Barrita de cereal externa");
        assertThat(response.categoryId()).isEqualTo(CATEGORY_ID);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    private ProductRequest productRequest(String name) {
        return new ProductRequest(
                name,
                "Producto externo mock",
                CATEGORY_ID,
                null,
                ProductOrigin.EXTERNAL,
                true,
                UnitType.UNIT,
                new BigDecimal("500.00"),
                new BigDecimal("1200.00"),
                new BigDecimal("10"),
                true
        );
    }

    private Product product(Long id, String name) {
        Product product = new Product();
        product.setId(id);
        product.setName(name);
        product.setCategory(productCategory());
        product.setOrigin(ProductOrigin.EXTERNAL);
        product.setPerishable(true);
        product.setUnitType(UnitType.UNIT);
        product.setCostPrice(new BigDecimal("500.00"));
        product.setSalePrice(new BigDecimal("1200.00"));
        product.setMinimumStock(new BigDecimal("10"));
        product.setActive(true);
        return product;
    }

    private ProductCategory productCategory() {
        ProductCategory category = new ProductCategory();
        category.setId(CATEGORY_ID);
        category.setName("Snacks");
        category.setActive(true);
        return category;
    }
}

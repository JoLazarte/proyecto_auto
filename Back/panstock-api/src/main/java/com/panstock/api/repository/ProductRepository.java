package com.panstock.api.repository;

import com.panstock.api.entity.Product;
import com.panstock.api.enums.ProductOrigin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findAllByOrderByNameAsc();

    List<Product> findByActiveTrueOrderByNameAsc();

    List<Product> findByOriginAndActiveTrueOrderByNameAsc(ProductOrigin origin);

    List<Product> findByCategoryIdAndActiveTrueOrderByNameAsc(Long categoryId);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);
}

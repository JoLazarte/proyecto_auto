package com.panstock.api.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.panstock.api.dto.UserDTO;
import com.panstock.api.dto.request.CreateEmployeeRequest;
import com.panstock.api.dto.response.ResponseData;
import com.panstock.api.entity.User;
import com.panstock.api.service.UserService;

import jakarta.validation.Valid;

/**
 * Los errores se traducen a respuestas HTTP en GlobalExceptionHandler.
 * Acceso (ver SecurityConfig): /users/data y /users/update para cualquier usuario
 * autenticado; el resto de /users/** solo para OWNER.
 */
@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<Page<User>> getUsers(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        if (page == null || size == null)
            return ResponseEntity.ok(userService.getUsers(PageRequest.of(0, Integer.MAX_VALUE)));
        return ResponseEntity.ok(userService.getUsers(PageRequest.of(page, size)));
    }

    // POST /users  →  un OWNER crea un empleado (rol EMPLOYEE, habilitado).
    @PostMapping
    public ResponseEntity<ResponseData<UserDTO>> createEmployee(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateEmployeeRequest request) {
        User owner = userService.getUserByUsername(userDetails.getUsername());
        User created = userService.createEmployee(request, owner);
        return ResponseEntity.status(HttpStatus.CREATED).body(ResponseData.success(created.toDTO()));
    }

    @GetMapping("/data")
    public ResponseEntity<ResponseData<UserDTO>> getUserData(@AuthenticationPrincipal UserDetails userDetails) {
        User authUser = userService.getUserByUsername(userDetails.getUsername());
        return ResponseEntity.ok(ResponseData.success(authUser.toDTO()));
    }

    @PutMapping("/update")
    public ResponseEntity<ResponseData<UserDTO>> updateUser(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserDTO userDTO) {
        User authUser = userService.getUserByUsername(userDetails.getUsername());
        User updatedUser = userService.updateUser(authUser, userDTO);
        return ResponseEntity.ok(ResponseData.success(updatedUser.toDTO()));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<User> getUserById(@PathVariable Long userId) {
        Optional<User> result = userService.getUserById(userId);
        if (result.isPresent())
            return ResponseEntity.ok(result.get());
        return ResponseEntity.noContent().build();
    }

    // -------------------------------------------------------
    // PATCH /users/{userId}/disable  →  deshabilitar un EMPLOYEE
    // PATCH /users/{userId}/enable   →  volver a habilitarlo
    //
    // Solo un OWNER autenticado puede llamar a estos endpoints.
    // No se puede deshabilitar a un OWNER (ni a sí mismo).
    // Devuelven 204 No Content si tuvieron éxito.
    // -------------------------------------------------------
    @PatchMapping("/{userId}/disable")
    public ResponseEntity<Void> disableEmployee(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userId) {
        User requestingUser = userService.getUserByUsername(userDetails.getUsername());
        userService.disableEmployee(requestingUser, userId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{userId}/enable")
    public ResponseEntity<Void> enableEmployee(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long userId) {
        User requestingUser = userService.getUserByUsername(userDetails.getUsername());
        userService.enableEmployee(requestingUser, userId);
        return ResponseEntity.noContent().build();
    }
}

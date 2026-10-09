package com.panstock.api.controller.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.panstock.api.dto.response.ResponseData;
import com.panstock.api.service.AuthenticationService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/**
 * Solo inicio de sesión. No hay registro público: los empleados los crea un OWNER
 * desde POST /users.
 * Los errores (validación, credenciales inválidas) se traducen a respuestas HTTP
 * en GlobalExceptionHandler.
 */
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authService;

    @PostMapping("/authenticate")
    public ResponseEntity<ResponseData<AuthenticationResponse>> authenticate(
            @Valid @RequestBody AuthenticationRequest request) {
        return ResponseEntity.ok(ResponseData.success(authService.authenticate(request)));
    }
}

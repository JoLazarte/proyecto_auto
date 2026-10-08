package com.panstock.api.controller.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationRequest {
    @NotBlank(message = "El usuario es obligatorio.")
    private String username;

    @NotBlank(message = "La contraseña es obligatoria.")
    private String password;
}

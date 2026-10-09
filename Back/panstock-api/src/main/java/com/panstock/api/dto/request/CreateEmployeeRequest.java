package com.panstock.api.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Datos para que un OWNER cree un empleado.
 * No incluye el rol: los usuarios creados por este camino siempre son EMPLOYEE.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class CreateEmployeeRequest {

    public static final int PASSWORD_MIN_LENGTH = 8;
    /** BCrypt solo usa los primeros 72 bytes de la contraseña. */
    public static final int PASSWORD_MAX_LENGTH = 72;

    @NotBlank(message = "El usuario es obligatorio.")
    @Size(min = 3, max = 50, message = "El usuario debe tener entre 3 y 50 caracteres.")
    private String username;

    @NotBlank(message = "El nombre es obligatorio.")
    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres.")
    private String firstName;

    @NotBlank(message = "El apellido es obligatorio.")
    @Size(max = 100, message = "El apellido no puede superar los 100 caracteres.")
    private String lastName;

    @NotBlank(message = "El email es obligatorio.")
    @Email(message = "El email no tiene un formato válido.")
    @Size(max = 150, message = "El email no puede superar los 150 caracteres.")
    private String email;

    @NotBlank(message = "La contraseña es obligatoria.")
    @Size(min = PASSWORD_MIN_LENGTH, max = PASSWORD_MAX_LENGTH,
          message = "La contraseña debe tener entre 8 y 72 caracteres.")
    private String password;
}

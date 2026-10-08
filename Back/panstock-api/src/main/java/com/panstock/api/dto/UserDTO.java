package com.panstock.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Todos los campos son opcionales: en una actualización solo se modifican
 * los que vienen informados (las validaciones aplican únicamente si el campo no es null).
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {

    private Long id;

    private String username;

    @Size(max = 100, message = "El nombre no puede superar los 100 caracteres.")
    private String firstName;

    @Size(max = 100, message = "El apellido no puede superar los 100 caracteres.")
    private String lastName;

    @Email(message = "El email no tiene un formato válido.")
    @Size(max = 150, message = "El email no puede superar los 150 caracteres.")
    private String email;

    /** Solo de entrada: nunca se devuelve al cliente (evita exponer el hash). Vacío = no cambiar. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Pattern(regexp = "^$|.{8,72}", message = "La contraseña debe tener entre 8 y 72 caracteres.")
    private String password;

    private Role role;

    public User toEntity() {
        return new User(
                this.id,
                this.username,
                this.firstName,
                this.lastName,
                this.email,
                this.password,
                this.role, null
                );
    }
}

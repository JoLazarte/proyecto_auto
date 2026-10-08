package com.panstock.api.controller.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import com.panstock.api.enums.Role;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class RegisterRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private RegisterRequest.RegisterRequestBuilder validRequest() {
        return RegisterRequest.builder()
                .username("lorena")
                .firstName("Lorena")
                .lastName("Pérez")
                .email("lorena@panstock.com")
                .password("Password123")
                .role(Role.EMPLOYEE);
    }

    private Set<String> invalidFields(RegisterRequest request) {
        Set<ConstraintViolation<RegisterRequest>> violations = validator.validate(request);
        return violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void aValidRequestHasNoViolations() {
        assertThat(validator.validate(validRequest().build())).isEmpty();
    }

    @Test
    void passwordShorterThanEightCharactersIsRejected() {
        assertThat(invalidFields(validRequest().password("abc1234").build()))
                .containsExactly("password");
    }

    @Test
    void passwordLongerThan72CharactersIsRejected() {
        assertThat(invalidFields(validRequest().password("a".repeat(73)).build()))
                .containsExactly("password");
    }

    @Test
    void emailWithoutAtSignIsRejected() {
        assertThat(invalidFields(validRequest().email("lorena.panstock.com").build()))
                .containsExactly("email");
    }

    @Test
    void blankUsernameIsRejected() {
        assertThat(invalidFields(validRequest().username("   ").build()))
                .contains("username");
    }

    @Test
    void missingRoleIsRejected() {
        assertThat(invalidFields(validRequest().role(null).build()))
                .containsExactly("role");
    }
}

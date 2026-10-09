package com.panstock.api.dto.request;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.stream.Collectors;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

class CreateEmployeeRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUp() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    private CreateEmployeeRequest.CreateEmployeeRequestBuilder validRequest() {
        return CreateEmployeeRequest.builder()
                .username("martina")
                .firstName("Martina")
                .lastName("Pérez")
                .email("martina@panstock.com")
                .password("Password123");
    }

    private Set<String> invalidFields(CreateEmployeeRequest request) {
        Set<ConstraintViolation<CreateEmployeeRequest>> violations = validator.validate(request);
        return violations.stream()
                .map(v -> v.getPropertyPath().toString())
                .collect(Collectors.toSet());
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
        assertThat(invalidFields(validRequest().email("martina.panstock.com").build()))
                .containsExactly("email");
    }

    @Test
    void blankUsernameIsRejected() {
        assertThat(invalidFields(validRequest().username("   ").build()))
                .contains("username");
    }
}

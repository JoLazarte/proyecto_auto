package com.panstock.api.exception;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import lombok.extern.slf4j.Slf4j;

import java.time.LocalDateTime;

/**
 * Traduce las excepciones de la aplicación a respuestas HTTP con un cuerpo uniforme
 * (ErrorResponse). Cualquier otra excepción inesperada la resuelve Spring Boot
 * (500) y la registra en el log con su traza completa.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleResourceNotFound(ResourceNotFoundException ex) {
        return new ErrorResponse(
                LocalDateTime.now(),
                404,
                "Not Found",
                ex.getMessage()
        );
    }

    @ExceptionHandler({BadRequestException.class, UserException.class})
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleBadRequest(RuntimeException ex) {
        return new ErrorResponse(
                LocalDateTime.now(),
                400,
                "Bad Request",
                ex.getMessage()
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .findFirst()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .orElse("Error de validación.");

        return new ErrorResponse(
                LocalDateTime.now(),
                400,
                "Validation Error",
                message
        );
    }

    /**
     * Credenciales inválidas, usuario deshabilitado, etc. Siempre el mismo mensaje
     * para no revelar si el usuario existe.
     */
    @ExceptionHandler(AuthenticationException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public ErrorResponse handleAuthentication(AuthenticationException ex) {
        log.warn("Autenticación rechazada: {}", ex.getClass().getSimpleName());
        return new ErrorResponse(
                LocalDateTime.now(),
                401,
                "Unauthorized",
                "Usuario o contraseña incorrecto."
        );
    }
}

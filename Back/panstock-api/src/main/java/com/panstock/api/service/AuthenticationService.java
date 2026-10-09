package com.panstock.api.service;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import com.panstock.api.controller.auth.AuthenticationRequest;
import com.panstock.api.controller.auth.AuthenticationResponse;
import com.panstock.api.controller.config.JwtService;
import com.panstock.api.entity.User;
import com.panstock.api.exception.UserException;
import com.panstock.api.repository.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        // Si las credenciales son inválidas (o el usuario está deshabilitado) lanza
        // AuthenticationException, que GlobalExceptionHandler convierte en un 401.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()));

        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new UserException(
                        "El usuario " + request.getUsername() + " no existe."));

        log.info("Inicio de sesión: {}", user.getUsername());

        return AuthenticationResponse.builder()
                .accessToken(jwtService.generateToken(user))
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .build();
    }
}

package com.panstock.api.service.impl;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.panstock.api.controller.auth.RegisterRequest;
import com.panstock.api.dto.UserDTO;
import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import com.panstock.api.exception.UserException;
import com.panstock.api.repository.UserRepository;
import com.panstock.api.service.UserService;

import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;

/**
 * Las excepciones (UserException, errores de base de datos, etc.) no se capturan acá:
 * suben hasta GlobalExceptionHandler, que las convierte en la respuesta HTTP.
 */
@Slf4j
@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Transactional
    @Override
    public User createUser(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new UserException("El usuario " + request.getUsername() + " ya existe");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new UserException("El email " + request.getEmail() + " ya está registrado.");
        }

        User user = User.builder()
                .username(request.getUsername())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole())
                .enabled(true) // Siempre habilitado al crear
                .build();

        return userRepository.save(user);
    }

    @Override
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UserException("Usuario no encontrado"));
    }

    @Override
    public Page<User> getUsers(PageRequest pageable) {
        return userRepository.findAll(pageable);
    }

    @Override
    public Optional<User> getUserById(Long userId) {
        return userRepository.findById(userId);
    }

    @Transactional
    @Override
    public User updateUser(User authenticatedUser, UserDTO updates) {
        String newEmail = updates.getEmail();
        if (newEmail != null && !newEmail.equalsIgnoreCase(authenticatedUser.getEmail())) {
            boolean emailTaken = userRepository.existsByEmailIgnoreCaseAndIdNot(
                    newEmail, authenticatedUser.getId()
            );
            if (emailTaken) {
                throw new UserException("El email " + newEmail + " ya está en uso por otro usuario.");
            }
            authenticatedUser.setEmail(newEmail);
        }

        if (updates.getFirstName() != null && !updates.getFirstName().isBlank()) {
            authenticatedUser.setFirstName(updates.getFirstName());
        }

        if (updates.getLastName() != null && !updates.getLastName().isBlank()) {
            authenticatedUser.setLastName(updates.getLastName());
        }

        // El largo de la contraseña ya se validó en UserDTO (@Pattern)
        String newPassword = updates.getPassword();
        if (newPassword != null && !newPassword.isBlank()) {
            authenticatedUser.setPassword(passwordEncoder.encode(newPassword));
        }

        return userRepository.save(authenticatedUser);
    }

    @Transactional
    @Override
    public void disableEmployee(User requestingUser, Long targetUserId) {
        if (requestingUser.getRole() != Role.OWNER) {
            throw new UserException("Solo un OWNER puede deshabilitar usuarios.");
        }

        User target = userRepository.findById(targetUserId)
                .orElseThrow(() -> new UserException("Usuario no encontrado con id " + targetUserId));

        if (target.getRole() == Role.OWNER) {
            throw new UserException("No se puede deshabilitar a un OWNER.");
        }

        if (!target.isEnabled()) {
            throw new UserException("El usuario ya está deshabilitado.");
        }

        target.setEnabled(false);
        userRepository.save(target);
        log.info("Usuario {} deshabilitado por {}", target.getUsername(), requestingUser.getUsername());
    }
}

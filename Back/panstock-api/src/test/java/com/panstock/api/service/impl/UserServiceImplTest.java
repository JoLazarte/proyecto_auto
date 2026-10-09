package com.panstock.api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.panstock.api.dto.request.CreateEmployeeRequest;
import com.panstock.api.entity.User;
import com.panstock.api.enums.Role;
import com.panstock.api.exception.UserException;
import com.panstock.api.repository.UserRepository;

@ExtendWith(MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    private User owner() {
        return User.builder().id(1L).username("lorena").role(Role.OWNER).enabled(true).build();
    }

    private User employee(boolean enabled) {
        return User.builder().id(2L).username("martina").role(Role.EMPLOYEE).enabled(enabled).build();
    }

    private CreateEmployeeRequest request() {
        return CreateEmployeeRequest.builder()
                .username("martina")
                .firstName("Martina")
                .lastName("Pérez")
                .email("martina@panstock.com")
                .password("Password123")
                .build();
    }

    // ── createEmployee ──────────────────────────────────────────────────────

    @Test
    void ownerCreatesAnEnabledEmployeeWithEncodedPassword() {
        when(userRepository.existsByUsername("martina")).thenReturn(false);
        when(userRepository.existsByEmail("martina@panstock.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123")).thenReturn("HASH");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        User created = userService.createEmployee(request(), owner());

        assertThat(created.getRole()).isEqualTo(Role.EMPLOYEE);
        assertThat(created.isEnabled()).isTrue();
        assertThat(created.getPassword()).isEqualTo("HASH");
    }

    @Test
    void anEmployeeCannotCreateEmployees() {
        assertThatThrownBy(() -> userService.createEmployee(request(), employee(true)))
                .isInstanceOf(UserException.class)
                .hasMessageContaining("OWNER");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void creatingAnEmployeeWithAnExistingUsernameIsRejected() {
        when(userRepository.existsByUsername("martina")).thenReturn(true);

        assertThatThrownBy(() -> userService.createEmployee(request(), owner()))
                .isInstanceOf(UserException.class)
                .hasMessageContaining("ya existe");

        verify(userRepository, never()).save(any(User.class));
    }

    // ── disable / enable ────────────────────────────────────────────────────

    @Test
    void ownerDisablesAnEmployee() {
        User target = employee(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        userService.disableEmployee(owner(), 2L);

        assertThat(target.isEnabled()).isFalse();
        verify(userRepository).save(target);
    }

    @Test
    void ownerEnablesADisabledEmployee() {
        User target = employee(false);
        when(userRepository.findById(2L)).thenReturn(Optional.of(target));

        userService.enableEmployee(owner(), 2L);

        assertThat(target.isEnabled()).isTrue();
        verify(userRepository).save(target);
    }

    @Test
    void enablingAnAlreadyEnabledEmployeeIsRejected() {
        when(userRepository.findById(2L)).thenReturn(Optional.of(employee(true)));

        assertThatThrownBy(() -> userService.enableEmployee(owner(), 2L))
                .isInstanceOf(UserException.class)
                .hasMessageContaining("ya está habilitado");
    }

    @Test
    void anOwnerCannotBeDisabled() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(owner()));

        assertThatThrownBy(() -> userService.disableEmployee(owner(), 1L))
                .isInstanceOf(UserException.class)
                .hasMessageContaining("OWNER");
    }

    @Test
    void anEmployeeCannotEnableOrDisableUsers() {
        assertThatThrownBy(() -> userService.disableEmployee(employee(true), 3L))
                .isInstanceOf(UserException.class);
        assertThatThrownBy(() -> userService.enableEmployee(employee(true), 3L))
                .isInstanceOf(UserException.class);

        verify(userRepository, never()).save(any(User.class));
    }
}

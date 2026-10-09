package com.panstock.api.service;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import com.panstock.api.dto.UserDTO;
import com.panstock.api.dto.request.CreateEmployeeRequest;
import com.panstock.api.entity.User;

import jakarta.transaction.Transactional;

public interface UserService {

    /**
     * Crea un usuario con rol EMPLOYEE. Solo puede hacerlo un OWNER.
     * El rol nunca se toma del request.
     *
     * @param request   datos del nuevo empleado
     * @param createdBy el usuario autenticado que lo crea
     */
    @Transactional
    User createEmployee(CreateEmployeeRequest request, User createdBy);

    public User getUserByUsername(String username);

    public Page<User> getUsers(PageRequest pageRequest);

    /**
     * Actualiza firstName, lastName, email y opcionalmente password
     * del usuario autenticado (el propio usuario sobre sí mismo).
     * No permite cambiar role ni enabled.
     */
    User updateUser(User authenticatedUser, UserDTO updates);

    public Optional<User> getUserById(Long userId);

    /**
     * Deshabilita un usuario con rol EMPLOYEE.
     * Solo puede ser llamado por un usuario con rol OWNER.
     * No se puede deshabilitar a un OWNER.
     *
     * @param requestingUser el usuario autenticado que hace la petición
     * @param targetUserId   el ID del usuario a deshabilitar
     */
    @Transactional
    void disableEmployee(User requestingUser, Long targetUserId);

    /**
     * Vuelve a habilitar a un EMPLOYEE deshabilitado.
     * Solo puede ser llamado por un usuario con rol OWNER.
     *
     * @param requestingUser el usuario autenticado que hace la petición
     * @param targetUserId   el ID del usuario a habilitar
     */
    @Transactional
    void enableEmployee(User requestingUser, Long targetUserId);

}

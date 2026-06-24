package com.hms.service;

import com.hms.dto.LoginRequest;
import com.hms.dto.LoginResponse;
import com.hms.dto.UserDto;
import com.hms.entity.Admin;
import com.hms.entity.Student;
import com.hms.repository.AdminRepository;
import com.hms.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;

import java.security.Key;
import java.util.Date;

@Service
public class AuthService {

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private StudentRepository studentRepository;
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    private String generateToken(Long userId, String role) {
        Key key = Keys.hmacShaKeyFor(jwtSecret.getBytes());
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    public LoginResponse authenticate(LoginRequest loginRequest) {
        if ("admin".equals(loginRequest.getRole())) {
            return authenticateAdmin(loginRequest);
        } else if ("student".equals(loginRequest.getRole())) {
            return authenticateStudent(loginRequest);
        } else {
            throw new RuntimeException("Invalid role specified");
        }
    }

    private LoginResponse authenticateAdmin(LoginRequest loginRequest) {
        // Check if admin credentials match
        if (adminUsername.equals(loginRequest.getUsername()) && adminPassword.equals(loginRequest.getPassword())) {
            UserDto userDto = new UserDto();
            userDto.setId(1L);
            userDto.setUsername("admin");
            userDto.setName("Administrator");
            userDto.setRole("admin");

            return LoginResponse.builder()
                .success(true)
                .message("Login successful")
                .token(generateToken(1L, "admin"))
                .user(userDto)
                .build();
        } else {
            throw new RuntimeException("Invalid admin credentials");
        }
    }

    private LoginResponse authenticateStudent(LoginRequest loginRequest) {
        if (loginRequest.getName() != null && !loginRequest.getName().trim().isEmpty() &&
            loginRequest.getAdmissionNumber() != null && !loginRequest.getAdmissionNumber().trim().isEmpty()) {
            
            // Check if student exists (must be added by admin first)
            Student student = studentRepository.findByAdmissionNumber(loginRequest.getAdmissionNumber())
                .orElseThrow(() -> new RuntimeException("Student not found. Please contact admin to add your details first."));
            
            // Verify the name matches
            if (!student.getName().equalsIgnoreCase(loginRequest.getName().trim())) {
                throw new RuntimeException("Name does not match our records");
            }

            UserDto userDto = new UserDto();
            userDto.setId(student.getId());
            userDto.setName(student.getName());
            userDto.setAdmissionNumber(student.getAdmissionNumber());
            userDto.setRole("student");
            userDto.setEmail(student.getEmail());
            userDto.setPhone(student.getPhone());
            userDto.setRoomNumber(student.getRoomNumber());

            return LoginResponse.builder()
                .success(true)
                .message("Login successful")
                .token(generateToken(student.getId(), "student"))
                .user(userDto)
                .build();
        } else {
            throw new RuntimeException("Name and admission number are required");
        }
    }
}
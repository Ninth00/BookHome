USE railway;

-- Tabla Usuarios
CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL,
    rol ENUM ('arrendador', 'estudiante') NOT NULL,
    telefono VARCHAR(10) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    contrasena VARCHAR(16) NOT NULL
);

-- Tabla Propiedades
CREATE TABLE Propiedades (
    id_propiedad INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo_propiedad ENUM('habitacion','casa', 'departamento') NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    descripcion TEXT,
    metros_cuadrados DECIMAL(5, 2),
    habitaciones INT,
    banos INT,
    comparte_comparios BOOLEAN DEFAULT FALSE,      
    companeros_cuarto INT,
    reglas TEXT,                                    
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);


CREATE TABLE Direcciones (
    id_direccion INT AUTO_INCREMENT PRIMARY KEY,
    id_propiedad INT NOT NULL,
    calle VARCHAR(255) NOT NULL,
    numero_exterior VARCHAR(50) NOT NULL,
    numero_interior VARCHAR(50),
    colonia VARCHAR(100) NOT NULL,
    codigo_postal VARCHAR(10) NOT NULL,
    delegacion VARCHAR(100) NOT NULL,
    FOREIGN KEY (id_propiedad) REFERENCES Propiedades(id_propiedad)
);

-- Tabla Fotos
CREATE TABLE Fotos (
    id_foto INT AUTO_INCREMENT PRIMARY KEY,
    id_propiedad INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_propiedad) REFERENCES Propiedades(id_propiedad)
);


-- Tabla Favoritos (relaciona usuarios con propiedades favoritas)
CREATE TABLE Favoritos (
    id_favorito INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_propiedad INT NOT NULL,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_propiedad) REFERENCES Propiedades(id_propiedad),
    CONSTRAINT UNIQUE (id_usuario, id_propiedad)
);

CREATE TABLE Conversaciones (
    id_conversacion INT AUTO_INCREMENT PRIMARY KEY,
    id_arrendador INT NOT NULL,
    id_estudiante INT NOT NULL,
    id_propiedad INT NOT NULL,
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_arrendador) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_estudiante) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_propiedad) REFERENCES Propiedades(id_propiedad),
    CONSTRAINT UNIQUE (id_arrendador, id_estudiante, id_propiedad)
);

CREATE TABLE Mensajes (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    id_conversacion INT NOT NULL,
    id_usuario INT NOT NULL, 
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_conversacion) REFERENCES Conversaciones(id_conversacion),
    FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE Pagos (
    id_pago INT AUTO_INCREMENT PRIMARY KEY,
    id_estudiante INT NOT NULL,
    id_propiedad INT NOT NULL,
    monto DECIMAL(10, 2) NOT NULL,
    fecha_pago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    estado_pago ENUM('pendiente', 'pagado', 'fallido') DEFAULT 'pendiente',
    paypal_order_id VARCHAR(100), -- para referencia cruzada
    FOREIGN KEY (id_estudiante) REFERENCES Usuarios(id_usuario),
    FOREIGN KEY (id_propiedad) REFERENCES Propiedades(id_propiedad)
);


SELECT * FROM propiedades;
SELECT * FROM usuarios;
SELECT * FROM direcciones;
SELECT * FROM favoritos;
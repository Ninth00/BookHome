const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const path = require("path"); // <-- Asegúrate de agregar esta línea
const multer = require("multer");
const fs = require('node:fs/promises');
const session = require("express-session"); 
const app = express();
const socketIo = require('socket.io');
const http = require('http');
const server = http.createServer(app);
const io = socketIo(server);
const axios = require('axios');
require('dotenv').config();
 
const port = 3000;

// Configuración de Multer para almacenar imágenes
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "public/uploads"); // Asegúrate de tener la carpeta 'uploads'
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único basado en la fecha
    }
});
const upload = multer({ storage: storage });

const con = mysql.createConnection({
    host: process.env.HOST,
    port: process.env.PORT,
    user: process.env.USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE
});

con.connect((err) => {
    if (err) {
        console.error("Error al conectar", err);
        return;
    }
    console.log("Conectado a la base de datos");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Configurar la sesión
app.use(session({
    secret: 'clave_secreta', // Clave secreta para firmar la cookie
    resave: false,            // No reescribir la sesión si no ha cambiado
    saveUninitialized: false,  // Guardar la sesión incluso si no hay datos
    cookie: { secure: false } // Desactivar 'secure' en desarrollo (cambiar a true en producción)
}));

// CRUD Usuarios
app.get('/verificarUsuario', (req, res) => {
    const { email, nombre , telefono } = req.query;
    con.query('SELECT email, nombre, telefono FROM Usuarios WHERE email = ? OR nombre = ?', [email, nombre], (error, results) => {
        if (error) throw error;
        const emailExistente = results?.some(row => row.email === email) || false;
        const nombreExistente = results?.some(row => row.nombre === nombre) || false;
        const telefonoExistente = results?.some(row=> row.telefono === telefono) || false;
        res.json({ emailExistente, nombreExistente, telefonoExistente });
    });
});

app.post('/agregarUsuario', (req, res) => {
    const { nombre, rol, telefono, email, password } = req.body;

    con.query('INSERT INTO Usuarios (nombre, rol, telefono, email, contrasena) VALUES (?, ?, ?, ?, ?)', [nombre, rol, telefono, email, password], (error, results) => {
        if (error) {
            console.log("Error al registrar el usuario:", error);
            return res.status(500).send('Error en el registro');
        }

        const userId = results.insertId;
        req.session.userId = userId;
        req.session.username = nombre;
        req.session.rol = rol;

        console.log("Sesión guardada tras registro:", req.session);

        res.status(200).json({
            authenticated: true,
            message: 'Usuario registrado y sesión iniciada correctamente'
        });
    });
});

app.post('/iniciarSesion', (req, res) => {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();

    con.query('SELECT * FROM Usuarios WHERE email = ?', [normalizedEmail], (error, results) => {
        if (error) throw error;

        if (results.length > 0) {
            const user = results[0];

            if (user.contrasena === password) {
                req.session.userId = user.id_usuario;
                req.session.username = user.nombre;
                req.session.rol = user.rol;

                console.log("Sesión iniciada:", req.session);
                res.json({ authenticated: true , rol: user.rol });
            } else {
                res.json({ authenticated: false, message: 'Contraseña incorrecta' });
            }
        } else {
            res.json({ authenticated: false, message: 'Correo electrónico no registrado' });
        }
    });
});

app.get('/usuario', (req, res) => {
    console.log("Sesión actual:", req.session);
    if (req.session.userId) {
        res.json({ userId: req.session.userId, username: req.session.username });
    } else {
        res.status(401).json({ message: 'No autenticado' });
    }
});

app.get('/logout', (req, res) => {
    console.log("Antes de cerrar sesión:", req.session);

    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error al cerrar la sesión');
        }
        res.clearCookie('connect.sid');
        console.log("Después de cerrar sesión:", req.session);
        res.send('Sesión cerrada');
    });
});

// CRUD Propiedades
// Endpoint para agregar propiedad con imágenes
app.post('/agregarPropiedad', upload.array('imagenes[]', 5), (req, res) => {
    const {
        id_usuario,
        tipo_propiedad,
        precio,
        descripcion,
        metros_cuadrados,
        habitaciones,
        banos,
        comparte_comparios,
        companeros_cuarto,  // Compañeros de cuarto
        reglas,             // Reglas
        calle,
        numero_exterior,
        numero_interior,
        colonia,
        codigo_postal,
        delegacion
    } = req.body;

    // Validar que los campos requeridos estén presentes
    if (!id_usuario || !tipo_propiedad || !precio || !descripcion || !metros_cuadrados || !banos || !calle || !numero_exterior || !colonia || !codigo_postal || !delegacion) {
        return res.status(400).send("Todos los campos son requeridos.");
    }

    // Si el tipo de propiedad no es "habitacion", validamos que el campo "habitaciones" esté presente
    if (tipo_propiedad !== 'habitacion' && !habitaciones) {
        return res.status(400).send("El campo 'habitaciones' es obligatorio cuando el tipo de propiedad no es 'Habitación'.");
    }

    // Insertar la propiedad
    con.query('INSERT INTO Propiedades (id_usuario, tipo_propiedad, precio, descripcion, metros_cuadrados, habitaciones, banos, comparte_comparios, companeros_cuarto, reglas) VALUES (?,?,?,?,?,?,?,?,?,?)',
        [id_usuario, tipo_propiedad, precio, descripcion, metros_cuadrados, habitaciones, banos, comparte_comparios ? 1 : 0, companeros_cuarto, reglas], (err, result) => {
            if (err) {
                console.log("Error al insertar propiedad", err);
                return res.status(500).send("Error al insertar propiedad");
            }

            const id_propiedad = result.insertId;  // Obtener el ID de la propiedad recién insertada

            // Insertar la dirección
            con.query('INSERT INTO Direcciones (id_propiedad, calle, numero_exterior, numero_interior, colonia, codigo_postal, delegacion) VALUES (?,?,?,?,?,?,?)',
                [id_propiedad, calle, numero_exterior, numero_interior, colonia, codigo_postal, delegacion], (err) => {
                    if (err) {
                        console.log("Error al insertar dirección", err);
                        return res.status(500).send("Error al insertar dirección");
                    }

                    // Subir imágenes a la base de datos
                    if (req.files) {
                        req.files.forEach(file => {
                            con.query('INSERT INTO Fotos (id_propiedad, url) VALUES (?, ?)', [id_propiedad, file.path], (err) => {
                                if (err) {
                                    console.log("Error al insertar foto", err);
                                    return res.status(500).send("Error al insertar fotos");
                                }
                            });
                        });
                    }

                    return res.send("Propiedad, dirección y fotos agregadas correctamente");
                });
        });
});



app.get('/obtenerPropiedades', (req, res) => {
    const query = `
        SELECT 
            p.id_propiedad, 
            p.id_usuario,
            p.tipo_propiedad, 
            p.precio, 
            p.descripcion, 
            p.metros_cuadrados, 
            p.habitaciones, 
            p.banos,
            p.comparte_comparios,
            p.companeros_cuarto,  
            p.reglas,              
            d.calle, 
            d.numero_exterior, 
            d.numero_interior, 
            d.colonia, 
            d.codigo_postal, 
            d.delegacion,
            f.url AS url_imagen
        FROM Propiedades p
        JOIN Direcciones d ON p.id_propiedad = d.id_propiedad
        LEFT JOIN Fotos f ON p.id_propiedad = f.id_propiedad
    `;

    con.query(query, (err, propiedades) => {
        if (err) {
            console.log("Error al obtener propiedades", err);
            return res.status(500).send("Error al obtener propiedades");
        }

        propiedades = propiedades.map(propiedad => {
            const imagenUrl = propiedad.url_imagen 
                ? `/uploads/${path.basename(propiedad.url_imagen)}`
                : '/uploads/default.jpg';

            return {
                ...propiedad,
                url_imagen: imagenUrl
            };
        });
        console.log(propiedades)
        return res.json(propiedades);
    });
});



app.get('/obtenerDetallesPropiedad', (req, res) => {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ message: "ID de la propiedad es requerido" });
    }

    const query = `
        SELECT 
            p.id_propiedad,
            p.tipo_propiedad, 
            p.precio, 
            p.descripcion, 
            p.metros_cuadrados, 
            p.habitaciones, 
            p.banos,
            p.comparte_comparios,
            p.companeros_cuarto,
            p.reglas,             
            d.calle, 
            d.numero_exterior, 
            d.numero_interior, 
            d.colonia, 
            d.codigo_postal, 
            d.delegacion,
            f.url AS url_imagen
        FROM Propiedades p
        JOIN Direcciones d ON p.id_propiedad = d.id_propiedad
        LEFT JOIN Fotos f ON p.id_propiedad = f.id_propiedad
        WHERE p.id_propiedad = ?
    `;

    con.query(query, [id], (err, results) => {
        if (err) {
            console.error("Error al obtener detalles de la propiedad:", err);
            return res.status(500).json({ message: "Error en el servidor" });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: "Propiedad no encontrada" });
        }

        const propiedad = {
            ...results[0],
            fotos: results.map(row => `/uploads/${path.basename(row.url_imagen)}`)
        };
        console.log(propiedad)
        return res.json(propiedad);
    });
});



//Método para obtener propiedades de Mis propiedades
app.get('/obtenerMisPropiedades', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).send("No autenticado");
    }

    const query = `
        SELECT 
            p.id_propiedad, 
            p.id_usuario,
            p.tipo_propiedad, 
            p.precio, 
            p.descripcion, 
            p.metros_cuadrados, 
            p.habitaciones, 
            p.banos,
            p.comparte_comparios,
            p.companeros_cuarto,  
            p.reglas,             
            d.calle, 
            d.numero_exterior, 
            d.numero_interior, 
            d.colonia, 
            d.codigo_postal, 
            d.delegacion,
            f.url AS url_imagen
        FROM Propiedades p
        JOIN Direcciones d ON p.id_propiedad = d.id_propiedad
        LEFT JOIN Fotos f ON p.id_propiedad = f.id_propiedad
        WHERE p.id_usuario = ?
    `;

    con.query(query, [req.session.userId], (err, propiedades) => {
        if (err) {
            console.log("Error al obtener propiedades", err);
            return res.status(500).send("Error al obtener propiedades");
        }

        propiedades = propiedades.map(propiedad => {
            const imagenUrl = propiedad.url_imagen 
                ? `/uploads/${path.basename(propiedad.url_imagen)}`
                : '/uploads/default.jpg';

            return {
                ...propiedad,
                url_imagen: imagenUrl
            };
        });

        return res.json(propiedades);
    });
});





app.put('/actualizarPropiedad/:id', upload.array('imagenes[]'), (req, res) => {
    const id_propiedad = req.params.id;
    const {
        tipo_propiedad,
        precio,
        descripcion,
        metros_cuadrados,
        habitaciones,
        banos,
        comparte_comparios,
        companeros_cuarto,  
        reglas,               
        calle,
        numero_exterior,
        numero_interior,
        colonia,
        codigo_postal,
        delegacion
    } = req.body;

    // Actualizar la propiedad
    con.query('UPDATE Propiedades SET  tipo_propiedad = ?, precio = ?, descripcion = ?, metros_cuadrados = ?, habitaciones = ?, banos = ?, comparte_comparios = ?, companeros_cuarto = ?, reglas = ? WHERE id_propiedad = ?', 
    [tipo_propiedad, precio, descripcion, metros_cuadrados, habitaciones, banos, comparte_comparios ? 1 : 0, companeros_cuarto, reglas, id_propiedad], (err) => {
        if (err) {
            console.log("Error al actualizar propiedad", err);
            return res.status(500).send("Error al actualizar propiedad");
        }

        // Actualizar la dirección
        con.query('UPDATE Direcciones SET calle = ?, numero_exterior = ?, numero_interior = ?, colonia = ?, codigo_postal = ?, delegacion = ? WHERE id_propiedad = ?', 
        [calle, numero_exterior, numero_interior, colonia, codigo_postal, delegacion, id_propiedad], (err) => {
            if (err) {
                console.log("Error al actualizar dirección", err);
                return res.status(500).send("Error al actualizar dirección");
            }

            // Eliminar las imágenes antiguas (si se requieren cambios)
            con.query('SELECT url FROM Fotos WHERE id_propiedad = ?', [id_propiedad], (err, results) => {
                if (err) {
                    console.log("Error al obtener imágenes anteriores", err);
                    return res.status(500).send("Error al obtener imágenes anteriores");
                }

                // Eliminar imágenes de la base de datos
                if (results.length > 0) {
                    con.query('DELETE FROM Fotos WHERE id_propiedad = ?', [id_propiedad], (err) => {
                        if (err) {
                            console.log("Error al eliminar imágenes de la base de datos", err);
                        }
                    });
                }

                // Guardar las nuevas imágenes en la base de datos
                if (req.files.length > 0) {
                    req.files.forEach(file => {
                        con.query('INSERT INTO Fotos (id_propiedad, url) VALUES (?, ?)', [id_propiedad, file.path], (err) => {
                            if (err) {
                                console.log("Error al insertar foto", err);
                                return res.status(500).send("Error al insertar fotos");
                            }
                        });
                    });
                }

                return res.send("Propiedad y dirección actualizadas correctamente");
            });
        });
    });
});




app.delete('/eliminarPropiedad/:id', (req, res) => {
    const id_propiedad = req.params.id;

    // Eliminar las fotos asociadas
    con.query('DELETE FROM Fotos WHERE id_propiedad = ?', [id_propiedad], (err) => {
        if (err) {
            console.log("Error al eliminar fotos", err);
            return res.status(500).send("Error al eliminar fotos");
        }

        // Eliminar la dirección
        con.query('DELETE FROM Direcciones WHERE id_propiedad = ?', [id_propiedad], (err) => {
            if (err) {
                console.log("Error al eliminar dirección", err);
                return res.status(500).send("Error al eliminar dirección");
            }

            // Eliminar la propiedad
            con.query('DELETE FROM Propiedades WHERE id_propiedad = ?', [id_propiedad], (err) => {
                if (err) {
                    console.log("Error al eliminar propiedad", err);
                    return res.status(500).send("Error al eliminar propiedad");
                }

                return res.send("Propiedad eliminada correctamente");
            });
        });
    });
});

// CRUD Reseñas y Valoraciones
app.post('/agregarResena', (req, res) => {
    const { id_usuario, id_propiedad, comentario, calificacion } = req.body;
    con.query('INSERT INTO Reseñas (id_usuario, id_propiedad, comentario, calificacion) VALUES (?, ?, ?, ?)', [id_usuario, id_propiedad, comentario, calificacion], (err) => {
        if (err) {
            console.log("Error al insertar reseña", err);
            return res.status(500).send("Error al insertar reseña");
        }
        return res.send("Reseña agregada correctamente");
    });
});

app.get('/obtenerResenas', (req, res) => {
    con.query('SELECT * FROM Reseñas', (err, resenas) => {
        if (err) {
            console.log("Error al obtener reseñas", err);
            return res.status(500).send("Error al obtener reseñas");
        }
        return res.json(resenas);
    });
});

app.post('/borrarResena', (req, res) => {
    const { id_resena } = req.body;
    con.query('DELETE FROM Reseñas WHERE id_resena = ?', [id_resena], (err, resultado) => {
        if (err) {
            console.error('Error al borrar la reseña:', err);
            return res.status(500).send("Error al borrar la reseña");
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).send("Reseña no encontrada");
        }
        return res.send(`Reseña con ID ${id_resena} borrada correctamente`);
    });
});

app.post('/actualizarResena', (req, res) => {
    const { id_resena, nuevo_comentario, nueva_calificacion } = req.body;
    con.query('UPDATE Reseñas SET comentario = ?, calificacion = ? WHERE id_resena = ?', [nuevo_comentario, nueva_calificacion, id_resena], (err, resultado) => {
        if (err) {
            console.error('Error al actualizar la reseña:', err);
            return res.status(500).send("Error al actualizar la reseña");
        }
        if (resultado.affectedRows === 0) {
            return res.status(404).send("Reseña no encontrada");
        }
        return res.send(`Reseña con ID ${id_resena} actualizada correctamente`);
    });
});

// Agregar favorito
app.post('/favoritos/agregar', (req, res) => {
    const { id_propiedad } = req.body;
    const { userId } = req.session;  // Obtener el userId desde la sesión

    if (!userId || !id_propiedad) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    const query = 'INSERT INTO Favoritos (id_usuario, id_propiedad) VALUES (?, ?)';
    con.query(query, [userId, id_propiedad], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al agregar favorito' });
        }
        return res.status(201).json({ message: 'Favorito agregado correctamente' });
    });
});

// Quitar favorito
app.delete('/favoritos/quitar', (req, res) => {
    const { id_propiedad } = req.query;
    const { userId } = req.session;

    if (!userId || !id_propiedad) {
        return res.status(400).json({ error: 'Faltan datos' });
    }

    const query = 'DELETE FROM Favoritos WHERE id_usuario = ? AND id_propiedad = ?';
    con.query(query, [userId, id_propiedad], (err, result) => {
        if (err) {
            return res.status(500).json({ error: 'Error al quitar favorito' });
        }
        return res.status(200).json({ message: 'Favorito eliminado correctamente' });
    });
});

// Obtener propiedades favoritas de un usuario
app.get('/favoritos/propiedades', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ error: "Falta el parámetro userId" });
    }

    const query = `
        SELECT 
            p.id_propiedad, 
            p.id_usuario,
            p.tipo_propiedad, 
            p.precio, 
            p.descripcion, 
            p.metros_cuadrados, 
            p.habitaciones, 
            p.banos,
            p.comparte_comparios,
            p.companeros_cuarto,  
            p.reglas,              
            MIN(d.calle) AS calle, 
            MIN(d.numero_exterior) AS numero_exterior, 
            MIN(d.numero_interior) AS numero_interior, 
            MIN(d.colonia) AS colonia, 
            MIN(d.codigo_postal) AS codigo_postal, 
            MIN(d.delegacion) AS delegacion,
            MIN(f.url) AS url_imagen
        FROM Favoritos fa
        JOIN Propiedades p ON fa.id_propiedad = p.id_propiedad
        LEFT JOIN Direcciones d ON p.id_propiedad = d.id_propiedad
        LEFT JOIN Fotos f ON p.id_propiedad = f.id_propiedad
        WHERE fa.id_usuario = ?
        GROUP BY p.id_propiedad
    `;

    con.query(query, [userId], (err, favoritos) => {
        if (err) {
            console.error("Error al obtener propiedades favoritas:", err);
            return res.status(500).json({ error: "Error al obtener propiedades favoritas" });
        }

        favoritos = favoritos.map(propiedad => {
            const imagenUrl = propiedad.url_imagen 
                ? `/uploads/${path.basename(propiedad.url_imagen)}`
                : '/uploads/default.jpg';

            return {
                ...propiedad,
                url_imagen: imagenUrl
            };
        });

        return res.json(favoritos);
    });
});




  app.get('/favoritos', (req, res) => {
    const { userId, propiedadId } = req.query;
  
    if (!userId || !propiedadId) {
        return res.status(400).json({ error: 'Faltan parámetros: userId o propiedadId' });
    }

    // Aquí realizas la consulta a la base de datos para verificar si esa propiedad está en favoritos
    const query = 'SELECT * FROM Favoritos WHERE id_usuario = ? AND id_propiedad = ?';
    con.query(query, [userId, propiedadId], (err, result) => {
        if (err) {
            console.error('Error al comprobar favorito:', err);
            return res.status(500).json({ error: 'Error al comprobar favorito' });
        }

        // Si existe un resultado, significa que está en favoritos
        if (result.length > 0) {
            return res.json({ isFavorito: true });
        } else {
            return res.json({ isFavorito: false });
        }
    });
});

app.get('/api/propiedad/:id', (req, res) => {
    const id = req.params.id;
    con.query('SELECT id_usuario FROM Propiedades WHERE id_propiedad = ?', [id], (err, result) => {
        if (err || result.length === 0) return res.status(404).send('Propiedad no encontrada');
        res.json({ id_usuario: result[0].id_usuario });
    });
});


//CHAT

// Ruta para iniciar o cargar una conversación
app.post('/conversacion', (req, res) => {
    const { id_arrendador, id_estudiante, id_propiedad } = req.body;

    // Verificar si ya existe la conversación
    const query = `
        SELECT * FROM Conversaciones
        WHERE id_arrendador = ? AND id_estudiante = ? AND id_propiedad = ?
    `;

    con.query(query, [id_arrendador, id_estudiante, id_propiedad], (err, results) => {
        if (err) {
            return res.status(500).send('Error en la base de datos');
        }
        if (results.length > 0) {
            // Si la conversación ya existe, devolver la información
            return res.json(results[0]);
        } else {
            // Si no existe, crear la conversación
            const insertQuery = `
                INSERT INTO Conversaciones (id_arrendador, id_estudiante, id_propiedad)
                VALUES (?, ?, ?)
            `;
            con.query(insertQuery, [id_arrendador, id_estudiante, id_propiedad], (err, result) => {
                if (err) {
                    return res.status(500).send('Error al crear la conversación');
                }
                res.json({ id_conversacion: result.insertId });
            });
        }
    });
});

// Obtener mensajes de una conversación
app.get('/mensajes/:id_conversacion', (req, res) => {
    const id_conversacion = req.params.id_conversacion;
    const query = `
        SELECT id_usuario, mensaje, fecha_envio 
        FROM Mensajes 
        WHERE id_conversacion = ? 
        ORDER BY fecha_envio ASC
    `;

    con.query(query, [id_conversacion], (err, results) => {
        if (err) return res.status(500).send('Error al obtener mensajes');
        res.json(results);
    });
});


// Enviar mensaje
app.post('/mensaje', (req, res) => {
    const { id_conversacion, id_usuario, mensaje } = req.body;
    const query = `
        INSERT INTO Mensajes (id_conversacion, id_usuario, mensaje)
        VALUES (?, ?, ?)
    `;
    con.query(query, [id_conversacion, id_usuario, mensaje], (err, result) => {
        if (err) {
            return res.status(500).send('Error al enviar mensaje');
        }
        // Emitir mensaje a través de Socket.io a los usuarios
        io.to(`chat-${id_conversacion}`).emit('nuevoMensaje', {
            id_conversacion,
            id_usuario,
            mensaje
        });
        res.status(201).json({ success: true });
    });
});

// Conectar socket.io
io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');

    // Unirse a la sala de la conversación
    socket.on('unirseSala', (salaId) => {
    socket.join(salaId); // ya viene con el prefijo 'chat-'
    console.log('Usuario se unió a la sala: ' + salaId);
    });


    // Recibir y enviar mensaje a los clientes
    socket.on('enviarMensaje', (data) => {
        const { id_conversacion, id_usuario, mensaje } = data;
        io.to(`chat-${id_conversacion}`).emit('nuevoMensaje', { id_conversacion, id_usuario, mensaje });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

app.get('/conversaciones-arrendador/:id_arrendador', (req, res) => {
    const id = req.params.id_arrendador;
    const query = `
        SELECT c.id_conversacion, c.id_estudiante, c.id_propiedad, u.nombre AS estudiante_nombre, p.descripcion AS propiedad
        FROM Conversaciones c
        JOIN Usuarios u ON c.id_estudiante = u.id_usuario
        JOIN Propiedades p ON c.id_propiedad = p.id_propiedad
        WHERE c.id_arrendador = ?
    `;
    con.query(query, [id], (err, results) => {
        if (err) return res.status(500).send('Error al obtener conversaciones');
        res.json(results);
    });
});
//FILTRO
app.get('/filtrarPropiedades', (req, res) => {
    const {
        precioMin,
        precioMax,
        colonia,
        tipo,
        comparte
    } = req.query;

    let sql = `
        SELECT 
            p.id_propiedad, p.id_usuario, p.tipo_propiedad, p.precio, 
            p.descripcion, p.metros_cuadrados, p.habitaciones, p.banos,
            p.comparte_comparios, p.reglas,
            MIN(d.colonia) AS colonia,
            MIN(f.url) AS url_imagen
        FROM Propiedades p
        LEFT JOIN Direcciones d ON p.id_propiedad = d.id_propiedad
        LEFT JOIN Fotos f ON p.id_propiedad = f.id_propiedad
        WHERE 1=1
    `;
    
    const params = [];

    if (precioMin) {
        sql += ` AND p.precio >= ?`;
        params.push(precioMin);
    }

    if (precioMax) {
        sql += ` AND p.precio <= ?`;
        params.push(precioMax);
    }

    if (colonia) {
        sql += ` AND d.colonia LIKE ?`;
        params.push(`%${colonia}%`);
    }

    if (tipo) {
        sql += ` AND p.tipo_propiedad = ?`;
        params.push(tipo);
    }

    if (comparte !== undefined && comparte !== "") {
        sql += ` AND p.comparte_comparios = ?`;
        params.push(comparte);
    }

    sql += ` GROUP BY p.id_propiedad`;

    con.query(sql, params, (err, results) => {
        if (err) {
            console.error("Error al filtrar propiedades:", err);
            return res.status(500).json({ error: "Error al filtrar propiedades" });
        }

        const propiedades = results.map(prop => {
            return {
                ...prop,
                url_imagen: prop.url_imagen 
                    ? `/uploads/${path.basename(prop.url_imagen)}`
                    : '/uploads/default.jpg'
            };
        });

        res.json(propiedades);
    });
});

// PAYPAL

async function getAccessToken() {
    const response = await axios({
        url: 'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        method: 'post',
        auth: {
            username: process.env.PAYPAL_CLIENT_ID,
            password: process.env.PAYPAL_CLIENT_SECRET
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'grant_type=client_credentials'
    });
    return response.data.access_token;
}


// Crear orden de PayPal
app.post('/api/paypal/create-order', async (req, res) => {
    const userId = req.session.userId;
    const { id_propiedad } = req.body;

    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    try {
        // Verificar si el usuario ya pagó esta propiedad recientemente
        const [[{ yaPago }]] = await con.promise().query(`
            SELECT COUNT(*) AS yaPago
            FROM Pagos
            WHERE id_estudiante = ? AND id_propiedad = ?
              AND estado_pago = 'pagado'
              AND fecha_pago >= (NOW() - INTERVAL 30 SECOND)
        `, [userId, id_propiedad]);

        if (yaPago > 0) {
            return res.status(403).json({
                error: 'Ya realizaste el pago de esta propiedad recientemente. Espera un momento antes de volver a pagar.'
            });
        }

        // Verifica si ya se alcanzó el número de pagos permitidos
        const [[{ companeros_cuarto }]] = await con.promise().query(`
            SELECT companeros_cuarto
            FROM Propiedades
            WHERE id_propiedad = ?
        `, [id_propiedad]);

        const maxPagos = companeros_cuarto || 1;

        const [[{ total }]] = await con.promise().query(`
            SELECT COUNT(*) AS total
            FROM Pagos
            WHERE id_propiedad = ? AND estado_pago = 'pagado'
              AND fecha_pago >= (NOW() - INTERVAL 30 SECOND)
        `, [id_propiedad]);

        if (total >= maxPagos) {
            return res.status(403).json({ error: 'Ya se realizaron todos los pagos requeridos para esta propiedad' });
        }

        // Obtener monto desde BD
        const [rows] = await con.promise().query('SELECT precio FROM Propiedades WHERE id_propiedad = ?', [id_propiedad]);
        if (rows.length === 0) return res.status(404).json({ error: 'Propiedad no encontrada' });

        const monto = Number(rows[0].precio); // Asegurar que sea número
        const montoFinal = monto.toFixed(2);   // '3000.00'
        const accessToken = await getAccessToken();

        const order = await axios.post(
            'https://api-m.sandbox.paypal.com/v2/checkout/orders',
            {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        amount: {
                            currency_code: 'MXN',
                            value: montoFinal
                        }
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const orderId = order.data.id;

        // Registrar pago como pendiente
        await con.promise().query(
            'INSERT INTO Pagos (id_estudiante, id_propiedad, monto, estado_pago, paypal_order_id) VALUES (?, ?, ?, ?, ?)',
            [userId, id_propiedad, monto, 'pendiente', orderId]
        );

        res.json({ orderID: orderId });

    } catch (err) {
        console.error('Error al crear orden:', err);
        res.status(500).json({ error: 'Error interno al crear la orden' });
    }
});


// Capturar pago
app.post('/api/paypal/capture-order', async (req, res) => {
    const { orderID } = req.body;
    try {
        const accessToken = await getAccessToken();

        await axios.post(
            `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
            {},
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        await con.promise().query('UPDATE Pagos SET estado_pago = ? WHERE paypal_order_id = ?', ['pagado', orderID]);

        res.json({ status: 'success' });
    } catch (err) {
        console.error('Error al capturar orden:', err);
        res.status(500).json({ error: 'Error interno al capturar el pago' });
    }
});


app.get('/api/estudiante/pagos', async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: 'No autenticado' });

    try {
        const [pagos] = await con.promise().query(`
            SELECT p.*, pr.tipo_propiedad, pr.descripcion, pr.precio
            FROM Pagos p
            JOIN Propiedades pr ON p.id_propiedad = pr.id_propiedad
            WHERE p.id_estudiante = ?
            ORDER BY p.fecha_pago DESC
        `, [req.session.userId]);

        res.json(pagos);
    } catch (error) {
        console.error("Error obteniendo historial de pagos:", error);
        res.status(500).json({ message: 'Error al obtener historial' });
    }
});

app.get('/api/puede-pagar/:id_propiedad', async (req, res) => {
    const id_propiedad = req.params.id_propiedad;

    try {
        // 1. Obtener el número de compañeros permitidos
        const [prop] = await con.promise().query(`
            SELECT companeros_cuarto
            FROM Propiedades
            WHERE id_propiedad = ?
        `, [id_propiedad]);

        if (prop.length === 0) return res.status(404).json({ puedePagar: false });

        const maxPagos = prop[0].companeros_cuarto || 1;

        // 2. Contar pagos exitosos recientes (últimos 30 segundos para demostración)
        const [pagos] = await con.promise().query(`
            SELECT COUNT(*) AS total
            FROM Pagos
            WHERE id_propiedad = ? AND estado_pago = 'pagado'
              AND fecha_pago >= (NOW() - INTERVAL 150 SECOND)
        `, [id_propiedad]);

        const totalPagos = pagos[0].total;

        res.json({ puedePagar: totalPagos < maxPagos });
    } catch (err) {
        console.error("Error en puede-pagar:", err);
        res.status(500).json({ puedePagar: false });
    }
});


// Servir archivos estáticos de la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Ruta para la página de inicio de sesión (cuando accedas a la raíz, muestra el inicio de sesión)
app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Inicio/inicio.html'));  // Muestra inicio.html cuando accedes a '/'
});

// Otras rutas de tu aplicación
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Inicio/index.html'));
});

app.get('/nosotros', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Inicio/nosotros.html'));
});

app.get('/comprar', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Estudiante/comprar.html'));
});

app.get('/vender', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Arrendador/vender.html'));
});


// Puerto para escuchar
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:3000`);
});

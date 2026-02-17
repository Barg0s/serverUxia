const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./models');
const apiRoutes = require('./routes/api');
const bcrypt = require('bcrypt');
const SALT_ROUNDS = 12;

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de CORS para permitir peticiones desde otros dominios (ej. Flutter o Android)
app.use(cors());

// Aumentamos el límite de tamaño para poder recibir imágenes en Base64 grandes (50mb)
app.use(bodyParser.json({ limit: '50mb' }));

// Usamos las rutas definidas en api.js bajo el prefijo '/api'
app.use('/api', apiRoutes);

// Sincronización con la Base de Datos y arranque del servidor
// force: false evita que se borren los datos cada vez que iniciamos
db.sequelize.sync({ force: false })
    .then(async () => {
        console.log('Base de Datos sincronizada');
        const hashedPassword = await bcrypt.hash('password', SALT_ROUNDS);
        // Crear un usuario Administrador por defecto si no existe
        const adminExists = await db.User.findOne({ where: { email: 'admin@example.com' } });
        if (!adminExists) {
            await db.User.create({
                username: 'admin',
                nickname: 'AdminUser',
                email: 'admin@example.com',
                password: hashedPassword, // En producción, usar hash (bcrypt)
                role: 'admin',
                api_key: 'ADMIN_SUPER_SECRET_KEY' // Clave inicial para pruebas
            });
            console.log('Usuario Admin creado (admin@example.com / password)');
        }

        // Iniciar escuchar peticiones en el puerto 3000
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en el puerto ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('Error al sincronizar la BD: ' + err.message);
    });
